import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
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

  // Signup — confirm user via Supabase Admin API (no SMTP needed)
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email, userId } = req.body;
      if (!email || !userId) return res.status(400).json({ error: 'Email and userId required' });

      const supabaseUrl = getSupabaseUrl();
      const serviceRole = getSupabaseServiceRole();
      if (!supabaseUrl || !serviceRole) return res.status(500).json({ error: 'Server config error' });

      const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
      if (error) throw error;

      res.json({ success: true, method: 'auto' });
    } catch (err: any) {
      console.error("Send OTP Error:", err);
      res.status(500).json({ error: err.message || 'Failed to activate account' });
    }
  });

  // Forgot password — send reset link via Supabase built-in email
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });

      const supabaseUrl = getSupabaseUrl();
      const supabaseAnonKey = getSupabaseAnonKey();
      if (!supabaseUrl || !supabaseAnonKey) return res.status(500).json({ error: 'Server config error' });

      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppUrl(req)}/reset-password`,
      });
      if (error) throw error;

      res.json({ success: true, linkSent: true });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: err.message || 'Failed to send reset link' });
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
