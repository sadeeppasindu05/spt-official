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
