import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from "nodemailer";
import https from "https";
import ws from "ws";

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

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}

function getSupabaseServiceRole() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getAppUrl(req?: express.Request) {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (req) return `${req.protocol}://${req.get('host')}`;
  return 'http://localhost:3000';
}

const otpStore: Map<string, { otp: string; email: string; expiresAt: number }> = new Map();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTransporter() {
  const gmailUser = process.env.GMAIL_EMAIL;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: gmailUser, pass: gmailPass },
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 5000,
    });
  }
  return null;
}

function getTransporterSsl() {
  const gmailUser = process.env.GMAIL_EMAIL;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: gmailUser, pass: gmailPass },
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 5000,
    });
  }
  return null;
}

let _gmailAccessToken: string | null = null;
let _gmailTokenExpiry = 0;

async function getGmailAccessToken(): Promise<string> {
  if (_gmailAccessToken && Date.now() < _gmailTokenExpiry) return _gmailAccessToken;

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN required');
  }

  const data = `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&refresh_token=${encodeURIComponent(refreshToken)}&grant_type=refresh_token`;

  const token: { access_token: string; expires_in: number } = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk: string) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(body));
        else reject(new Error(`Token error ${res.statusCode}: ${body}`));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  _gmailAccessToken = token.access_token;
  _gmailTokenExpiry = Date.now() + (token.expires_in - 60) * 1000;
  return _gmailAccessToken;
}

async function sendViaGmailApi(to: string, subject: string, html: string): Promise<void> {
  const fromEmail = process.env.GMAIL_EMAIL;
  if (!fromEmail) throw new Error('GMAIL_EMAIL not configured');

  const accessToken = await getGmailAccessToken();

  // Build RFC 2822 message
  const boundary = `boundary_${Date.now()}`;
  const message = [
    `From: "SPT OFFICIAL" <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    'Please view this email in an HTML-compatible email client.',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const raw = Buffer.from(message).toString('base64url');

  const payload = JSON.stringify({ raw });

  await new Promise<void>((resolve, reject) => {
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      port: 443,
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk: string) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`Gmail API error ${res.statusCode}: ${body}`));
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function sendEmailViaHttps(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY not configured');
  const fromEmail = process.env.GMAIL_EMAIL || 'noreply@spt-official.com';
  const data = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromEmail, name: 'SPT OFFICIAL' },
    subject,
    content: [{ type: 'text/html', value: html }],
  });
  await new Promise<void>((resolve, reject) => {
    const req = https.request({
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 202) resolve();
        else reject(new Error(`SendGrid error ${res.statusCode}: ${body}`));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function buildConfirmEmailHtml(actionLink: string, otp: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px">
    <h2 style="color:#06b6d4;margin:0 0 16px">SPT OFFICIAL</h2>
    <p>Thank you for registering! Confirm your email using one of these methods:</p>
    <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px"><strong>Method 1:</strong> Click the button below:</p>
      <a href="${actionLink}" style="display:inline-block;padding:12px 24px;background:#06b6d4;color:#0f172a;text-decoration:none;font-weight:bold;border-radius:8px;margin:8px 0">Confirm Email</a>
    </div>
    <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px"><strong>Method 2:</strong> Enter this OTP code in the app:</p>
      <p style="font-size:32px;letter-spacing:8px;text-align:center;color:#06b6d4;font-weight:bold;margin:8px 0">${otp}</p>
    </div>
    <p style="color:#94a3b8;font-size:12px">Code expires in 10 minutes.</p>
  </div>`;
}

function buildResetEmailHtml(actionLink: string, otp: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px">
    <h2 style="color:#06b6d4;margin:0 0 16px">SPT OFFICIAL</h2>
    <p>Reset your password using one of these methods:</p>
    <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px"><strong>Method 1:</strong> Click the button below:</p>
      <a href="${actionLink}" style="display:inline-block;padding:12px 24px;background:#06b6d4;color:#0f172a;text-decoration:none;font-weight:bold;border-radius:8px;margin:8px 0">Reset Password</a>
    </div>
    <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px"><strong>Method 2:</strong> Enter this OTP code in the app:</p>
      <p style="font-size:32px;letter-spacing:8px;text-align:center;color:#06b6d4;font-weight:bold;margin:8px 0">${otp}</p>
    </div>
    <p style="color:#94a3b8;font-size:12px">Code expires in 10 minutes.</p>
  </div>`;
}

async function trySendEmail(to: string, subject: string, html: string): Promise<void> {
  // Try Gmail REST API via HTTPS (port 443) FIRST — most likely to work on HF Spaces
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    try {
      await sendViaGmailApi(to, subject, html);
      return;
    } catch (gmailErr) {
      console.warn("Gmail API failed:", (gmailErr as Error).message);
    }
  }
  // Try SMTP port 587
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SPT OFFICIAL" <${process.env.GMAIL_EMAIL}>`,
        to, subject, html,
      });
      return;
    } catch (smtpErr) {
      console.warn("SMTP 587 failed, trying 465:", (smtpErr as Error).message);
    }
  }
  // Try SMTP port 465 SSL
  const sslTransporter = getTransporterSsl();
  if (sslTransporter) {
    try {
      await sslTransporter.sendMail({
        from: `"SPT OFFICIAL" <${process.env.GMAIL_EMAIL}>`,
        to, subject, html,
      });
      return;
    } catch (sslErr) {
      console.warn("SMTP 465 failed:", (sslErr as Error).message);
    }
  }
  // Try SendGrid HTTPS API (port 443)
  if (process.env.SENDGRID_API_KEY) {
    await sendEmailViaHttps(to, subject, html);
    return;
  }
  throw new Error(
    'Cannot send email. Set GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN ' +
    '(Gmail REST API via port 443) or SENDGRID_API_KEY (SendGrid via port 443).'
  );
}

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
      supabaseUrl: getSupabaseUrl(),
      supabaseAnonKey: getSupabaseAnonKey()
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

  // Send confirmation email via nodemailer (Gmail SMTP) with link + OTP
  app.post("/api/send-confirmation", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });

      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: 'Server config error' });

      const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: ws }
      });

      // Generate confirmation link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        options: { redirectTo: `${getAppUrl(req)}/auth/callback` },
      });
      if (linkError) throw linkError;

      const actionLink = linkData?.properties?.action_link;
      if (!actionLink) throw new Error('Failed to generate confirmation link');

      // Generate and store OTP (expires in 10 min)
      const otp = generateOtp();
      otpStore.set(email.toLowerCase(), { otp, email: email.toLowerCase(), expiresAt: Date.now() + 600000 });

      // Send email (tries SMTP 587 → 465 → SendGrid 443)
      await trySendEmail(
        email,
        'SPT OFFICIAL - Confirm Your Email Address',
        buildConfirmEmailHtml(actionLink, otp)
      );

      res.json({ success: true, sent: true });
    } catch (err: any) {
      console.error("Send confirmation error:", err);
      res.status(500).json({ error: err.message || 'Failed to send confirmation email' });
    }
  });

  // Verify recovery OTP and return reset token
  app.post("/api/verify-recovery-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

      const stored = otpStore.get(`recovery_${email.toLowerCase()}`);
      if (!stored) return res.status(400).json({ error: 'No OTP found. Request a new one.' });
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(`recovery_${email.toLowerCase()}`);
        return res.status(400).json({ error: 'OTP expired. Request a new one.' });
      }
      if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP code.' });

      // Generate a reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      otpStore.set(`reset_${email.toLowerCase()}`, { otp: resetToken, email: email.toLowerCase(), expiresAt: Date.now() + 600000 });
      otpStore.delete(`recovery_${email.toLowerCase()}`);

      res.json({ success: true, resetToken });
    } catch (err: any) {
      console.error("Verify recovery OTP error:", err);
      res.status(500).json({ error: err.message || 'Failed to verify OTP' });
    }
  });

  // Update password with recovery token (from OTP flow)
  app.post("/api/update-password-with-otp", async (req, res) => {
    try {
      const { email, newPassword, resetToken } = req.body;
      if (!email || !newPassword || !resetToken) return res.status(400).json({ error: 'Email, password, and token required' });
      if (newPassword.length < 6 || newPassword.length > 16) return res.status(400).json({ error: 'Password must be 6-16 characters' });

      const stored = otpStore.get(`reset_${email.toLowerCase()}`);
      if (!stored) return res.status(400).json({ error: 'Invalid or expired reset token' });
      if (stored.otp !== resetToken) return res.status(400).json({ error: 'Invalid reset token' });

      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: 'Server config error' });

      const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: ws }
      });

      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const user = userList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
      if (updateError) throw updateError;

      otpStore.delete(`reset_${email.toLowerCase()}`);
      res.json({ success: true, updated: true });
    } catch (err: any) {
      console.error("Update password error:", err);
      res.status(500).json({ error: err.message || 'Failed to update password' });
    }
  });

  // Verify OTP and confirm user (signup)
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

      const stored = otpStore.get(email.toLowerCase());
      if (!stored) return res.status(400).json({ error: 'No OTP found. Request a new one.' });
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return res.status(400).json({ error: 'OTP expired. Request a new one.' });
      }
      if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP code.' });

      // Confirm user via admin API
      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: 'Server config error' });

      const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: ws }
      });

      // Find user by email
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const user = userList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true });
      if (confirmError) throw confirmError;

      otpStore.delete(email.toLowerCase());
      res.json({ success: true, confirmed: true });
    } catch (err: any) {
      console.error("Verify OTP error:", err);
      res.status(500).json({ error: err.message || 'Failed to verify OTP' });
    }
  });

  // Signup — confirm user via Supabase Admin API (fallback)
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email, userId } = req.body;
      if (!email || !userId) return res.status(400).json({ error: 'Email and userId required' });

      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: 'Server config error' });

      const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: ws }
      });
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
      if (error) throw error;

      res.json({ success: true, method: 'auto' });
    } catch (err: any) {
      console.error("Send OTP Error:", err);
      res.status(500).json({ error: err.message || 'Failed to activate account' });
    }
  });

  // Auth callback handler for Google OAuth (sets session cookie)
  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    if (code && typeof code === 'string') {
      const supabaseUrl = getSupabaseUrl();
      const supabaseAnonKey = getSupabaseAnonKey();
      if (supabaseUrl && supabaseAnonKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, { realtime: { transport: ws } });
        await supabaseClient.auth.exchangeCodeForSession(code);
      }
    }
    const appUrl = getAppUrl(req);
    res.redirect(appUrl);
  });

  // Forgot password — send recovery email via nodemailer (link + OTP)
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });

      const appUrl = getAppUrl(req);
      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: 'Server config error' });

      const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: ws }
      });

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${appUrl}/reset-password` },
      });
      if (linkError) throw new Error('User not found or recovery link generation failed');

      const actionLink = linkData?.properties?.action_link;
      if (!actionLink) throw new Error('Failed to generate recovery link');

      const otp = generateOtp();
      otpStore.set(`recovery_${email.toLowerCase()}`, { otp, email: email.toLowerCase(), expiresAt: Date.now() + 600000 });

      // Send email (tries SMTP 587 → 465 → SendGrid 443)
      await trySendEmail(
        email,
        'SPT OFFICIAL - Password Reset',
        buildResetEmailHtml(actionLink, otp)
      );

      res.json({ success: true, linkSent: true });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: err.message || 'Failed to send reset link' });
    }
  });

  // Test email config (admin-protected)
  app.post("/api/test-email", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Test email address required' });

      const startTime = Date.now();
      const results: string[] = [];

      // Test SMTP 587
      const transporter = getTransporter();
      if (transporter) {
        try {
          await transporter.verify();
          await transporter.sendMail({
            from: `"SPT OFFICIAL" <${process.env.GMAIL_EMAIL}>`,
            to: email,
            subject: 'SPT OFFICIAL - SMTP Test (port 587)',
            html: '<p>SMTP on port 587 works!</p>',
          });
          results.push('✅ SMTP port 587: SUCCESS');
        } catch (e: any) {
          results.push(`❌ SMTP port 587: FAILED - ${e.message}`);
        }
      } else {
        results.push('⚠️ SMTP port 587: SKIPPED (GMAIL_EMAIL/GMAIL_APP_PASSWORD not set)');
      }

      // Test SMTP 465
      const sslTransporter = getTransporterSsl();
      if (sslTransporter) {
        try {
          await sslTransporter.verify();
          await sslTransporter.sendMail({
            from: `"SPT OFFICIAL" <${process.env.GMAIL_EMAIL}>`,
            to: email,
            subject: 'SPT OFFICIAL - SMTP Test (port 465)',
            html: '<p>SMTP on port 465 works!</p>',
          });
          results.push('✅ SMTP port 465: SUCCESS');
        } catch (e: any) {
          results.push(`❌ SMTP port 465: FAILED - ${e.message}`);
        }
      } else {
        results.push('⚠️ SMTP port 465: SKIPPED (GMAIL_EMAIL/GMAIL_APP_PASSWORD not set)');
      }

      // Test Gmail REST API
      if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
        try {
          await sendViaGmailApi(
            email,
            'SPT OFFICIAL - Gmail API Test (port 443)',
            '<p>Gmail REST API on port 443 works!</p>'
          );
          results.push('✅ Gmail API port 443: SUCCESS');
        } catch (e: any) {
          results.push(`❌ Gmail API port 443: FAILED - ${e.message}`);
        }
      } else {
        results.push('⚠️ Gmail API port 443: SKIPPED (GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN not set)');
      }

      // Test SendGrid
      if (process.env.SENDGRID_API_KEY) {
        try {
          await sendEmailViaHttps(
            email,
            'SPT OFFICIAL - SendGrid Test (port 443)',
            '<p>SendGrid HTTPS API on port 443 works!</p>'
          );
          results.push('✅ SendGrid port 443: SUCCESS');
        } catch (e: any) {
          results.push(`❌ SendGrid port 443: FAILED - ${e.message}`);
        }
      } else {
        results.push('⚠️ SendGrid port 443: SKIPPED (SENDGRID_API_KEY not set)');
      }

      const elapsed = Date.now() - startTime;
      const anySuccess = results.some(r => r.startsWith('✅'));
      res.json({
        success: anySuccess,
        elapsed: `${elapsed}ms`,
        results,
        summary: anySuccess
          ? 'At least one email method works!'
          : 'All email methods failed. Check the errors above.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Test failed' });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
