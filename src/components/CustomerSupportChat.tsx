import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, User, Loader2, Mail, FileText, CheckCircle2, ChevronRight, MessageCircle } from 'lucide-react';

interface CustomerSupportChatProps {
  language?: 'si' | 'en';
}

export default function CustomerSupportChat({ language = 'en' }: CustomerSupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'ticket'>('ai');
  
  // AI Chat states
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { 
      role: 'ai', 
      text: language === 'si' 
        ? 'හලෝ! මම SPT නිල AI සහායක. ඔබට අවශ්‍ය තොරතුරු, සේවාවන් සහ පැකේජ ගැන ඕනෑම දෙයක් මාගෙන් විමසන්න පුළුවන්. (Hello! I am the official SPT AI Assistant. Feel free to ask me anything.)'
        : 'Hello! I am the official SPT AI Assistant. Feel free to ask me anything about our tools, services, and packages.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  // Direct Support Form states
  const [formEmail, setFormEmail] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Unique session ID for AI memory context
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  // Handle language changes dynamically
  useEffect(() => {
    setMessages([
      { 
        role: 'ai', 
        text: language === 'si' 
          ? 'හලෝ! මම SPT නිල AI සහායක. ඔබට අවශ්‍ය තොරතුරු, සේවාවන් සහ පැකේජ ගැන ඕනෑම දෙයක් මාගෙන් විමසන්න පුළුවන්.'
          : 'Hello! I am the official SPT AI Assistant. Feel free to ask me anything about our tools, services, and packages.'
      }
    ]);

    // Attempt to pre-fill email if a user is logged in
    try {
      const cachedUsers = localStorage.getItem('spt_users');
      if (cachedUsers) {
        const users = JSON.parse(cachedUsers);
        if (users && users.length > 0) {
          // Pre-fill with the first user found or last logged-in
          setFormEmail(users[0].email || '');
        }
      }
    } catch (_) {}
  }, [language]);

  useEffect(() => {
    const handleOpenSupport = () => {
      setIsOpen(true);
      setActiveTab('ticket');
    };
    window.addEventListener('open_spt_support_ticket', handleOpenSupport);
    return () => {
      window.removeEventListener('open_spt_support_ticket', handleOpenSupport);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'ai') {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, activeTab]);

  const ct = (siText: string, enText: string) => (language === 'si' ? siText : enText);

  // Send message to Gemini AI
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
      } else {
        const errorMsg = data.error || '';
        if (errorMsg.includes('401') || errorMsg.toLowerCase().includes('unauthenticated') || errorMsg.toLowerCase().includes('key not configured') || errorMsg.toLowerCase().includes('api_key')) {
          setMessages(prev => [...prev, { 
            role: 'ai', 
            text: ct(
              'සමාවන්න! SPT AI සහායක සඳහා වලංගු Gemini API Key එකක් (කේතයක්) සකසා නොමැත. කරුණාකර AI Studio හි Settings > Secrets panel එක හරහා GEMINI_API_KEY එක ඇතුළත් කරන්න. එසේත් නැතහොත් Admin Dashboard එකෙන් API key එක ඇතුළත් කරන්න.',
              'Sorry, a valid Gemini API Key is not set up for the support assistant. Please make sure GEMINI_API_KEY is configured in your AI Studio Settings > Secrets or specify it in your app\'s Admin Dashboard.'
            )
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: `ERROR: ${errorMsg || 'Failed to connect. Please make sure the AI is configured in the Admin Dashboard.'}` }]);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: ct('සමාවන්න, මම මේ වන විට නොබැඳිව සිටිමි.', 'Sorry, I am currently offline or cannot connect to the server.') }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Support Message Ticket directly to LocalStorage + dispatch event to keep AdminConsole synced dynamically
  const handleSupportTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formMessage.trim()) return;

    setIsSubmitting(true);
    
    // Simulate slight network delay for beautiful visual feel
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const newTicket = {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: formEmail.trim(),
        message: formMessage.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      const existingTickets = JSON.parse(localStorage.getItem('spt_support_messages') || '[]');
      existingTickets.unshift(newTicket); // Newest messages at top
      localStorage.setItem('spt_support_messages', JSON.stringify(existingTickets));

      // Dispatch event so AdminConsole listens to it and updates dynamically in real-time
      window.dispatchEvent(new Event('spt_support_messages_changed'));

      setFormMessage('');
      setSubmitSuccess(true);
      
      // Auto reset success state after 4 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 4000);

    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        id="floating-support-btn"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_24px_rgba(6,182,212,0.5)] flex items-center justify-center cursor-pointer text-white border border-white/20 hover:border-white/45 transition-colors duration-300"
      >
        <MessageSquare className="w-6 h-6 animate-pulse" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-slate-900"></span>
        </span>
      </motion.button>

      {/* Chat Window Panel with extreme glassmorphism */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="spt-chat-glass-window"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-24 right-5 sm:right-6 w-[340px] sm:w-[390px] h-[525px] max-h-[80vh] z-50 backdrop-blur-3xl bg-slate-950/15 border border-white/15 rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden font-sans"
          >
            {/* Header with extreme glass effect and colorful ambient lighting */}
            <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between shrink-0 relative">
              <div className="absolute top-0 left-0 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
              
              <div className="flex items-center gap-2.5 pl-1">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-300 border border-white/10">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight font-mono tracking-wider">
                    {ct('SPT සහායක සේවාව', 'SPT MEMBER SUPPORT')}
                  </h4>
                  <p className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase flex items-center gap-1 mt-0.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {ct('සක්‍රීයයි', 'ONLINE MATRIX')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Premium Dual Mode Selector Tabs with highly transparent styling */}
            <div className="flex bg-white/[0.02] p-1 border-b border-white/5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => { setActiveTab('ai'); setSubmitSuccess(false); }}
                className={`flex-1 py-2 text-[10px] rounded-lg font-mono tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'ai' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_2px_8px_rgba(6,182,212,0.15)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {ct('AI සහායක සමඟ Chat', 'AI ASSISTANT CHAT')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ticket')}
                className={`flex-1 py-2 text-[10px] rounded-lg font-mono tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'ticket' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_2px_8px_rgba(245,158,11,0.15)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                {ct('පණිවිඩයක් එවන්න', 'SEND SUPPORT MESSAGE')}
              </button>
            </div>

            {/* Workspace Content Window with transparent visual backgrounds */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
              
              {/* Tab 1: Gemini AI Chatbot */}
              {activeTab === 'ai' && (
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-transparent">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className="shrink-0 flex items-end mb-1">
                            {msg.role === 'ai' ? (
                              <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-white/10 text-cyan-300">
                                <Sparkles className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-slate-300 border border-white/10">
                                <User className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-lg ${
                            msg.role === 'user' 
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 rounded-br-sm' 
                              : 'bg-white/[0.04] text-slate-100 border border-white/15 rounded-bl-sm whitespace-pre-wrap backdrop-blur-md'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex w-full justify-start">
                        <div className="flex gap-2 flex-row max-w-[85%]">
                          <div className="shrink-0 flex items-end">
                            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-white/10 text-cyan-300">
                              <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            </div>
                          </div>
                          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 rounded-bl-sm text-cyan-300 flex items-center gap-2">
                             <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                             <span className="text-[10px] font-mono animate-pulse">{ct('සහායකයා ලියමින් පවතී...', 'Assistant writing...')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={endOfMessagesRef} />
                  </div>

                  {/* AI Input Area */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-white/[0.02] border-t border-white/10 flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder={ct('නැනෝ සහායකයාගෙන් විමසන්න...', 'Ask AI Assistant...')}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isLoading}
                      className="flex-1 bg-white/[0.03] backdrop-blur-md border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-405/50 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !inputText.trim()}
                      className="w-10 h-10 shrink-0 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 disabled:text-slate-600 disabled:bg-white/5 flex items-center justify-center rounded-xl transition-colors shrink-0 cursor-pointer border border-cyan-500/40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 2: Send Support Ticket Form */}
              {activeTab === 'ticket' && (
                <div className="p-5 flex-1 flex flex-col justify-between bg-transparent">
                  <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-start gap-2.5 backdrop-blur-md">
                      <FileText className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider">
                          {ct('ඍජු සහාය ඉල්ලීම් පණිවිඩය', 'DIRECT ADMIN SUPPORT')}
                        </h5>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                          {ct('ඔබට ඇති ඕනෑම ප්‍රශ්නයක් හෝ ගැටලුවක් SPT පරිපාලක වෙත මෙතැනින් යොමු කරන්න.', 'File an offline transmission. Admin checks and replies to email addresses directly.')}
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSupportTicketSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 tracking-widest font-bold">
                          {ct('ඔබගේ ඊමේල් ලිපිනය (EMAIL ADDRESS)', 'YOUR EMAIL CONTACT')}
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="email"
                            required
                            placeholder="sadeep@sptcreative.com"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            className="w-full bg-white/[0.03] backdrop-blur-md border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-450/60"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 tracking-widest font-bold">
                          {ct('නිර්මාණකරු සහාය පණිවිඩය (MESSAGE)', 'YOUR SUPPORT MESSAGE')}
                        </label>
                        <textarea
                          required
                          rows={4}
                          placeholder={ct('ඔබට අවශ්‍ය සහාය හෝ ගැටලුව මෙතැන ලියන්න...', 'Describe your issue or order specifications in detail...')}
                          value={formMessage}
                          onChange={(e) => setFormMessage(e.target.value)}
                          className="w-full bg-white/[0.03] backdrop-blur-md border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-450/60 resize-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !formEmail.trim() || !formMessage.trim()}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 font-mono font-bold text-[10px] uppercase tracking-widest text-slate-950 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(245,158,11,0.2)] border border-amber-400/20"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {ct('යවමින් පවතී...', 'TRANSMITTING...')}
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            {ct('පණිවිඩය පරිපාලක වෙත යවන්න', 'TRANSMIT SUPPORT TICKET')}
                          </>
                        )}
                      </button>
                    </form>

                    <AnimatePresence>
                      {submitSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl flex items-start gap-2 text-[10.5px] leading-relaxed backdrop-blur-md"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">
                              {ct('පණිවිඩය සාර්ථකව ලැබුණා!', 'Transmission Connected!')}
                            </span>
                            <span>
                              {ct('ඔබගේ පණිවිඩය අප වෙත සාර්ථකව ලැබුණි. අප විසින් ඔබගේ විද්‍යුත් තැපෑල (Email) හරහා නුදුරේදීම සම්බන්ධ වන්නෙමු.', 'We have successfully logged your offline ticket. Our agent will contact your email inbox shortly.')}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="border-t border-white/5 pt-3.5 text-center text-[9px] text-slate-500 font-mono uppercase tracking-widest">
                    {ct('සහය සම්බන්ධතාවය: support@spt.com', 'SUPPORT GATE CONTACT: SUPPORT@SPT.COM')}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
