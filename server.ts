import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const ADMIN_AUTH_TOKEN = process.env.ADMIN_API_TOKEN || crypto.randomBytes(32).toString('hex');

let adminProvidedApiKeys: Record<string, string> = {};
let _aiClients: Record<string, GoogleGenAI> = {};

interface CustomAiModel {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
}

let customAiModels: CustomAiModel[] = [];

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const bodyToken = req.body?._adminToken;
  if (token === ADMIN_AUTH_TOKEN || bodyToken === ADMIN_AUTH_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Valid admin token required.' });
  }
}

function getAiClient(feature: string = 'chat'): GoogleGenAI {
  const keyToUse = adminProvidedApiKeys[feature] || process.env.GEMINI_API_KEY;
  if (!keyToUse) {
    throw new Error(`AI API Key not configured for feature: ${feature}. Please configure it in the Admin Dashboard.`);
  }
  if (!_aiClients[feature]) {
    _aiClients[feature] = new GoogleGenAI({
      apiKey: keyToUse,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return _aiClients[feature];
}

const chatSessions: Record<string, any> = {};

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(express.json({ limit: '10mb' }));

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://huggingface.co https://*.huggingface.co;");
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Supabase runtime config endpoint (no auth needed)
  app.get("/api/config", (req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    });
  });

  // Admin auth status endpoint
  app.get("/api/admin/token", (req, res) => {
    res.json({ configured: !!process.env.ADMIN_API_TOKEN });
  });

  // Protected: AI status (requires admin token)
  app.get("/api/ai/status", requireAdmin, (req, res) => {
    res.json({
      configured: {
        chat: !!(adminProvidedApiKeys['chat'] || process.env.GEMINI_API_KEY),
        tools: !!(adminProvidedApiKeys['tools'] || process.env.GEMINI_API_KEY)
      },
      customModels: customAiModels.map(m => ({ id: m.id, name: m.name, isActive: m.isActive }))
    });
  });

  // Protected: AI configure (requires admin token)
  app.post("/api/ai/configure", requireAdmin, (req, res) => {
    const { apiKey, feature } = req.body;
    const targetFeature = feature || 'chat';
    
    if (apiKey) {
      adminProvidedApiKeys[targetFeature] = apiKey;
      delete _aiClients[targetFeature];
    } else {
      delete adminProvidedApiKeys[targetFeature];
      delete _aiClients[targetFeature];
    }
    
    res.json({ 
      success: true, 
      apiConfigured: {
        chat: !!(adminProvidedApiKeys['chat'] || process.env.GEMINI_API_KEY),
        tools: !!(adminProvidedApiKeys['tools'] || process.env.GEMINI_API_KEY)
      },
      customModels: customAiModels.map(m => ({ id: m.id, name: m.name, isActive: m.isActive }))
    });
  });

  // Protected: Custom models (requires admin token)
  app.post("/api/ai/custom-models", requireAdmin, (req, res) => {
    const { action, id, name, apiKey, isActive } = req.body;
    
    if (action === 'add') {
      const newId = `model_${Date.now()}`;
      customAiModels.push({ id: newId, name, apiKey, isActive: true });
    } else if (action === 'edit') {
      const model = customAiModels.find(m => m.id === id);
      if (model) {
        if (name !== undefined) model.name = name;
        if (apiKey !== undefined && apiKey !== '') model.apiKey = apiKey;
      }
    } else if (action === 'delete') {
      customAiModels = customAiModels.filter(m => m.id !== id);
    } else if (action === 'toggleActive') {
      const model = customAiModels.find(m => m.id === id);
      if (model) {
        model.isActive = isActive;
      }
    }

    res.json({ 
      success: true, 
      customModels: customAiModels.map(m => ({ id: m.id, name: m.name, isActive: m.isActive }))
    });
  });

  // Main chatbot endpoint (no auth needed for public chat)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, sessionId = "default" } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required.' });
      }
      if (message.length > 4000) {
        return res.status(400).json({ error: 'Message too long (max 4000 chars).' });
      }
      const ai = getAiClient('chat');
      
      if (!chatSessions[sessionId]) {
        chatSessions[sessionId] = ai.chats.create({
          model: "gemini-2.0-flash",
          config: {
            systemInstruction: "You are the official SPT (Sadeep Pasindu Tools) Customer Support Assistant. You provide helpful, concise, and friendly support regarding SPT tools, services, subscriptions, and platform inquiries in Sinhala and English. Please answer politely and concisely. Sadeep Pasindu is the founder of SPT.",
          },
        });
      }
      
      const chat = chatSessions[sessionId];
      const response = await chat.sendMessage({ message });
      
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("AI Error:", err);
      res.status(500).json({ error: err.message || 'Error communicating with AI service.' });
    }
  });

  // OTP in-memory store with automatic cleanup
  const otpStore = new Map<string, { otp: string; userId: string; expires: number }>();
  
  // Clean expired OTPs every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of otpStore) {
      if (now > val.expires) otpStore.delete(key);
    }
  }, 300000);

  function getTransporter() {
    const email = process.env.GMAIL_EMAIL || 'sadeeppasindu0218@gmail.com';
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!pass) return null;
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: email, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }

  // Send OTP via email (Gmail SMTP), fallback to Supabase built-in email
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email, userId } = req.body;
      if (!email || !userId) return res.status(400).json({ error: 'Email and userId required' });
      if (typeof email !== 'string' || email.length > 320) return res.status(400).json({ error: 'Invalid email' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(email, { otp, userId, expires: Date.now() + 600000 });

      const transporter = getTransporter();

      if (transporter) {
        // Gmail SMTP configured — send custom OTP email
        await transporter.sendMail({
          from: `"SPT OFFICIAL" <sadeeppasindu0218@gmail.com>`,
          to: email,
          subject: 'SPT OFFICIAL - Your Verification Code',
          html: `
            <div style="background:#0a0a16;padding:40px;font-family:sans-serif;">
              <div style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:32px;border:1px solid #333;">
                <h1 style="color:#00f0ff;font-size:24px;text-align:center;">SPT OFFICIAL</h1>
                <p style="color:#888;text-align:center;font-size:12px;">Sadeep Pasindu Creative Universe</p>
                <hr style="border-color:#333;margin:20px 0;">
                <h2 style="color:#fff;font-size:18px;">Your Verification Code</h2>
                <p style="color:#aaa;font-size:14px;line-height:1.6;">Use the code below to verify your account:</p>
                <div style="text-align:center;margin:30px 0;padding:20px;background:#0a0a16;border-radius:12px;letter-spacing:8px;">
                  <span style="font-size:36px;font-weight:bold;color:#00f0ff;font-family:monospace;">${otp}</span>
                </div>
                <p style="color:#666;font-size:12px;">This code expires in <strong style="color:#fcd34d;">10 minutes</strong>.</p>
                <hr style="border-color:#222;margin:20px 0;">
                <p style="color:#555;font-size:10px;text-align:center;">&copy; 2026 SPT OFFICIAL. All rights reserved.</p>
              </div>
            </div>`,
        });
        return res.json({ success: true, method: 'smtp' });
      }

      // Fallback: use Supabase built-in email confirmation
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        const { error } = await supabaseClient.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: `${process.env.APP_URL || ''}/auth/callback` },
        });
        if (error) throw error;
        console.log(`OTP for ${email}: ${otp} (Supabase email fallback)`);
        return res.json({ success: true, method: 'supabase', otp }); // otp sent back for dev, remove in prod
      }

      // Last resort: log OTP (only useful in dev)
      console.log(`OTP for ${email}: ${otp} (no email service configured)`);
      return res.json({ success: true, method: 'log', otp });
    } catch (err: any) {
      console.error("Send OTP Error:", err);
      res.status(500).json({ error: err.message || 'Failed to send OTP' });
    }
  });

  // Verify OTP and confirm user
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

      const stored = otpStore.get(email);
      if (!stored) return res.status(400).json({ error: 'No OTP found. Request a new one.' });
      if (Date.now() > stored.expires) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP expired. Request a new one.' });
      }
      if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP code.' });

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: 'Server config error' });

      const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { error } = await supabaseAdmin.auth.admin.updateUserById(stored.userId, { email_confirm: true });
      if (error) throw error;

      otpStore.delete(email);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Verify OTP Error:", err);
      res.status(500).json({ error: err.message || 'Failed to verify OTP' });
    }
  });

  // Forgot password OTP store
  const resetOtpStore = new Map<string, { otp: string; email: string; expires: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of resetOtpStore) {
      if (now > val.expires) resetOtpStore.delete(key);
    }
  }, 300000);

  // Send forgot password email with both reset link (via Supabase) and OTP (via SMTP)
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      resetOtpStore.set(email, { otp, email, expires: Date.now() + 600000 });

      // Send reset link via Supabase
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      let linkSent = false;
      if (supabaseUrl && supabaseAnonKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.APP_URL || ''}/reset-password`,
        });
        if (!error) linkSent = true;
      }

      // Send OTP via SMTP if configured
      const transporter = getTransporter();
      let otpSent = false;
      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"SPT OFFICIAL" <sadeeppasindu0218@gmail.com>`,
            to: email,
            subject: 'SPT OFFICIAL - Password Reset Code',
            html: `
              <div style="background:#0a0a16;padding:40px;font-family:sans-serif;">
                <div style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:32px;border:1px solid #333;">
                  <h1 style="color:#00f0ff;font-size:24px;text-align:center;">SPT OFFICIAL</h1>
                  <p style="color:#888;text-align:center;font-size:12px;">Password Reset Request</p>
                  <hr style="border-color:#333;margin:20px 0;">
                  <p style="color:#aaa;font-size:14px;line-height:1.6;">We received a request to reset your SPT OFFICIAL account password.</p>
                  <p style="color:#aaa;font-size:14px;line-height:1.6;">Use the code below to reset your password, or click the link in the email we sent separately.</p>
                  <div style="text-align:center;margin:30px 0;padding:20px;background:#0a0a16;border-radius:12px;letter-spacing:8px;">
                    <span style="font-size:36px;font-weight:bold;color:#00f0ff;font-family:monospace;">${otp}</span>
                  </div>
                  <p style="color:#666;font-size:12px;">This code expires in <strong style="color:#fcd34d;">10 minutes</strong>.</p>
                  <hr style="border-color:#222;margin:20px 0;">
                  <p style="color:#555;font-size:10px;text-align:center;">&copy; 2026 SPT OFFICIAL. All rights reserved.</p>
                </div>
              </div>`,
          });
          otpSent = true;
        } catch (e) {
          console.error("Failed to send OTP email for forgot password:", e);
        }
      }

      if (!linkSent && !otpSent) {
        console.log(`Reset OTP for ${email}: ${otp} (no email service)`);
      }

      res.json({ success: true, linkSent, otpSent, otp: !otpSent && !linkSent ? otp : undefined });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: err.message || 'Failed to process request' });
    }
  });

  // Verify reset OTP
  app.post("/api/verify-reset-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

      const stored = resetOtpStore.get(email);
      if (!stored) return res.status(400).json({ error: 'No OTP found. Request a new one.' });
      if (Date.now() > stored.expires) {
        resetOtpStore.delete(email);
        return res.status(400).json({ error: 'OTP expired. Request a new one.' });
      }
      if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP code.' });

      resetOtpStore.delete(email);
      res.json({ success: true, email });
    } catch (err: any) {
      console.error("Verify reset OTP error:", err);
      res.status(500).json({ error: err.message || 'Failed to verify OTP' });
    }
  });

  // Reset password with OTP (uses admin API)
  app.post("/api/reset-password-with-otp", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password required' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      if (newPassword.length > 16) return res.status(400).json({ error: 'Password must be at most 16 characters' });

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: 'Server config error' });

      const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Find user by email using admin API
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const user = users.users.find((u: any) => u.email === email);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
      if (error) throw error;

      res.json({ success: true });
    } catch (err: any) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: err.message || 'Failed to reset password' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
