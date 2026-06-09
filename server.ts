import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from "nodemailer";
import https from "https";
import http from "http";
import fs from "fs";
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
  // When a request is available, derive URL from it (handles proxies correctly)
  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}`;
  }
  // Fallback to APP_URL env or localhost when no request context
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  return 'http://localhost:3000';
}

const otpStore: Map<string, { otp: string; email: string; userId?: string; expiresAt: number }> = new Map();
const rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();

function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 300000);

// Online visitor tracking (IP-based, expires after 5 min)
const onlineVisitors: Map<string, number> = new Map();
setInterval(() => {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const [ip, lastSeen] of onlineVisitors) {
    if (lastSeen < fiveMinAgo) onlineVisitors.delete(ip);
  }
}, 60000);

function getClientIp(req: express.Request): string {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

// Rate limit middleware factory
function rateLimitMiddleware(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!rateLimit(ip, maxRequests, windowMs)) {
      return res.status(429).json({ error: 'Too many requests. Please wait before trying again.' });
    }
    next();
  };
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
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
  app.set('trust proxy', 1);

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
  app.post("/api/send-confirmation", rateLimitMiddleware(5, 60000), async (req, res) => {
    try {
      const { email, password } = req.body;
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
        password: password || crypto.randomBytes(16).toString('hex'),
        options: { redirectTo: `${getAppUrl(req)}/auth/callback` },
      });
      if (linkError) throw linkError;

      const actionLink = linkData?.properties?.action_link;
      if (!actionLink) throw new Error('Failed to generate confirmation link');

      // Generate and store OTP (expires in 10 min) with userId for direct lookup
      const otp = generateOtp();
      const userId = (linkData as any)?.data?.user?.id || '';
      otpStore.set(email.toLowerCase(), { otp, email: email.toLowerCase(), userId, expiresAt: Date.now() + 600000 });

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
  app.post("/api/verify-recovery-otp", rateLimitMiddleware(10, 60000), async (req, res) => {
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
  app.post("/api/verify-otp", rateLimitMiddleware(10, 60000), async (req, res) => {
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

      // Find user — use stored userId if available, else fallback to listUsers
      let userId = stored.userId;
      if (!userId) {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const user = userList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (!user) return res.status(404).json({ error: 'User not found' });
        userId = user.id;
      }

      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
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
  app.post("/api/forgot-password", rateLimitMiddleware(5, 60000), async (req, res) => {
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

  // File upload endpoint (fallback when Supabase Storage unavailable)
  app.post("/api/upload", requireAdmin, async (req, res) => {
    try {
      const { file, fileName } = req.body;
      if (!file) return res.status(400).json({ error: 'No file data provided' });

      const uploadsDir = path.join(process.cwd(), 'dist', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const ext = file.includes('image/png') ? 'png' : 'jpg';
      const cleanBase64 = file.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const savedName = fileName || `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const filePath = path.join(uploadsDir, savedName);
      fs.writeFileSync(filePath, buffer);

      res.json({ success: true, url: `/uploads/${savedName}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });

  // Payment receipt submission
  app.post("/api/payment/receipt", async (req, res) => {
    try {
      const { email, planId, receiptData, refCode } = req.body;
      if (!email || !receiptData) return res.status(400).json({ error: 'Email and receipt required' });

      const isSupabaseReady = getSupabaseUrl() && getSupabaseAnonKey();
      if (isSupabaseReady) {
        try {
          const supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseServiceRole() || getSupabaseAnonKey(), {
            auth: { autoRefreshToken: false, persistSession: false },
            realtime: { transport: ws }
          });
          await supabaseAdmin.from('payment_receipts').insert([{
            email,
            plan_id: planId,
            receipt_data: receiptData,
            ref_code: refCode,
            status: 'pending'
          }]);
        } catch (dbErr: any) {
          console.error('Failed to store receipt in Supabase:', dbErr.message);
        }
      }

      // Send receipt confirmation email
      try {
        await trySendEmail(
          email,
          'SPT OFFICIAL - Payment Receipt Received',
          `<div style="font-family: monospace; padding: 20px; background: #0a0a1a; color: #fff;">
            <h2 style="color: #00f0ff;">Payment Receipt Received</h2>
            <p>Thank you for your payment! We have received your receipt.</p>
            ${refCode ? `<p>Reference Code: <strong>${refCode}</strong></p>` : ''}
            <p>We will verify your payment and activate your subscription within 24 hours.</p>
            <hr style="border-color: #333;" />
            <p style="color: #888;">SPT OFFICIAL - Sadeep Pasindu Creative Universe</p>
          </div>`
        );
      } catch (emailErr) {
        console.error('Failed to send receipt confirmation:', emailErr);
      }

      res.json({ success: true, message: 'Receipt submitted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to process receipt' });
    }
  });

  // Profile update notification endpoint
  app.post("/api/profile/update", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });

      const isSupabaseReady = getSupabaseUrl() && getSupabaseAnonKey();
      if (isSupabaseReady) {
        try {
          const supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseServiceRole() || getSupabaseAnonKey(), {
            auth: { autoRefreshToken: false, persistSession: false },
            realtime: { transport: ws }
          });
          await supabaseAdmin.from('profiles').upsert({
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });
        } catch (dbErr: any) {
          console.error('Failed to update profile in Supabase:', dbErr.message);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update profile' });
    }
  });

  // Admin delete user (Supabase Auth + profiles)
  app.post("/api/admin/delete-user", requireAdmin, async (req, res) => {
    try {
      const { email, userId } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });

      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) {
        return res.status(500).json({ error: 'Supabase not configured' });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: ws }
      });

      // Delete from profiles table by email
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('email', email.toLowerCase());

      if (profileError) {
        console.error('Failed to delete profile:', profileError.message);
      }

      // Delete from Auth if userId provided
      if (userId) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          console.error('Failed to delete auth user:', authError.message);
        }
      }

      res.json({ success: true, message: `User ${email} deleted` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
  });

  // Serve uploaded files statically
  const uploadsPath = path.join(process.cwd(), 'dist', 'uploads');
  if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath));
  }

  // Online visitor heartbeat + count
  app.get("/api/online/count", (req, res) => {
    const ip = getClientIp(req);
    onlineVisitors.set(ip, Date.now());
    const count = onlineVisitors.size;
    res.json({ count, online: count });
  });

  app.post("/api/online/heartbeat", (req, res) => {
    const ip = getClientIp(req);
    onlineVisitors.set(ip, Date.now());
    res.json({ success: true });
  });

  // System health check
  app.get("/api/system/health", async (req, res) => {
    try {
      const checks: { name: string; status: string; detail?: string }[] = [];
      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();

      // 1. Supabase connection
      const supabaseConfigured = !!(supabaseUrl && serviceRole);
      checks.push({
        name: 'Supabase Configuration',
        status: supabaseConfigured ? 'pass' : 'fail',
        detail: supabaseConfigured ? 'URL + Service Key present' : 'Missing credentials',
      });
      if (supabaseConfigured) {
        try {
          const supabaseAdmin = createClient(supabaseUrl!, serviceRole!, {
            auth: { autoRefreshToken: false, persistSession: false },
            realtime: { transport: ws }
          });
          await supabaseAdmin.auth.admin.listUsers();
          checks.push({ name: 'Supabase Connection', status: 'pass', detail: 'Admin API reachable' });
        } catch {
          checks.push({ name: 'Supabase Connection', status: 'fail', detail: 'Admin API unreachable' });
        }
      }

      // 2. Gmail REST API
      const gmailConfigured = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
      if (gmailConfigured) {
        try {
          const token = await getGmailAccessToken();
          checks.push({ name: 'Gmail REST API', status: 'pass', detail: token ? 'Access token OK' : 'No token returned' });
        } catch (e: any) {
          checks.push({ name: 'Gmail REST API', status: 'fail', detail: `Token error: ${e.message}` });
        }
      } else {
        checks.push({ name: 'Gmail REST API', status: 'fail', detail: 'GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN not set' });
      }

      // 3. SMTP status
      const smtpConfigured = !!(process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD);
      checks.push({
        name: 'SMTP (port 587)',
        status: smtpConfigured ? 'degraded' : 'warn',
        detail: smtpConfigured ? 'Configured but likely blocked (timeout)' : 'GMAIL_APP_PASSWORD not set',
      });
      checks.push({
        name: 'SMTP (port 465)',
        status: smtpConfigured ? 'degraded' : 'warn',
        detail: smtpConfigured ? 'Configured but likely blocked (timeout)' : 'GMAIL_APP_PASSWORD not set',
      });

      // 4. SendGrid
      checks.push({
        name: 'SendGrid (port 443)',
        status: process.env.SENDGRID_API_KEY ? 'pass' : 'warn',
        detail: process.env.SENDGRID_API_KEY ? 'Configured' : 'Not configured (optional)',
      });

      // 5. Overall email sending
      const emailWorking = gmailConfigured || !!process.env.SENDGRID_API_KEY;
      checks.push({
        name: 'Email Sending',
        status: emailWorking ? 'pass' : 'fail',
        detail: emailWorking
          ? gmailConfigured
            ? 'Gmail API functional'
            : 'SendGrid available'
          : 'No email method available',
      });

      // 6. HF Space status (via API)
      try {
        const hfRes = await fetch('https://huggingface.co/api/spaces/Sadeeppasindu05/spt-official');
        if (hfRes.ok) {
          const hfData = await hfRes.json();
          const stage = hfData?.runtime?.stage || 'unknown';
          const domainStage = hfData?.runtime?.domains?.[0]?.stage || 'unknown';
          const sha = hfData?.runtime?.sha || hfData?.sha || 'unknown';
          checks.push({
            name: 'HF Space Status',
            status: stage === 'RUNNING' ? 'pass' : 'fail',
            detail: `Stage: ${stage}, Domain: ${domainStage}`,
          });
          checks.push({
            name: 'Deployed Commit',
            status: 'info',
            detail: sha.substring(0, 7),
          });
        } else {
          checks.push({ name: 'HF Space Status', status: 'fail', detail: 'API unreachable' });
        }
      } catch {
        checks.push({ name: 'HF Space Status', status: 'fail', detail: 'API request failed' });
      }

      // 7. Server info
      const uptimeSec = process.uptime();
      const uptimeStr = uptimeSec >= 86400
        ? `${Math.floor(uptimeSec / 86400)}d ${Math.floor((uptimeSec % 86400) / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`
        : uptimeSec >= 3600
          ? `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`
          : `${Math.floor(uptimeSec / 60)}m ${Math.floor(uptimeSec % 60)}s`;
      checks.push({ name: 'Server Uptime', status: 'info', detail: uptimeStr });
      checks.push({
        name: 'Memory Usage',
        status: 'info',
        detail: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB`,
      });
      checks.push({
        name: 'App URL',
        status: 'info',
        detail: getAppUrl(req),
      });

      // Overall status
      const hasFail = checks.some(c => c.status === 'fail');
      const hasDegraded = checks.some(c => c.status === 'degraded');
      const overall = hasFail ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

      res.json({ overall, checks, timestamp: Date.now() });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Health check failed' });
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

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'dist', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
