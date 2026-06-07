import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Link2, User, Copy, Check, Sparkles, Phone, ShieldCheck } from 'lucide-react';
import { CustomLink, AioProfile } from '../types';

interface AioLinkSandboxProps {
  accentColorClass: string;
}

export default function AioLinkSandbox({ accentColorClass }: AioLinkSandboxProps) {
  const [profile, setProfile] = useState<AioProfile>({
    name: 'Sadeep Pasindu',
    bio: 'Creator & Tech Visionary | SPT OFFICIAL Founder 🌌',
    avatarBg: 'linear-gradient(135deg, #00f0ff, #bd00ff)',
    accentColor: '#00f0ff',
    links: [
      { id: '1', title: 'Official Website', url: 'https://spt.official', iconName: 'Sparkles' },
      { id: '2', title: 'KBERA Clothing Store', url: 'https://kbera.store', iconName: 'ShoppingBag' },
      { id: '3', title: 'Listen to my Tracks (SoundCloud)', url: 'https://soundcloud.com/spt', iconName: 'Music' },
    ]
  });

  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newUrl) return;
    const item: CustomLink = {
      id: Date.now().toString(),
      title: newTitle,
      url: newUrl.startsWith('http') ? newUrl : `https://${newUrl}`,
      iconName: 'Link2'
    };
    setProfile(prev => ({
      ...prev,
      links: [...prev.links, item]
    }));
    setNewTitle('');
    setNewUrl('');
  };

  const handleRemoveLink = (id: string) => {
    setProfile(prev => ({
      ...prev,
      links: prev.links.filter(l => l.id !== id)
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://spt.link/${profile.name.toLowerCase().replace(/\s+/g, '')}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* CMS Form controls */}
      <div className="lg:col-span-7 space-y-6">
        <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
          <div className="absolute top-0 right-0 py-1 px-3 text-[10px] uppercase font-mono tracking-widest bg-emerald-500/20 text-emerald-300 rounded-bl-xl flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Live Sandbox
          </div>
          <h3 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-2">
            <User className="text-neon-blue w-5 h-5 animate-pulse" /> Custom Link Configurator
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-neon-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1">Interactive Bio</label>
              <textarea
                value={profile.bio}
                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-neon-blue resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Avatar Aura Style</label>
              <div className="flex gap-3">
                {[
                  { name: 'Cosmic Cyan', bg: 'linear-gradient(135deg, #00f0ff, #bd00ff)', accent: '#00f0ff' },
                  { name: 'Vibrant Sol', bg: 'linear-gradient(135deg, #ff9f43, #ff5252)', accent: '#ff5252' },
                  { name: 'Stellar Lime', bg: 'linear-gradient(135deg, #39ff14, #00f0ff)', accent: '#39ff14' },
                  { name: 'Lavender Royal', bg: 'linear-gradient(135deg, #bd00ff, #ff007f)', accent: '#bd00ff' },
                ].map(gradient => (
                  <button
                    key={gradient.name}
                    type="button"
                    onClick={() => setProfile({ ...profile, avatarBg: gradient.bg, accentColor: gradient.accent })}
                    className="w-10 h-10 rounded-full cursor-pointer relative transition transform active:scale-95"
                    style={{ background: gradient.bg }}
                    title={gradient.name}
                  >
                    {profile.avatarBg === gradient.bg && (
                      <span className="absolute inset-0 m-auto w-3 h-3 bg-white rounded-full shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Existing Links Manager */}
        <div className="p-6 rounded-2xl glass-panel">
          <h4 className="text-sm font-mono uppercase tracking-widest text-gray-300 mb-3 flex items-center justify-between">
            <span>Active Links list ({profile.links.length})</span>
            <span className="text-xs text-gray-500 normal-case font-sans">Rearranger & custom deletion</span>
          </h4>

          <div className="space-y-2 mb-6">
            {profile.links.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No links specified yet. Add some below!</p>
            ) : (
              profile.links.map(link => (
                <div key={link.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition group">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                      <Link2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="text-sm font-medium text-white">{link.title}</h5>
                      <span className="text-xs text-gray-500 font-mono italic truncate max-w-xs block">{link.url}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveLink(link.id)}
                    className="p-2 rounded-lg text-rose-400 opacity-60 hover:opacity-100 hover:bg-rose-500/10 cursor-pointer transition"
                    title="Remove link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add link form */}
          <form onSubmit={handleAddLink} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <h5 className="text-xs font-mono uppercase tracking-wider text-neon-blue">Insert Dynamic Link Card</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Link Label (e.g. Portfolio)"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm feed-input"
              />
              <input
                type="text"
                placeholder="URL (e.g. sadeep.net)"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm feed-input"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition duration-200"
            >
              <Plus className="w-4 h-4" /> Append Link Card
            </button>
          </form>
        </div>
      </div>

      {/* Visual Live Mobile Device Preview Frame */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center">
        <label className="text-[11px] font-mono tracking-widest text-indigo-400 uppercase mb-3 flex items-center gap-1">
          <Phone className="w-3 h-3" /> Real-time Smartphone Display Wrap
        </label>

        {/* 3D Mobile Device frame shell */}
        <div className="relative w-[310px] h-[610px] rounded-[40px] border-4 border-slate-800 bg-slate-950 p-2 shadow-2xl glass-panel overflow-hidden">
          {/* Dynamic Glow aura behind inside */}
          <div 
            className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-[70px] opacity-40 transition-all duration-700" 
            style={{ background: profile.avatarBg }}
          />

          {/* Notch indicator */}
          <div className="absolute top-0 inset-x-0 mx-auto w-24 h-5 bg-slate-800 rounded-b-2xl z-20 flex justify-center items-center">
            <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700" />
          </div>

          {/* In-device Screen Content viewport */}
          <div className="relative w-full h-full rounded-[34px] overflow-y-auto scrollbar-none flex flex-col items-center pt-8 px-4 pb-4 bg-slate-950/90 select-none">
            {/* Holographic Avatar monogram */}
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-display font-bold relative p-[3px] shadow-lg mb-4 mt-2"
              style={{ background: profile.avatarBg }}
            >
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                {profile.name.split(' ').map(n=>n[0]).join('')}
              </div>
            </div>

            {/* Display names */}
            <h4 className="text-md font-display font-bold text-white text-center tracking-tight">{profile.name}</h4>
            <p className="text-[10px] font-mono font-medium text-slate-400 text-center uppercase tracking-widest mt-1">@spt.universe</p>
            <p className="text-xs text-slate-300 text-center mt-2.5 px-2 line-clamp-2 leading-relaxed font-sans">{profile.bio}</p>

            {/* Rendered links tree buttons */}
            <div className="w-full space-y-2.5 mt-6 flex-grow">
              {profile.links.map(l => (
                <motion.a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 rounded-xl block text-center font-medium text-xs border bg-white/5 border-white/10 hover:bg-white/10 transition-colors relative"
                  style={{ borderColor: `${profile.accentColor}33` }}
                >
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-70" style={{ color: profile.accentColor }}>
                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                  </span>
                  <span className="text-white text-shadow-sm">{l.title}</span>
                </motion.a>
              ))}
            </div>

            {/* Logo label in phone footer */}
            <div className="mt-8 pt-4 border-t border-white/5 w-full text-center">
              <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">Powered by SPT Official®</span>
            </div>
          </div>
        </div>

        {/* Copy Link tree action button */}
        <button
          onClick={handleCopy}
          className="mt-5 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-xs text-white flex items-center gap-2 hover:bg-white/10 cursor-pointer transition active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" /> profile url copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-400" /> Share Live Link Card Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
}
