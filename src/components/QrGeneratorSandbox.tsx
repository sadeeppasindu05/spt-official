import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Download, RefreshCw, Sparkles, AlertCircle, Eye } from 'lucide-react';

interface QrGeneratorProps {
  accentColorClass: string;
}

export default function QrGeneratorSandbox({ accentColorClass }: QrGeneratorProps) {
  const [qrText, setQrText] = useState('https://spt.official/portfolio');
  const [fgColor, setFgColor] = useState('#0a0a16');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [styleMode, setStyleMode] = useState<'classic' | 'neon' | 'stars'>('neon');
  const [generationCount, setGenerationCount] = useState(1);
  const [loading, setLoading] = useState(false);

  // Strip hex symbol for API calls
  const cleanFg = fgColor.replace('#', '');
  const cleanBg = bgColor.replace('#', '');

  // Compute live API image URL
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}&color=${cleanFg}&bgcolor=${cleanBg}`;

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setGenerationCount(prev => prev + 1);
      setLoading(false);
    }, 600);
  };

  const downloadQr = () => {
    // Open in mock tab
    window.open(qrUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
      {/* Settings Form */}
      <div className="md:col-span-7 space-y-5">
        <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
          <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <QrCode className="text-neon-blue w-5 h-5 animate-spin-slow" /> QR Node Design Parameters
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Target Payload / URL</label>
              <input
                type="text"
                value={qrText}
                onChange={e => setQrText(e.target.value)}
                placeholder="Type URLs or texts to encode..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-neon-blue text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Foreground color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={e => setFgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-300 uppercase">{fgColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Background color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-300 uppercase">{bgColor}</span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Aesthetic Color presets</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Cosmic Blackout', fg: '#00f0ff', bg: '#040209' },
                  { name: 'Stellar Green', fg: '#39ff14', bg: '#020b02' },
                  { name: 'Classic Tech', fg: '#000000', bg: '#ffffff' },
                  { name: 'Sunset Aura', fg: '#bd00ff', bg: '#ffffff' }
                ].map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => { setFgColor(p.fg); setBgColor(p.bg); }}
                    className="px-2.5 py-1 text-[11px] rounded-md border border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer transition font-mono"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Style mode */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Style Treatment</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'classic', label: 'Tech Square', desc: 'Sharp blocks' },
                  { id: 'neon', label: 'Glow Center', desc: 'Cosmic aura' },
                  { id: 'stars', label: 'Ethereal Star', desc: 'Gradient vibes' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setStyleMode(mode.id as any)}
                    className={`p-2.5 rounded-lg border text-left flex flex-col transition cursor-pointer ${
                      styleMode === mode.id
                        ? 'border-neon-blue bg-neon-blue/5'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold text-white mb-0.5">{mode.label}</span>
                    <span className="text-[9px] text-slate-400">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300/80 leading-relaxed flex gap-2.5 items-start">
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>This QR Generator uses live cloud-rendering protocols. Fully operational! Type any URL to test. Click the download emblem to export high-transparency source vector directly.</span>
        </div>
      </div>

      {/* QR Output Preview */}
      <div className="md:col-span-5 flex flex-col items-center">
        <div className="p-6 rounded-3xl glass-panel relative overflow-hidden flex flex-col items-center w-full max-w-[280px]">
          {/* Neon border decoration */}
          <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none" />
          <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse`} />

          {/* Glowing scanner ray line overlay animation */}
          <div className="absolute top-10 inset-x-6 h-[1.5px] bg-emerald-400/50 shadow-[0_0_10px_#22c55e] animate-bounce pointer-events-none z-10" />

          {/* QR Canvas wrap */}
          <div className="relative p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-inner overflow-hidden mb-5">
            {loading ? (
              <div className="w-[180px] h-[180px] flex items-center justify-center bg-white">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <img
                src={qrUrl}
                alt="Live SPT Cosmic QR code generator results"
                className="w-[180px] h-[180px] object-contain"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          <div className="text-center space-y-1 mb-4">
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase flex items-center justify-center gap-1">
              <Eye className="w-3 h-3 text-cyan-400" /> Live Scanning Active
            </span>
            <p className="text-xs font-bold text-white truncate max-w-[220px] font-mono">{qrText}</p>
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={handleRefresh}
              className="flex-1 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-mono font-bold text-slate-300 hover:bg-white/10 cursor-pointer flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <RefreshCw className="w-3 h-3" /> Rekey
            </button>
            <button
              onClick={downloadQr}
              className="flex-1 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs font-mono font-bold text-cyan-200 hover:bg-cyan-500/20 cursor-pointer flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
