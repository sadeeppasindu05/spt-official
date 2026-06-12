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

  // Create storage buckets at startup (non-blocking)
  (async () => {
    const sbUrl = getSupabaseUrl();
    const sbRole = getSupabaseServiceRole();
    if (!sbUrl || !sbRole) { console.log('Supabase env not fully set, skipping startup bucket creation'); return; }
    try {
      const sb = createClient(sbUrl, sbRole, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: buckets } = await sb.storage.listBuckets();
      const existing = new Set((buckets || []).map((b: any) => b.name));
      for (const name of ['avatars', 'receipts', 'cms-images']) {
        if (!existing.has(name)) { await sb.storage.createBucket(name, { public: true }); console.log(`Created ${name} on startup`); }
      }
    } catch (err: any) { console.error('Startup bucket creation failed (can retry via endpoint):', err.message); }
  })();

  // Persist online count to Supabase every 60s
  setInterval(() => { persistOnlineCount(); }, 60000);

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

  async function getAiModels() {
    const supabaseUrl = getSupabaseUrl();
    const serviceRole = getSupabaseServiceRole();
    if (!supabaseUrl || !serviceRole) return [];
    const sb = createClient(supabaseUrl, serviceRole);
    const { data } = await sb.from('ai_models').select('id, name, is_active').order('created_at', { ascending: true });
    return (data || []).map(m => ({ id: m.id, name: m.name, isActive: m.is_active }));
  }

  // Protected: AI status (requires admin token)
  app.get("/api/ai/status", requireAdmin, async (req, res) => {
    res.json({
      configured: {
        chat: !!(adminProvidedApiKeys['chat'] || process.env.GEMINI_API_KEY),
        tools: !!(adminProvidedApiKeys['tools'] || process.env.GEMINI_API_KEY)
      },
      customModels: await getAiModels()
    });
  });

  // Protected: AI configure (requires admin token)
  app.post("/api/ai/configure", requireAdmin, async (req, res) => {
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
      customModels: await getAiModels()
    });
  });

  // Protected: Custom models (requires admin token)
  app.post("/api/ai/custom-models", requireAdmin, async (req, res) => {
    const { action, id, name, apiKey, isActive } = req.body;
    const supabaseUrl = getSupabaseUrl();
    const serviceRole = getSupabaseServiceRole();
    if (!supabaseUrl || !serviceRole) return res.status(500).json({ success: false, error: 'Supabase not configured' });
    const sb = createClient(supabaseUrl, serviceRole);

    if (action === 'add') {
      await sb.from('ai_models').insert({ name, api_key: apiKey, is_active: true });
    } else if (action === 'edit') {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (apiKey !== undefined && apiKey !== '') updates.api_key = apiKey;
      await sb.from('ai_models').update(updates).eq('id', id);
    } else if (action === 'delete') {
      await sb.from('ai_models').delete().eq('id', id);
    } else if (action === 'toggleActive') {
      await sb.from('ai_models').update({ is_active: isActive }).eq('id', id);
    }

    res.json({ 
      success: true, 
      customModels: await getAiModels()
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
            name: name || email.split('@')[0]
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
  // Admin sync profile (upsert by email)
  app.post("/api/admin/sync-profile", async (req, res) => {
    try {
      const { email, ...updates } = req.body;
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

      // Also save to system_config (no FK constraints — reliable fallback)
      if (updates.hasOwnProperty('profile_picture_url')) {
        const picKey = `profile_pic:${email.toLowerCase()}`;
        const picVal = updates.profile_picture_url || '';
        try {
          await supabaseAdmin.from('system_config').upsert(
            { key: picKey, value: picVal },
            { onConflict: 'key' }
          );
        } catch {}
      }

      // Try to update profiles table (may fail for users without Auth entry)
      try {
        const { data: updateData } = await supabaseAdmin
          .from('profiles')
          .update({ ...updates })
          .eq('email', email.toLowerCase())
          .select();

        if (!updateData || updateData.length === 0) {
          let authUserId: string | null = null;
          let page = 0;
          const pageSize = 1000;
          while (!authUserId) {
            const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: pageSize });
            const found = userList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
            if (found) { authUserId = found.id; break; }
            if (!userList?.users || userList.users.length < pageSize) break;
            page++;
          }
          if (!authUserId) {
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: email.toLowerCase(),
              email_confirm: true,
              password: crypto.randomUUID(),
            });
            if (createError) {
              const { data: existingList } = await supabaseAdmin.auth.admin.listUsers();
              const existing = existingList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
              if (existing) authUserId = existing.id;
            } else if (newUser?.user) {
              authUserId = newUser.user.id;
            }
          }
          if (authUserId) {
            await supabaseAdmin.from('profiles').insert({
              id: authUserId,
              email: email.toLowerCase(),
              ...updates
            });
          }
        }
      } catch {}

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to sync profile' });
    }
  });

  app.post("/api/admin/delete-user", async (req, res) => {
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

  // Serve favicon from in-memory buffer (no binary file in git)
  const FAVICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAABmJLR0QA/wD/AP+gvaeTAAAgAElEQVR4nO2deZRcZZHvf1VVd+1bekvS3UlIQkICSdBVQAkqsy9u46jMqM/LGZXnY86ZMzM6jqOP5z3n6PPMcUYdX0AFcRldcEOfgrKJgACy75CQdNJJOt3p9N59v7XcP+6t270kIQT4e8o5p7pv3a3lV/Vbvt9P1S+QJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJBEBBn4KIeh0OvT7fTzPo6oqANDpdCjLMiEEpmkSiUSIx+NIKRFCEEIIBEGAlBJZlomiKIQCQgh8f8iKpmlks1nS6TTdbtf6PJfLEYvFGB4exnEc+33LstA0DSEEjUYD13VxXZd0Ok0ymcQwDOr1OqlUCsMw6Ha79Ho9qtUqjuMQiUQYGhpibGyMXC7XLwoF+Xw+pigKANFoFFVVkVKiKAqaptFqtRgIBB2Px+n3+wCYpsnAwACWZdFut/F9H9M0yWQyaJqG7/s2DwKBQDKZJJFIkMvlkFISBAFxuxXBcRw7X6/Xo1arIYQgFosRCAS6rtNsNgkEAkEQYJomQgg7PpFIkEwm6304HA6tJ6qqWv6YXwBAURRaSMni4mJarRb1ep1MJkOr1SIIArLZLLFYjCAIqNfrAPR6PTzPwzTNUBMhZEWlUinbNgW2dDptx/f7fcuAlZWVv5FSks/n7RQIIWg2m1iWRSwWQ0ppGV0ul6nVasTjceLxOEtLS8TjcZLJJO12m3q9TrvdRlEUFhYWsCyLcrlMNptl9+7dTExMMDIyQrPZtMxYWVkhFovR7/epVCqUy2UajQa5XI5yuYzjOMSsGIlEotFo0Gq1kFKSzWZJp9M0m01M00QIAcdxMAyDlZUVyuWylUEQBAghsCwLXdeJx+O0222KxSKlUsmaQSQSoVarsbS0RKVSIQzDEEWRSCSYm5uj1+tRLBbp9XqEQmCj0UAIQaVSYX5+nlarRbVaJZFIEAqBQghKpRKFQoFarUa/r9Nut1FVFcMwcBwH3/cpFov0ej0URaHRaNBoNOj1ejSbTUKhEJiGgY2OqiqGYZDJZPB9n2q1Sq/XQ1VVFhcXUVUVXdeZm5uj2WwSBAH1ep3Z2Vl6vR7NZhNFUajVahSLRVRVRQhBoVDAcRxUVSWVStHv92m1WgAoimJNzPM8XNel1+sRDwaMzW1sXAiBpml0u11qtRq6riOEoNvtoqoqmqbR7/ep1Wq0220EQPl8Hsuy6Pf71gGEECiKQq/Xo1arIYSg1+vhOA6GYTA1NcX09DS7du2iVqtRKpUIhUJ7Ak3TKJfLrKyskMlkKBaLaJrG3NwcyWSSSqWCEMJ6p6IoxONx2wohSCaTFItFlpaWkFKysrKCaZqkUinC4TBRuxWy2SyZTIZCoUCj0SBtfX5ubo5ms0mpVKLb7VpGqKpKp9OhVCrRbrftOEEQ4DgOoVCIbrdLJpOh2WxSqVSIxWLWw0OhEOFwmEajQavVIp/PoygK+Xyeubk5oO0BXH/99bcEg0G9Xq+zsrJCsVik3+9Tr9cplUqoqsrw8DDJZJLV1VVarZZlRiAQoOs68/PzLC4uUqlUqFQqzM7OEovFyOfzKKpKOpWm2+3SaDQYHRslPzxMo9FgcXGRVquFoigMDQ0RCoWoVqs0m01arRYDAwMEQcDi4iK5XI7R0VEKhQJTU1Nomsb09DTZbJZsNsv8/DyZTIZkMsm+fftIJpMMDQ2RSCQIhUIsLS1Zj6rVaqRSKcLhMDMzM1b7AI6iKEIIFhYWmJubo1gsAvB0v9+3FzRNI4vH43G73Qa0crmMEGRaLRaWZWEYBgC6rtNsNonH40QiEVzXJRqN0ul0cF2XcDhMJpOh0+lYSRQKBSzLotFoMDY2RjqdRlVVKpUKjuOQyWSIxWI0Gg0WFhYolUpks1lGRkYQQlAoFFBVlVQqRbPZpFKpMDk5ycDAAGNjY4RCISqVCq7rkk6nicfjpFIpYrEY1WqVhYUFIpEIIyMjJBIJWq0Wvu8TiUSIx+PU63Xm5uYYHBxkYGCAcrmM53nIqakp+2ar5bIsEwqFqNVq7N27l0wmQ6vVolQqobSbbZYWF3lWtVrFNE0ajQYAndHRUZ7e7/cJhULEYjEKhQKGYYSi0SjdTod6vY7v+4RCITRNI5FI4Ps+s7OzZLNZyuWyVU2r1UJRFHq9HgsLCySTScrlMnNzc5ZePB5HURSGhoaYn59HVVXK5TKzs7M4jkM2m2V8fBzHcWg2m5RKJSqVCsNDQ2QyGQBmZ2elEKLT7/eFbdv0+32h6zqqqhKNRonH46RSKXbt2sXAwADhcBjbtkkmkyiBoGKV9yoQCoUwTZM9e/awd+9elspltm/fTiaTIdD0YRKJBKqqEovFME0TwzCIx+O0220qlYr1csdxaLVaeJ5HPp9H13X27dvH8vIysViMzZs3E4vFqFarpFIpUqkUY2Nj5HI5hoaG2L59O81mc1VVVb+rqipCCFTLADRNQ1VVGo0GkUiEZrNJLBYjHo/jui7VapVypUIul2P37t0sLy+bIiGEIkkkEqTTaXbu3MnOnTs5ePAghmFw4MABHnvsMf74xz+yfds2Nm/ezPe//33+5V/+hYMHD3L48GEeeeQRvv71rzMyMsLAwABf+9rX+O///m/m5+e5++67+e53v8s3v/lNGo0GJ0+epF6vs7CwwJ49e5icnOTzn/88W7ZsQdd1Pvaxj3HppZeSTCZ54YtehG3bbNu2jY9//ON0Oh2uuOIKPv/5z9NsNrn66qvZu3cvruvysY99jG9961vs37+f6667jp/85Cds2LCBp5umibLWLWiaRiwWo1QqIYTANE0ajQbZbJZSqcTy8jK5XI58Pk+73SYQCIIgoNvtsnfvXqamplhaWiIajdJsNonH4wgh0DSNcDhMOp3Gtm3y+TyLi4sUCgWEEOi6TqFQIJfLYds2ruvS6/WYmpqyFuG6LqOjo4RCIZaXlzFNk0ajYTe+lVwBwzBQFMXuxTKZjO2U5XI5EokE7XYb27ZxXZcgCOj1eoxkMszMzbFz507Sthv9nEajweHDh3nwwQd55JFH5De/+U12795Np9Ph+PHjPPHEE6ysrBCNRpmYmODYsWPs2bMHKSUbNmzglFNOIZfLsWXLFsbGxrjrrrvYvXs3ALfeeis/+tGPmJub48yzzmL37t08+cQTSCnZeeYZjI2NMXnoET76sY/RbDb57Gc/y4MPPsjOnTv5yle+wsTEBCsrK3zxi1+k1+uxdetWNm/eTLfb5dFHH2XHjh2sW7cO3/c5cuQIlUqFe+65h0qlQjQaJZ1Ok7ZiJL0WIHVdp1arWY92HIdms4llWdTrdVRVJRwO4/s+R44cYWBggFZrDcvl5WUajQamaRKPxzEMg3A4jKqqVgy7rks4HKZarZJOp+0CRVGsb09PT5PNZmk2m2iaRq1WY3l5mYGBATqdju1Ge55HpVJh06ZNwLAj6/X6tNttCoUC0WiUTCZDPB4nFosRi8WIRCJIKYlEIrRaLarVKr7vk0gkGBkZsZn0owMH+OnPfsbS0hLnnH02u3bu5L0f+AD/+7//y8mTJ5mbm7Mfv9/vUy6XyWQynHHGGdx111089NBDBEHA1q1b+cIXvsCGDRsIhUJEIhF6vR5PPvUUUkp+8IMfcODAAerr1jH+1FPouk4+n+clL30pF110EZs2bSKdTnP++eeTy+X46Ec/yujoKEEQcODAARqNBnfffTe+77Nv3z5mZ2d58MEHGRkZYWJiAtd1efe73y3uu+8+6fT7fQEIIYRQVZVsNstTTz1FqVSCIAiy2ay6srKCEKRYWFiQUkpUVSUajeL7PoqikEwm0XWd1157LS+85BJWV1aoVqu0221KpRL9ft8uUghBvV5HURQSiQSNRoP5+XlCoRDNZpNSqYTneRw6dIharcaBAwdot9vU63UajQbRaJRSqcSyvaFpNBokk0kajQbT09MsLi5Sr9cJgoCJiQmOHj3K7t27GR4epmJ3l2ZvVi6XGUinKZVKbNq0iWq1imEY1jz6/T5f/OIXeezxx7n0ja+nsnUrzWaTyclJDh06xLKtykIhWLduHZZlsX37diKRCFu2bGHHjh309+/nW9/6ln2sUa1W2bNnD6eeeipPHDjAph07+ND738+hQ4e49957+c1vfsNdP/sZW7du5b777+f888/ntttu451XXsm+J56wJv6KV7yCX/ziF/zTP/0Tc3Nz5PN5XNfl97//PadPTHDllVdavfYvfelL/Pa3vx3yPA+fdfsBEEKgqipDQ0PE43FarRalUgnP8wSgAoRCIQ5PTREOhxFC4LouR44cYWlpibGxMQYHB+n1eszOzjI8PEyr1bJmIoQgEomQTCZpt9ssLS2RTqep1WoYhkGr1WJhYcH6fi6XI51Os7KyQhAEJJNJCoUCAwMDTE9PMzU1RTQaBWB2dlbN5/Ns3bqVubk5IpEIy8vLKKpKLpejVquRzWaJRCIMDAzQarVot9v4vk+v12NkZIR2u43rusTjcVzXXXXdV2it/Xg8TiKR4PDhwzz22GMMb9nCz372MwYGBtixYweTk5Ns27aNO++8k7GxMdv1Xtrtdpmbm2N6apqHPv4JNE3j//yf/8PPfvYzjh07xmc/+1mCIGDHjh1MTk5KAL75zW/yspe9jHQ6Tbfb5SMf+Qi/+tWv+NWvfsXx48eZmpriwQcf5MCBA/i+TyQSoVqtsry8zM9//nOm/n//j3w+z6WXXsovf/lLPv7JT3LRRRfZDMjPfOYzfPvb3/5HLwgCrVAoWKbUajUURRFaaP0C4/E4w8PD6LrOwYMH0XWdSqXCnqeeyvpACkVZWFhQfd+n0+kgpUQIQSKRwHXdNU1SVRUhhF2srusMDQ2hqiq2bVuvOHbsGFJKUqkUQggcxyEajRKLxYjFYsRiMSzLIplM4jgOrVaLer1ONpul2+2iKApLS0sMDQ0xNjZmI04+n7d3d9FolEQiwcjICJVKhZmZGULWmw3DIBKJUK1WKRQKQO/Oo0ePigcffJCg2+WCCy5g//79fPOb3+TBBx8kl8vxmc98hhNPPJG6/Qs1ceIEAwcOoKoqhmFw1llnccYZZ7BlyxaKxSLf/OY3+fnPf849997LPffcw6233soHPvABms0m58/O8p73vIc//vGPvPnNb+bcc89ldnYW3/e55ppr+MhHPsL27dsRQiCl5JJLLuGSSy6xYe0973kP/+///T+kYRh89KMf5R3veIf73ve+98QPfvCDiBBiUBAE+H4fRVE4fPiwzYggCIjH44TDYRzHIZFIkEwmueGGGyzGv7CwgKZpjI+PW/XEYjHm5uasrN9///0kEglmZ2cpFAo4jkOz2WRlZYW+vY7v9/vUajWi0Si+76PrOqFQiMHBQTzPw7Isms0mhUKB4eFhVFVFUZTTbdtmbGyMo0ePYts2CwsLyN27d5NIJHAch0qlQqFQQAiBruskk0kymQxTU1P2aU2r1SKfz9Nut5FSWhNIJpP0+n3K5TIzMzPs3buXI0eOcPvtt3PjjTcyPT1NOBwmFouhaRqVSgXXdbnqqqv48Y9/zL333ouu6+zevZvdF15Iba2+L5fL3H777dxzzz38+Mc/5gtf+AJXXHEFr3/967nnnnv42Mc+xp5HH+W2227jkksu4bnPfS4vvPBC3v72t3Peeefx4he/mM2bN/OVr3yF888/n02bNjE4OMiG9etRFIUs8K5rrrmGO++8U2az2Q+3Wi3a9qGmlNJerCjKpj/96U+vaTabIqVMf/8HPsDszAy+7/PqV7+a2267jXq9TqPRoN1uUyqV+MpXvsK+ffsIh8MUCoW1hjVN44wzzoD+XVRrNRYWFjhy5AhTU1O0220mJyc5fPgw8/Pz/N///V+o128XQhAKhUin00QiEZtF2WwW27aZn58nl8uhaZq8+OKLefvb38727dv5h3/4B6anp4nFYmyzzEwkEpRKJRYXFzFNk2QyyeDgINVqlenpaStBpmlaRreaTdR/+7d/Y25ujr/7u79jy5Yt3HbbbZx++umsW7eOY8eOEYlE+OY3v8mXv/xl9u/fz6ZNm3Bdl4svvpi3X3UVkUiEUqlEJBJh48aN/H8f+hC6rvOqV72K22+/nXPOOYd//Md/ZP369Xz7299m+/btfPxTn+L3//M/RKNR3vGOd/DVf/1X7r33Xn7zm9/w73fdxZe//GXe/va3MzQ0RKVSIQwPfuITn2Dr1q1ce+219uQ+P7/1VhFC2B4TiUTe22w2/0pKORDYf9vMzs6+Y25ujnQ6jWma3Hzzzdx2220MDw9b34/H4zzyyCNMTU1hGAbVapWXXnIJ+Xyeer3O9PS0fYW2f/9+BgcHueKKKxgbGyMcDq9JkB0H0zR54YUX4nkeTzzxBPl83v5ZmZmZQQhxj+d5r0in08RiMZaXl/m7v/s7NE3jox/9KGv+PRmGwfvf/37m5+fFRRddxOTkJKlUiltuuYV4PE6hUEAIQafTsdlrmqZ9yJHNZun3+3xs+/Y1L6lVKp122wmbzSa6rlMqlTh54oQoFAqsrKzQ6XTI5XIMDg7SbDYxDGMtMpomrutSKBRIpVIIITC6XVKpFNlsFsMwiMfj7Nu3j3Q6jWVZKIpCMpmkUqnY9F1cXMT3fbLZLKZp2rPJ3/72N4aHh1EUxSNIkslk0HV9eHp6mrWPa5q2sLy8/Lm1N5ts2bKFPXv2cP755/PnP/85UkoSiQSJRAJd15mfn2d0dJRGoyE87yTHjh1j3759PPTQQ5xzzjn2ixTnnoOqqtRqNX7729+ysLBAIpEgn8+zadMmy+V+Op0WTz31lBkKhZBSYlkWhUKBkaEhoHVVo9GQ9Xr9Xe12+7tCiAWB/YMvpRTHjh2TUkpZqVREKpWyB1RSSkKhkIQ1SRKLxe5ZWVnZKIQQjuPYAiMSiXDrrbcyNTWFaZrs2LGDqakpoqOjbNm2jWazSbvdZnZ2lhtuuIGf/exnbN26lfXr19NsNqnVaoyOjvLII4/ITqdDt9vlxIkTyGq1SqPRoN/vk8/n8TyPpaWlJxqNxtZ2u40MBDKbzVpnVVWVxcVFNm7cSBz47ne/yz/+4z9Kfu/99NNPI4X40vve9z5mZ2dpNBqUSiUOHz5Mo9GwF36+72MYBq1Wi3a7jRCCVqvF0aNHyWazuK5LKpViYGAA27YplUokEom7Go3GAkKII0EQkEql2Lx5M0EQMDs7SzQataKk2+2um/R9n7m5ORqNBulk0s52YmJC/vM//zOWZXH48GF836dQKJDNZhkfH+fAgQPMzMzIEydOUCwWiUQiPPbYYzIzNkY+n0dKSSKRoFqtcu+993L99dfzwhe+kNnZWSns3aGiKMRiMer1OqVSiYcffpidO3eKdevWnUin02+cnp6+KggCd0AhbG5z3/cpFApo956V0O8Ln87aQJ7n4fs+lUqFZrNJp9MhHo+TTqfX6oBQyD6373a7eJ5nI16j0UAIQbFYpNPpUK/XMQyDer0ug0YjYJ2HqiqqquI4DkIQNJtNUavV4sViUYRCITqdjtA0zSqwqKqqSCQShEIhW34KISyTY0gpCQKB7/vW9nu9nhBCoOs6jUaDaDRq1dTpdJBS4nkemUzG0qvVagiBY3MUXdeJ2UIpnU4TjUbxPE92u134qJ17pVIhGo0i7On10NAQqqrKbrcr0um0uPXWWz9/z69/vfP5z38+R48e5cN///dcffXVa5OHQqRSKSzLQlEUcrkcQgiCICASiSAIAsrl8g99Xz5bVdX9QghqtRqO4+A4Dq7rWkGzxlNVFZ7jUK/X0XUdIQSO41jtCyFYt24dR44cwfM8q51er8eGjRuJRCJUKhWEEGzfvp2hYIDR0VHK5TKbN28mEAS+79Nuty3zO0sn3Hq7vXU8Hqff7xMIBP1+n36/T6PRIJVKCU3TcByHwWSSmZkZm7WqkCKXy7F582YGBwctlzzP48SJE/i+z+nr1jE0NER3bq67efNmLMuiWCyyadMm5ubmeOqppzBNk2azSbPZJJlMsmHDBkzTZPPmzTYaBIGgVCqRz+cJgoBsNsuWLVtoNBp2E9tsNmXx2LELf/zjH4fK5TIB0Gg00HUdx3FYv349hUKBpaUlAQwAMh6LiVKpZD3Msiy+/OUvk0gkSKVSPPXUUwwPD/PQQw8JQKiqiu/7vOc97+GnP/0p+/btY2RkBCGEtAztjI2NiaGhoYebzeY7+/3+yWQyaYO+bdtIKSkWiywsLJDNZnlkcZFyuYyqqqTTaRuKkskkhUKBZrNpGZBIJJidnbXn80EQ4DgOgiB4S7/fJ51O4/s+z1m3jk2bNlGv1wWwp1AocMb69Xiez4Hpafn69ev/6v3v/4B9IhMEAoQQBEGAYRgYhpHs9XrEYjG63a7UdV00Gg2SyaTN2lQqRRAENC2LXoPBcRCi0+kIoHXixAlKpZJdXKvVooeYTqcto4QQFAoFcfLkSft9nqIoe3zfP6CqKpZlIYSwEUIIYRu2fN8XmUyGQqFAu93Gdd01fOi6TrvdJh6Ps7i4yMaNG2k0GqRSKQYHB7n33nt517vehcjn80SjURRFIZFIMDk5yRtOP130ej2efOop4vG4PZSS9nR3eHj4Sn3t0xlN08jlcpaZQgiSySTVapVGo0EymUQIged5FHdYlsVisZy9e/e+1/M8ms0mExMTpFIpK+W+77Np0yYCgaDb7TK/o0PAsqeXQvCCF7yASCRCMpkkscMEALf2hf1AR0pJv99naklY5gHa2mK1e12P4eFhotEolUqFMPZNO47jUKvVWF5eZtu2bWiaRiwWI5vNEup2sdZezjSbTQEbhY0adzsOGzduZDKbJZ1OU6/XZVqINV7mz50T6LuBi2VZ5PN54nG5FjkbjYb0fZ8wEIvFWF5exjAMItFo2/f9e+mO0u12GR0dtYY6MDhoGx+CIODBBx8UN1x37ZqUt5aXpcvlTCAQ8v3vf39p//79qKrKsWPHqNVqolQqCQJBrVZbdV2X5eVl+5LLNqLbcqHf79NsNonH44yOjspwOMye3buR+TyRZz+bu+66SyYSiRO6rj9HCMFtP/0p51x5JQ8+8AAnTpyQyWSSWCyGZVnYtk00GqVarfL6iy4iFo/TnptbK7Q2bmT//v1s2rSJsd2713B1e3s63W5POPbssVQqCRgJBPJGKf3PuZ7Hn27z+sQTT0izXrdPixVFIZ1O4/s+lmVZxgUCgedUq1UajYb9lWoF13WlhR9CCGq1mvR9n09ffvkLf/GLX7Bv/37CMzO0Wy10280NhUIoioLv+wRnxWJ8/dZb+eMf/sh1117r3377/3D5m99MNBrlTy+5hNjMDLVajW63K8rlMoVTT+Vd77qaxx59lNtvv50tW7ZQKBT42Mc+xp49e+R73/ve16zfvDkG0HAce+4QjUYlQKfb/WKn0/mAYRo7AX77299e89prr+XIkSOC2xlggmi1Kj/84Q/L3bt3i8svv5zLL7+c0dFRGy3td4YFwLLNK1QqhUIhaJqGYRjLIDcJITbbtv33gUCYhq7TaDRkbq3+13Vdbt++XdbX6n7f919w1VVXMXR2idN22Hz55JNPcvz4cYIgoN1uc+zYMVKpFN0tW1RgLSEWgvdJKf/lWc961gdDyqsv0zQNIQRBELBr1y6y2axY39oigL8BmD/3XNLpdK9UKolQKMTnfvIT+ac//cmS33jGM/jOHXcINz/Anj17OPPMM3Ech0qlYvn+ovGxqE8glm2bU6q66vd60N5LKBT6kZQyLqVMALFWyyVAUlVVBoYNyZ6O3Lx5M3/37ncTTE+zc+dONm/eLNMDA0I8+OCD8v/9v/+3K7Bjxw6SySSGYcgTsRxmt7uzvLZQfHGNhBBs3rxZzngenbV4fu4aM5PJpO3Dbrfb9n+Z73/4Yb75zW9KVVUJh8MIIWyS7dmzxz6m5E//K959993y9ttvl9lsliNHjljy7t27EwD5fP7+A9PTIpm8FIDvfe97F4nbj0nXc+0h7br1ZP63f/M3dNpt0cvl5I9//GNxzTXXxO68887yBX/7t2w462z7FFgIIRG7hkmp0zfPJy6fL1AqlXBdF0VRsCyLhYWF+Ozs7E7DMEYefPBBAoGQruvE43E2b95MNpsV6XRa3HrrrVxyySUEQsETJ06wadMm2u02UkpWVlZIbtlCcnoa3/fxfZ9YLNaxTXBlINZoNNA0jWeeeYYdO3bQ6XREApBSitWz0bWhqipnTEwgpSQIAkzT5P3vf78IBPZ7AvF4nE984hOcOHEC27ZZWFgglUrR6XSwLIvR0VF5ww030Lr3Xi499VQGBwc5ceIEhmFg1utP9Pv9UwDG1m5vwzAMIS+TlUqFYrFo4/nar3Q6Tblc5n3ve5+4++67bSYsLi7KJ554gr179/b7/X7Hdd2QqqoAa8kE/JMQQhw8eNBugXO5HFm7f5BSIi3rRcVi8Q+GYRzYtm1bWh3IYxhG0u/3SafTpNNpdF2nUCiQSCQsB5LJJNVqVQRBQDKZJAiCOKVSSSSTSZWfj8vBYJDBwUFM06TVaqEaBoqiPDOWSPy5lPJETNdtREhZljoajdp+J8/z2LFjBwMDA6RSKYQQS2u5+3JLoq7rCIJ95XIZ27aRUqJpGrZtI4RAN02xFshPm5iY4MCBAxw/dox4PE6n0+GCCy4gn88Lx3EI7d0rpZTHDSN6ml0k2K5LHA6H11rRT0s6jqMFgUAowBmZzBqnLMtiZWWFnTt3igceeIB///d/p292SKfTCCHwPA8pJQcPHryhVqu9REr5WiHEUCwWY2hoiHq9TuQ973kP/+W//Bd27Nhx0U9+8pPXKooSPfvss7tLtpPiPM+zLJeBh/J8+OGHpZSS559/vjAMg5tvvlnOzs7KP/3pT6RSKWZnZ8lnMhhBQH5oiCHL+nG5XL7qiiuu+HeE6K6srBAEASsqm+c7zyOdThMEQYm1L1I6qtq5J51OG7Zt0+g6BIIgYJom0WiUIAh4/etfzzXXXMO//uu/EggEgqB/MnATgJQSQaVye/+P/0cX+NOi32Fcl8nlZRl6+e1pYGNd+8Kmt/fe9+Rzzz2XaDSKoiicddZZ9s/x80J5abnM3OwsnU6HVSFEJBIhDux/5hm+bhiXGYYhA4FASonv+/i+LwOBIJVKkUgkOHbsGFJKksmkiEQizvj4+F8rIT2RSPDMM88AEAqFyO78nIhEIlQqFV/btasA2oQ83Ekmk7d+85vfzB4+fJjR0VEGBweFiESu/PpHPiJ935fNWm2qVq0+JaXE930K65fYvXs3q6urRE85hUgux93f+AYI50eNRuOVQohLBLa/AOBjH/sYCwsLvPPmm4UIqW+TUqKqKlJKcrkcL37xiylYA/jiF78o77nnnoqUNh5G7UEYhmHSaDQIt0f/DCT9AAAgAElEQVQu3rlzJ0EQoGka3W6XV7ziFYyPj29QFPFVx3FOV1VVEEkm+yel7HVONyf4j//4Dz7ykY8gpWTXrl2MJpPccMMN4p/+6Z/o9Xqsrq6KBx54gGeccw7XfO97uGst17ZlEQgEvu/bTEkmk99/0Yte5AKb/X6fj3zkI2iappx77rnitNNOw3VdTj/99B3XXnvtF6PRaPuWW24RhmFs6P/v/4poNAqA67q2K5RKpahWq++Mx+O3jY+PEwgEQRDYfuLe2o5QSpm68MILr3nb294mQvYZ/+rqKq1WiyAI7AFWNBplfHyceDz+p4Zh/EhK2bStPVJKpqamKL3qVdx+++1sHhkhs4NL/+ZvZMgKpem9exkMBnNPPfVUNB6PB1JKVFUllUq9/H3ve58YHByk3+/LN7/5zeLJJ5+8etOmTZdj20Qsy0JKSbVana9Wq18aHR2N/e53v7Ne6qxRuyMIgkMIITE69Ek4HBaxWIyRkRGxb98+ATwH4JJLLhFSSr766leLlZUVK1aSyeSD3U7HvPXWW+l2u4TDYRqNhshms8p1110nLr30UoQQVp+N0b/8L3/1V//zf7/whS8WjUbDF4B45nvf8653Xr0jCIITxxyHUcuyRxFCyPr166Xv+5+99tprv/fcc88VQgjxL998M5+dkymTyYhlWRQKBambph0TEI1GKRQKGIaBZVl/3LZt26sjkQi9Xg/f9+0LWCklhUKBZrP5LSEEbjQq6/fdyyDruyYTGrquUyqVME3zOcVi8eF2uy2llAhC/L73vQ+l2+X/t7Aw53kec3Z9tm3bNsF6kRmeumXLlq3Ly8vfE0J8YmRkBNM0W80m//pf/5ZQp/OBDRs2vDUI6ANcPTLy8f1Hj34bRVG2bt0qPM+zM0NK2V1cXLz2P//zP5fn5+f/LKUUpmkqH7rwQqamph5stVrbVFXd7/s+tm2zsLDAyMgIpVIJ27b/XkrJe97zHnK5HCsrK3Lv3r1YlsWuXbsIhUJJ4F0///nP2bBhA0tLS6ysrKz3PO+Hnud93bbtf41EImc+WFirF9ZhghBCvOY1rxG+7+e/+53v8PWbbuJZz3oWB598kkw6Tfu55+GurJizp54qA4E9QvDa177WDYfiqme8RxpOyLPi2a8888wzsW0b3/f5l5tvRghxk6Zpn/zRj37E1VdfzT2//jW2L37DG3j961/Pvffdxz332N2wYRjMvOtdQto/C1uWRec1r/l7+/2FEEI8/NBD/MVf/MUbJicnpWEYWKFfq9WYm5vDMAyqGzeiFAprnYvsvUoymUTTNHbv3n3O3oMHs+b09Jm/+93v2LlzJ93xca688koZCoW44MIL+cD73scTv/89Fz7vecCw+Na3viW+feut5wsh/vb1113Htm3bcByH5eVl/uVf/kX80z/909qCRR48eJCBgYHXrq6u/rUQQmiKAQSh46uqym2PP86jf/gDW7ZuRVVVDh48yLZt22i328ob33glv/vd76hUKkz32/T7/UNLdiBK0x6Yv/oNb6B759385Cc/IZFI0Ov1vjY3N/fqdDrN1q1b+cQnPsHk5GR/+/btvPbSS+Xc3Bz79+/P//KXv+QVr3gFruvy7//+7/zVq19N5q/+So5v3co5r3wlyWSSPXv2yF6vR2bTJnsnp9+7d+9b4/H4JwNhs3V1dZVg/34+cf31nHPOOZZZQ0ND9h+5F158MaZpUq/VaLgufhDYZ0WmaUrb5fnYY4/x1t/+lrdcdhmtVgvLsvje977H5s2bf5HL5b5m2/ZXLMs6/cYbb+SGG26Qa+f7Utd1TjvtNHlOofDvQoj3PvTQQ5imSW18nMHBQSKRCPl8nj133cXrLr2UTCbDnj17hBCCZrNJoVAgGo3yspe/TF535pn8+u672bdvH5VKRTz55JOUk0kikYh44IEHrti0adM/NptN+97C8zz7fF7TNEzT5Nlnn83o6CgAi4uL3GDF5n0//znxeJxdu3YxNjYmfeDo0aO84IIL+JdLL+Wqq65idXWVYrHIV77yFe69916SyeQT99xzT3F8fJw9e/bwhje8QWTb7bemUqmbgiCwwyP6/T71ep0gCPj0Zz7D1m3bRLfbtdlomiZaPyQKhcIzt27bNtL3ffL5PKVSCU3TqNfrPPXUU4yNjTE5OclzXvQiKqaJpmmk02kbMgAuueQSPvCBD9izOvbv38/x48ft41J7jCWEYGVlRSiKQrvdJpFIUK/XbdfGMAy2bNlCfnQURVHYunUrpVKJ+fl5+48Oe2oUBAGpVIpMJkMsFrv35ptvZteuXSSTScbGxrAsixNOOWV9fHxcTCST3y6VSp/0PA9VVQWAPXMPhUIMDw9Lx3E+sX79+utLpZKIRCK27fV9n3K5zLnnnsuOHTvsJJ1Oh03nn8+GHTsAqFarmKZJIpGwpse+ffLGG28UQgiSySShUIj3vPe97Nmzh3g8TjKZtPeD8XicaDRKJpOx0us4Dueffz65XI5zX/hCPN9ncHCQer3O0tISjuOQy+VIJpM0Go3eF77whR3f/va3GVBVVFVlZnWVwcFBdF3H930KhQKlUolKpXI0CAKxtLREo9Gwp9tSSnzfp9frMTc3J2KxGH/xF3/B8PCw3LlzJ5s3bxZXX301gUBgt+ZEIhF+++tfD27ZsoVKpUI+n+fYsWMoisKBBgXbkBzP89YWTDAYDDI2NkY6nWbDhg3UajUhRNe+nrY/X2+aJp1OhyAIWK3VaDQa9Ho9e00Ri8VwHIeF+flLMpkMjuNQrVbp9Xo2mefn59mzZ4+wrFe5XE4EQfCVQqEgTNOk1+uRy+UQQuB53v0bN258+bOf/WxeeME5BEEg0uk0Q0NDrK6uEvb7PSRJp9Ps2LGDqNNBCIHjOFiWZf87VFVVSqUSkUiEz3/+8/zLv3yL4eFhXNclm81SKpVYWFjAtm0mJiao1+u0Wi3a7TYHDx5kPbYJh0KMVSooikK/38dxHCzL4o9//CP1ep0nnniCXbt2UavVCB+0P9TX6/Ust/V63YbeUCjEysoKlmUxMTHBgQMHGBwc5NixY+i6jqZpBEGAYRgcd5zG1NQUq6urhMNhIpEIhmEo4+PjBEEAoIdCIduR17bboX6/j+/7eJ7H61//ehqNBt1ul3q9zksvvphXvvKV2LYtfvvb34rVpSUajQbpdJq3v/3tjI2N2e2IqqqYponW6bB+/XqbFbFYjG63K13XJRqNWhVKKel0OjTsswuAgYEBRkdHcV2XfD5vHaHf7+PbVXytVqNWq1lVJRIJtm/fjhCCUqnE7OysvOOOO76ZSqW+GwRBoKqqCIVCXLdz53Wf/exnRRAEKKpKNpslFosRCAQf+MAHOHLkCFJKJicnbYTr9/sXSSl/Sk+rpew8q+nk8/k8XVsvqaqKYRjk83lCoRCq7f1/4xvfwMGDB+3QJsuyKBaLCCHsxFJKBgcHOXDgAOeffz5/+Zd/yRe+8AWmpqaQUqIoCtlsFt/30TSN9evXEwgEvu8Tj8dpNBo4jsP/AwLr1z4tRFYfAAAAAElFTkSuQmCC';
  const FAVICON_ICO_BASE64 = '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';
  const faviconPngBuffer = Buffer.from(FAVICON_BASE64, 'base64');
  const faviconIcoBuffer = Buffer.from(FAVICON_ICO_BASE64, 'base64');
  const faviconHeaders = { 'Cache-Control': 'no-cache, no-store, must-revalidate' };
  app.get('/favicon.png', (req, res) => {
    res.set(faviconHeaders).type('png').send(faviconPngBuffer);
  });
  app.get('/favicon.ico', (req, res) => {
    res.set(faviconHeaders).type('ico').send(faviconIcoBuffer);
  });

  async function persistOnlineCount() {
    try {
      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return;
      const sb = createClient(supabaseUrl, serviceRole);
      await sb.from('marketing_counters').upsert(
        { id: 'global', online_count: onlineVisitors.size, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    } catch {}
  }

  // Online visitor heartbeat + count (also returns marketing counters for live sync)
  app.get("/api/online/count", async (req, res) => {
    const ip = getClientIp(req);
    onlineVisitors.set(ip, Date.now());
    await persistOnlineCount();
    let registered = 592, subscribed = 370;
    try {
      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (supabaseUrl && serviceRole) {
        const sb = createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } });
        const { data: mc } = await sb.from('marketing_counters').select('registered_count, subscribed_count').eq('id', 'global').single();
        if (mc) { if (mc.registered_count != null) registered = mc.registered_count; if (mc.subscribed_count != null) subscribed = mc.subscribed_count; }
      }
    } catch {}
    res.json({ count: onlineVisitors.size, online: onlineVisitors.size, registered, subscribed });
  });

  app.post("/api/online/heartbeat", async (req, res) => {
    const ip = getClientIp(req);
    onlineVisitors.set(ip, Date.now());
    await persistOnlineCount();
    res.json({ success: true });
  });

  // Generic counter write (uses service_role to bypass RLS)
  app.post("/api/counters/write", async (req, res) => {
    try {
      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: "Server config missing" });
      const sb = createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } });
      const { registered_count, subscribed_count } = req.body || {};
      const payload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (registered_count != null) payload.registered_count = registered_count;
      if (subscribed_count != null) payload.subscribed_count = subscribed_count;
      if (Object.keys(payload).length <= 1) return res.status(400).json({ error: "No counter fields provided" });
      const { data, error } = await sb.from('marketing_counters').upsert({ id: 'global', ...payload }, { onConflict: 'id' }).select().maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, registered_count: data?.registered_count ?? registered_count, subscribed_count: data?.subscribed_count ?? subscribed_count });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Counter read (uses service_role to bypass RLS)
  app.get("/api/counters/read", async (req, res) => {
    try {
      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: "Server config missing" });
      const sb = createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } });
      const { data, error } = await sb.from('marketing_counters').select('*').eq('id', 'global').maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.json({ registered_count: 592, subscribed_count: 370, online_count: 0 });
      res.json({ registered_count: data.registered_count ?? 592, subscribed_count: data.subscribed_count ?? 370, online_count: data.online_count ?? 0 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Counter increment (uses service_role to bypass RLS)
  app.post("/api/counters/increment", async (req, res) => {
    try {
      const { type } = req.body || {};
      if (!type || !['registered', 'subscribed'].includes(type)) return res.status(400).json({ error: "Invalid type" });
      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: "Server config missing" });
      const sb = createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } });
      const { data: current } = await sb.from('marketing_counters').select('*').eq('id', 'global').maybeSingle();
      const currentCount = current?.[type === 'registered' ? 'registered_count' : 'subscribed_count'] || 0;
      const newCount = currentCount + 1;
      const col = type === 'registered' ? 'registered_count' : 'subscribed_count';
      const { data, error } = await sb.from('marketing_counters').upsert({ id: 'global', [col]: newCount, updated_at: new Date().toISOString() }, { onConflict: 'id' }).select().maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, [col]: newCount, registered_count: data?.registered_count ?? (type === 'registered' ? newCount : current?.registered_count ?? 592), subscribed_count: data?.subscribed_count ?? (type === 'subscribed' ? newCount : current?.subscribed_count ?? 370) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Counter increment with server-side profile check (no client Supabase needed)
  app.post("/api/counters/increment-if-new", async (req, res) => {
    try {
      const { email, type } = req.body || {};
      if (!email || type !== 'registered') return res.status(400).json({ error: "Invalid request" });
      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: "Server config missing" });
      const sb = createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } });
      const { data: existing } = await sb.from('profiles').select('email').eq('email', email.toLowerCase().trim()).maybeSingle();
      let incremented = false;
      let regCount = 592, subCount = 370;
      const { data: mc } = await sb.from('marketing_counters').select('*').eq('id', 'global').maybeSingle();
      if (mc) { regCount = mc.registered_count ?? 592; subCount = mc.subscribed_count ?? 370; }
      if (!existing) {
        const newCount = regCount + 1;
        await sb.from('marketing_counters').upsert({ id: 'global', registered_count: newCount, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        regCount = newCount;
        incremented = true;
      }
      res.json({ registered_count: regCount, subscribed_count: subCount, incremented });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Apply pending SQL migrations to Supabase DB
  app.post("/api/admin/apply-migrations", async (req, res) => {
    const regions = ['us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-southeast-2', 'sa-east-1', 'ca-central-1'];
    const password = process.env.DB_PASSWORD || "iQzlOrjiToiSCd00";
    const projectRef = "wrhqguwubtxgtwtoeuqx";
    const sqlPath = path.join(process.cwd(), 'supabase-schema.sql');
    let sql: string;
    try {
      sql = fs.readFileSync(sqlPath, 'utf8');
    } catch {
      return res.status(500).json({ error: 'supabase-schema.sql not found' });
    }
    const errors: string[] = [];
    let connected = false;
    let lastError = '';
    const { Pool } = await import('pg');
    for (const region of regions) {
      try {
        const pool = new Pool({
          connectionString: `postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
          max: 1,
          connectionTimeoutMillis: 5000,
        });
        const client = await pool.connect();
        await client.query('SELECT 1');
        connected = true;
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        let executed = 0;
        for (const stmt of statements) {
          try {
            await client.query(stmt);
            executed++;
          } catch (stmtErr: any) {
            errors.push(`Statement ${executed + 1}: ${stmtErr.message}`);
          }
        }
        client.release();
        await pool.end();
        return res.json({
          success: true,
          region,
          totalStatements: statements.length,
          executed,
          errors: errors.length > 0 ? errors : undefined,
          message: `Connected via ${region}. Executed ${executed}/${statements.length} statements.`,
        });
      } catch (err: any) {
        lastError = err.message;
      }
    }
    if (!connected) {
      return res.status(500).json({
        error: 'Could not connect to any region',
        lastError,
        triedRegions: regions,
        passwordFirstChar: password[0],
        passwordLastChar: password[password.length - 1],
        hint: 'Check the region in Supabase Dashboard → Project Settings → Database. Try setting DB_PASSWORD env var if different.',
      });
    }
  });

  // Simple diagnostic: check env vars
  app.get("/api/admin/diag", (req, res) => {
    res.json({
      supabaseUrl: !!getSupabaseUrl(),
      anonKey: !!(getSupabaseAnonKey()),
      serviceRole: !!getSupabaseServiceRole(),
      nodeEnv: process.env.NODE_ENV || 'not set',
    });
  });

  // Ensure storage buckets exist (via supabaseAdmin)
  app.post("/api/admin/ensure-buckets", async (req, res) => {
    try {
      const sbUrl = getSupabaseUrl();
      const sbRole = getSupabaseServiceRole();
      if (!sbUrl || !sbRole) return res.status(500).json({ error: 'Supabase not fully configured', hasServiceRole: !!sbRole });
      const sb = createClient(sbUrl, sbRole, { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } });
      const { data: buckets, error: listErr } = await sb.storage.listBuckets();
      if (listErr) return res.status(500).json({ error: `listBuckets: ${listErr.message}` });
      const existing = new Set((buckets || []).map((b: any) => b.name));
      for (const name of ['avatars', 'receipts', 'cms-images']) {
        if (!existing.has(name)) {
          const { error: ce } = await sb.storage.createBucket(name, { public: true });
          if (ce) console.error(`Create ${name}: ${ce.message}`);
        }
      }
      res.json({ success: true, buckets: ['avatars','receipts','cms-images'].map(n => ({ name: n, exists: existing.has(n) })) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upload avatar via server (bypasses client-side RLS)
  app.post("/api/admin/upload-avatar", async (req, res) => {
    try {
      const { email, image, bucket } = req.body;
      if (!email || !image) return res.status(400).json({ error: 'Email and image required' });
      const sbUrl = getSupabaseUrl();
      const sbRole = getSupabaseServiceRole();
      if (!sbUrl || !sbRole) return res.status(500).json({ error: 'Supabase service role not configured' });
      const bucketName = bucket || 'avatars';
      const ext = image.includes('image/png') ? 'png' : 'jpg';
      const clean = image.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(clean, 'base64');
      const filePath = `${email.toLowerCase()}_${Date.now()}.${ext}`;
      const publicUrl = `${sbUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
      const sb = createClient(sbUrl, sbRole, {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: ws },
      });
      const { error: upErr } = await sb.storage.from(bucketName).upload(filePath, buf, { contentType: `image/${ext}`, upsert: true });
      if (upErr) return res.status(500).json({ error: `Storage: ${upErr.message}` });
      // Save URL to system_config
      try { await sb.from('system_config').upsert({ key: `profile_pic:${email.toLowerCase()}`, value: publicUrl }, { onConflict: 'key' }); }
      catch (e: any) { console.error('system_config upsert error:', e.message); }
      // Also save to profiles table for real-time sync & reload persistence
      try {
        const { data: existing, error: updErr } = await sb.from('profiles').update({ profile_picture_url: publicUrl }).eq('email', email.toLowerCase()).select();
        if (updErr) console.error('profile update error:', updErr.message);
        if (!existing || existing.length === 0) {
          let authUserId = null;
          const { data: users, error: listErr } = await sb.auth.admin.listUsers();
          if (listErr) console.error('listUsers error:', listErr.message);
          const found = users?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (found) authUserId = found.id;
          if (!authUserId) {
            const { data: newUser, error: createErr } = await sb.auth.admin.createUser({ email: email.toLowerCase(), email_confirm: true, password: crypto.randomUUID() });
            if (createErr) console.error('createUser error:', createErr.message);
            if (newUser?.user) authUserId = newUser.user.id;
          }
          if (authUserId) {
            const { error: insErr } = await sb.from('profiles').insert({ id: authUserId, email: email.toLowerCase(), profile_picture_url: publicUrl });
            if (insErr) console.error('profile insert error:', insErr.message);
          } else { console.error('No auth user found/created for profiles insert'); }
        }
      } catch (e: any) { console.error('profiles save error:', e.message); }
      res.json({ success: true, url: publicUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get profile pic URL from system_config
  // Debug: test Supabase connection step by step
  app.get("/api/admin/debug-upload", async (req, res) => {
    const steps: any = {};
    try {
      const sbUrl = getSupabaseUrl();
      const sbRole = getSupabaseServiceRole();
      steps.hasUrl = !!sbUrl;
      steps.hasRole = !!sbRole;
      if (!sbUrl || !sbRole) return res.json({ error: 'Missing credentials', steps });
      const sb = createClient(sbUrl, sbRole, { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } });
      steps.client = 'ok';
      const { data: buckets, error: listErr } = await sb.storage.listBuckets();
      steps.listBuckets = listErr ? `err: ${listErr.message}` : `ok (${(buckets||[]).length} buckets)`;
      if (!listErr) {
        const publicUrl = `${sbUrl}/storage/v1/object/public/avatars/test_${Date.now()}.txt`;
        const { error: upErr } = await sb.storage.from('avatars').upload(`test_${Date.now()}.txt`, Buffer.from('test'), { contentType: 'text/plain', upsert: true });
        steps.upload = upErr ? `err: ${upErr.message}` : 'ok';
        if (!upErr) {
          const { error: sysErr } = await sb.from('system_config').upsert({ key: 'debug_test', value: 'ok' }, { onConflict: 'key' });
          steps.systemConfig = sysErr ? `err: ${sysErr.message}` : 'ok';
          const { error: profErr } = await sb.from('profiles').update({ name: '__debug__' }).eq('email', '__debug__@test.com');
          steps.profilesUpdate = profErr ? `err: ${profErr.message}` : 'ok (no rows)';
          const { error: bucketDelErr } = await sb.storage.from('avatars').remove([`test_${Date.now()}.txt`.replace('test_', 'test_')]);
          if (bucketDelErr) console.error('cleanup:', bucketDelErr.message);
        }
      }
      res.json({ success: true, steps });
    } catch (err: any) { res.json({ error: err.message, steps }); }
  });

  app.get("/api/profile/pic", async (req, res) => {
    try {
      const email = (req.query.email as string)?.toLowerCase();
      if (!email) return res.status(400).json({ error: 'Email required' });
      const sb = createClient(getSupabaseUrl(), getSupabaseServiceRole() || '', { auth: { autoRefreshToken: false, persistSession: false } });
      const { data } = await sb.from('system_config').select('value').eq('key', `profile_pic:${email}`).maybeSingle();
      res.json({ email, url: data?.value || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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

