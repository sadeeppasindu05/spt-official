import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let adminProvidedApiKeys: Record<string, string> = {};
let _aiClients: Record<string, GoogleGenAI> = {};

interface CustomAiModel {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
}

let customAiModels: CustomAiModel[] = [];

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

// Keep track of chat sessions in memory (basic implementation for chatbot)
const chatSessions: Record<string, any> = {};

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(express.json());

  // Supabase runtime config endpoint
  app.get("/api/config", (req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    });
  });

  // API constraints check
  app.get("/api/ai/status", (req, res) => {
    res.json({
      configured: {
        chat: !!(adminProvidedApiKeys['chat'] || process.env.GEMINI_API_KEY),
        tools: !!(adminProvidedApiKeys['tools'] || process.env.GEMINI_API_KEY)
      },
      customModels: customAiModels.map(m => ({ id: m.id, name: m.name, isActive: m.isActive }))
    });
  });

  app.post("/api/ai/configure", (req, res) => {
    const { apiKey, feature } = req.body;
    const targetFeature = feature || 'chat';
    
    if (apiKey) {
      adminProvidedApiKeys[targetFeature] = apiKey;
      // Reset the client so it gets re-initialized with the new key next time
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

  app.post("/api/ai/custom-models", (req, res) => {
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

  // Main chatbot endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, sessionId = "default" } = req.body;
      const ai = getAiClient('chat');
      
      if (!chatSessions[sessionId]) {
        chatSessions[sessionId] = ai.chats.create({
          model: "gemini-3.5-flash",
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
