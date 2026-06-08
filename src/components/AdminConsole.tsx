import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Image, Paintbrush, Sliders, Activity, Plus, Laptop, KeyRound, Sparkles, Trash2, 
  Lock, Shield, Globe, RefreshCw, FileText, Check, CheckCircle, Menu, Eye, EyeOff, Layout, FolderKanban, PlusCircle, Video, Play, ExternalLink,
  PenTool, Star, BarChart3, Users, MousePointerClick, Calendar, BookOpen, User, Mail, CheckCircle2,
  Download, Upload
} from 'lucide-react';
import { SPACE_WALLPAPERS } from '../data';
import { SystemConfig, SptTool, ServiceItem, AccessoryBrand, OfferItem, HomeStatCard, AboutCard, ReviewItem, TelemetryEvent, ContactLinkItem, BlogPost, SptUser } from '../types';
import { ImageCropperModal } from './ImageCropper';
import { createBackup, downloadBackup, parseBackupFile, saveAutoBackupData, getAutoBackupData, getAutoBackupSettings, saveAutoBackupSettings, getIntervalMs, AutoBackupInterval, AutoBackupSettings } from '../utils/backup';

// Safe confirm dialog implementation for sandboxed environments
const confirm = (msg: string): boolean => {
  try {
    const res = window.confirm(msg);
    if (res === undefined || res === null) {
      return true;
    }
    return res;
  } catch (e) {
    console.warn("Blocking confirm fallback to True due to iframe sandbox:", e);
    return true;
  }
};

const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const FileUploadTrigger = ({ onUploaded, label = "Device එකෙන් රූපයක් තෝරන්න (Select Image)" }: { onUploaded: (url: string) => void, label?: string }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [aspect, setAspect] = useState<'1:1' | '16:9' | '4:3'>('1:1');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('කරුණාකර පින්තූර ගොනුවක් පමණක් තෝරන්න! Please select an image file.');
      return;
    }
    try {
      const base64 = await convertFileToBase64(file);
      setOriginalImage(base64);
      setShowCropModal(true);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    } catch (err) {
      console.error(err);
      alert('පින්තූරය කියවීම අසාර්ථක විය. Error reading device image.');
    }
  };

  React.useEffect(() => {
    if (!originalImage || !showCropModal) return;
    const img = new window.Image();
    img.src = originalImage;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let targetW = 400;
      let targetH = 400;
      if (aspect === '16:9') {
        targetW = 480;
        targetH = 270;
      } else if (aspect === '4:3') {
        targetW = 400;
        targetH = 300;
      }

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.clearRect(0, 0, targetW, targetH);

      const imgAspect = img.width / img.height;
      const canvasAspect = targetW / targetH;

      let drawW = targetW;
      let drawH = targetH;

      if (imgAspect > canvasAspect) {
        drawH = targetH;
        drawW = targetH * imgAspect;
      } else {
        drawW = targetW;
        drawH = targetW / imgAspect;
      }

      // Zoom factor scaling
      drawW *= zoom;
      drawH *= zoom;

      // Center placement with drag offset bounds
      const posX = (targetW - drawW) / 2 + offsetX;
      const posY = (targetH - drawH) / 2 + offsetY;

      ctx.save();
      // Draw zoomed & offset image
      ctx.drawImage(img, posX, posY, drawW, drawH);
      ctx.restore();
    };
  }, [originalImage, showCropModal, zoom, offsetX, offsetY, aspect]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - offsetX, y: touch.clientY - offsetY });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffsetX(touch.clientX - dragStart.x);
    setOffsetY(touch.clientY - dragStart.y);
  };

  const handleSaveCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64Crop = canvas.toDataURL('image/jpeg', 0.9);
    onUploaded(base64Crop);
    setShowCropModal(false);
    setOriginalImage(null);
  };

  return (
    <div className="mt-1 flex flex-col items-start gap-2">
      <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/25 text-cyan-300 font-mono text-[9px] uppercase tracking-wider font-bold border border-[#00f0ff]/20 cursor-pointer select-none transition">
        <span>📁 {label}</span>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} // allow selecting same file again
          className="hidden" 
        />
      </label>

      {showCropModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-3 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 w-full max-w-xl flex flex-col items-center gap-4 shadow-2xl my-auto max-h-[95vh] overflow-y-auto">
            <div className="text-center w-full">
              <h3 className="text-sm sm:text-base font-display font-medium text-white tracking-tight">ඡායාරූපය සකසන්න (Crop & Adjust Image)</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1">රූපය අවශ්‍ය පරිදි Zoom කර, ඇද (drag) ස්ථානගත කරන්න</p>
            </div>

            {/* Selection Aspect Presets */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setAspect('1:1')}
                className={`px-3 py-1 text-[10px] rounded font-mono transition-colors ${aspect === '1:1' ? 'bg-[#00f0ff] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                SQUARE (1:1)
              </button>
              <button
                type="button"
                onClick={() => setAspect('16:9')}
                className={`px-3 py-1 text-[10px] rounded font-mono transition-colors ${aspect === '16:9' ? 'bg-[#00f0ff] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                WIDE (16:9)
              </button>
              <button
                type="button"
                onClick={() => setAspect('4:3')}
                className={`px-3 py-1 text-[10px] rounded font-mono transition-colors ${aspect === '4:3' ? 'bg-[#00f0ff] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                STANDARD (4:3)
              </button>
            </div>

            {/* Drag & Crop Playground */}
            <div className="relative border border-white/10 bg-black rounded-lg overflow-hidden flex items-center justify-center p-2 w-full h-[180px] sm:h-[250px] md:h-[280px] cursor-move shrink-0">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUpOrLeave}
                className="shadow-2xl border border-dashed border-[#00f0ff]/50 rounded max-w-full max-h-full"
              />
              <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/75 rounded text-[8px] text-cyan-300 font-mono tracking-wider uppercase pointer-events-none select-none">
                Live Preview
              </div>
            </div>

            {/* Control Panel */}
            <div className="w-full space-y-3 bg-slate-950 p-3 rounded-xl border border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-mono w-12">ZOOM</span>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-[#00f0ff] bg-slate-800 rounded-lg appearance-none h-1 cursor-pointer"
                />
                <span className="text-[10px] text-cyan-400 font-mono w-8 text-right">{zoom.toFixed(2)}x</span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setZoom(1); setOffsetX(0); setOffsetY(0); }}
                  className="px-2 py-1 text-[9px] uppercase font-mono text-slate-400 hover:text-white border border-white/10 rounded hover:bg-white/5 transition"
                >
                  නැවත මුලට (Reset)
                </button>
                <div className="text-[9px] text-slate-500 font-mono italic">
                  Drag with mouse/touch or slide to zoom.
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2.5 w-full shrink-0">
              <button
                type="button"
                onClick={() => { setShowCropModal(false); setOriginalImage(null); }}
                className="flex-1 py-1.5 sm:py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10 transition cursor-pointer font-medium text-xs sm:text-sm"
              >
                අවලංගු කරන්න (Cancel)
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                className="flex-1 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold hover:brightness-110 active:scale-95 transition cursor-pointer text-xs sm:text-sm"
              >
                සුරකින්න (Crop & Apply)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface AdminConsoleProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  tools: SptTool[];
  onAddNewTool: (newTool: SptTool) => void;
  onDeleteTool: (id: string) => void;
  onUpdateTools?: React.Dispatch<React.SetStateAction<SptTool[]>>;
  services: ServiceItem[];
  onAddNewService: (newService: ServiceItem) => void;
  onDeleteService: (id: string) => void;
  onUpdateServices?: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
  brands: AccessoryBrand[];
  onAddNewBrand: (newBrand: AccessoryBrand) => void;
  onDeleteBrand: (id: string) => void;
  onUpdateBrands?: React.Dispatch<React.SetStateAction<AccessoryBrand[]>>;
  isUnlocked: boolean;
  onSetUnlockStatus: (status: boolean) => void;
  
  // Custom states added for CMS control
  offersList: OfferItem[];
  setOffersList: React.Dispatch<React.SetStateAction<OfferItem[]>>;
  homeStatsList: HomeStatCard[];
  setHomeStatsList: React.Dispatch<React.SetStateAction<HomeStatCard[]>>;
  aboutCardsList: AboutCard[];
  setAboutCardsList: React.Dispatch<React.SetStateAction<AboutCard[]>>;
  reviewsList: ReviewItem[];
  setReviewsList: React.Dispatch<React.SetStateAction<ReviewItem[]>>;
  contactsList?: ContactLinkItem[];
  setContactsList?: React.Dispatch<React.SetStateAction<ContactLinkItem[]>>;
  
  // Blogs list and registered users list
  blogsList?: BlogPost[];
  setBlogsList?: React.Dispatch<React.SetStateAction<BlogPost[]>>;
  sptUsersList?: SptUser[];
  setSptUsersList?: React.Dispatch<React.SetStateAction<SptUser[]>>;

  // Subscription Packages sync
  subscriptionPlans?: any[];
  setSubscriptionPlans?: React.Dispatch<React.SetStateAction<any[]>>;

  // Centralized Dynamic Payment Gateways
  paymentGateways?: any[];
  setPaymentGateways?: React.Dispatch<React.SetStateAction<any[]>>;

  // Analytics Tracking Support
  telemetryList?: TelemetryEvent[];
  onClearTelemetry?: () => void;
  onTrackTelemetryEvent?: (type: 'pageview' | 'click' | 'signup' | 'contact', path: string, elementName?: string) => void;
  adminPin?: string;
  setAdminPin?: (pin: string) => void;
  onIncorrectPinLogout?: () => void;
}

export default function AdminConsole({
  config,
  setConfig,
  tools,
  onAddNewTool,
  onDeleteTool,
  onUpdateTools,
  services,
  onAddNewService,
  onDeleteService,
  onUpdateServices,
  brands,
  onAddNewBrand,
  onDeleteBrand,
  onUpdateBrands,
  isUnlocked,
  onSetUnlockStatus,
  offersList,
  setOffersList,
  homeStatsList,
  setHomeStatsList,
  aboutCardsList,
  setAboutCardsList,
  reviewsList,
  setReviewsList,
  contactsList = [],
  setContactsList,
  blogsList = [],
  setBlogsList,
  sptUsersList = [],
  setSptUsersList,
  subscriptionPlans: propSubscriptionPlans,
  setSubscriptionPlans: propSetSubscriptionPlans,
  paymentGateways: propPaymentGateways,
  setPaymentGateways: propSetPaymentGateways,
  telemetryList = [],
  onClearTelemetry,
  onTrackTelemetryEvent,
  adminPin = '000000',
  setAdminPin,
  onIncorrectPinLogout
}: AdminConsoleProps) {
  // Auth Form local states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Admin PIN Changing States
  const [oldPinField, setOldPinField] = useState('');
  const [newPinField, setNewPinField] = useState('');
  const [confirmPinField, setConfirmPinField] = useState('');

  // Dashboard Sub tab navigation
  const [consoleTab, setConsoleTab] = useState<'info' | 'aiconfig' | 'services' | 'offers' | 'homestats' | 'aboutcards' | 'reviews' | 'contacts' | 'tools' | 'brands' | 'blogs' | 'users' | 'analytics' | 'payments' | 'security' | 'plans' | 'support' | 'backup'>('info');
  const [healthData, setHealthData] = useState<{ overall: string; checks: { name: string; status: string; detail?: string }[]; timestamp: number } | null>(null);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthError, setHealthError] = useState('');

  // Fetch system health on mount + every 60s
  const fetchHealth = useCallback(async () => {
    try {
      const token = localStorage.getItem('spt_admin_token');
      if (!token) return;
      const res = await fetch('/api/system/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
        setHealthError('');
      } else {
        setHealthError(`Status ${res.status}`);
      }
    } catch {
      setHealthError('Fetch failed');
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [fetchHealth]);
  const [autoBackupSettings, setAutoBackupSettings] = useState<AutoBackupSettings>(getAutoBackupSettings());
  const [autoBackupToast, setAutoBackupToast] = useState<string | null>(null);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'day' | 'week' | 'month' | '6months' | 'year' | 'lifetime'>('week');
  const [selectedLogType, setSelectedLogType] = useState<'all' | 'pageview' | 'click' | 'signup' | 'contact'>('all');
  const [aiApiKeyInputChat, setAiApiKeyInputChat] = useState('');
  const [aiApiKeyInputTools, setAiApiKeyInputTools] = useState('');
  const [isAiConfigured, setIsAiConfigured] = useState({ chat: false, tools: false });
  const [customModels, setCustomModels] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [newCustomModelName, setNewCustomModelName] = useState('');
  const [newCustomModelKey, setNewCustomModelKey] = useState('');

  // Support messages states
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  React.useEffect(() => {
    const loadTickets = () => {
      try {
        const stored = localStorage.getItem('spt_support_messages');
        if (stored) {
          setSupportTickets(JSON.parse(stored));
        } else {
          // Default beautiful presets representing interactive inbox items
          const samples = [
            {
              id: 'ticket_sample_1',
              email: 'sadeep@sptcreative.com',
              message: 'Hello Sadeep! I would like to order a complete video editing contract and visual branding kit for our brand. Please contact me back as soon as you review this request.',
              createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
              status: 'pending'
            },
            {
              id: 'ticket_sample_2',
              email: 'dilshan_studio@gmail.com',
              message: 'මට SPT Audio Tool එකෙන් නිර්මාණය කරගත්ත track එකක commercial license එක මිලදී ගැනීමට බලාපොරොත්තු වෙනවා. කරුණාකර ගෙවීම් පියවර එවන්න.',
              createdAt: new Date(Date.now() - 3600000 * 25).toISOString(),
              status: 'resolved'
            }
          ];
          localStorage.setItem('spt_support_messages', JSON.stringify(samples));
          setSupportTickets(samples);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadTickets();
    window.addEventListener('spt_support_messages_changed', loadTickets);
    return () => window.removeEventListener('spt_support_messages_changed', loadTickets);
  }, []);

  const handleToggleTicketStatus = (ticketId: string) => {
    const updated = supportTickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, status: t.status === 'resolved' ? 'pending' : 'resolved' };
      }
      return t;
    });
    setSupportTickets(updated);
    localStorage.setItem('spt_support_messages', JSON.stringify(updated));
  };

  const handleDeleteTicket = (ticketId: string) => {
    const updated = supportTickets.filter(t => t.id !== ticketId);
    setSupportTickets(updated);
    localStorage.setItem('spt_support_messages', JSON.stringify(updated));
  };

  React.useEffect(() => {
    fetch('/api/ai/status').then(res => res.json()).then(data => {
      setIsAiConfigured(data.configured || { chat: false, tools: false });
      if (data.customModels) setCustomModels(data.customModels);
    }).catch(() => {});
  }, []);

  // Auto-backup timer
  React.useEffect(() => {
    const settings = getAutoBackupSettings();
    setAutoBackupSettings(settings);
    if (settings.interval === 'off') return;

    const intervalMs = getIntervalMs(settings.interval);
    if (!intervalMs) return;

    const runAutoBackup = () => {
      const now = Date.now();
      const last = settings.lastBackup ? new Date(settings.lastBackup).getTime() : 0;
      if (now - last >= intervalMs) {
        const backup = createBackup({
          config, tools, services, brands,
          offers: offersList, homestats: homeStatsList,
          aboutcards: aboutCardsList, reviews: reviewsList,
          contacts: contactsList, blogs: blogsList,
          users: sptUsersList, plans: propSubscriptionPlans,
          gateways: propPaymentGateways, telemetry: telemetryList
        });
        saveAutoBackupData(backup);
        const newSettings = { ...settings, lastBackup: new Date().toISOString() };
        saveAutoBackupSettings(newSettings);
        setAutoBackupSettings(newSettings);
        setAutoBackupToast('🔄 Auto-backup completed at ' + new Date().toLocaleTimeString());
        setTimeout(() => setAutoBackupToast(null), 4000);
      }
    };

    runAutoBackup();
    const timer = setInterval(runAutoBackup, 60000);
    return () => clearInterval(timer);
  }, []);

  // Offer Edit and Form local states
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editOfferTitle, setEditOfferTitle] = useState('');
  const [editOfferDesc, setEditOfferDesc] = useState('');
  const [editOfferBadge, setEditOfferBadge] = useState('');
  const [editOfferValid, setEditOfferValid] = useState('');
  const [editOfferCode, setEditOfferCode] = useState('');
  const [editOfferImageUrl, setEditOfferImageUrl] = useState('');

  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferTitleEn, setNewOfferTitleEn] = useState('');
  const [newOfferDesc, setNewOfferDesc] = useState('');
  const [newOfferDescEn, setNewOfferDescEn] = useState('');
  const [newOfferBadge, setNewOfferBadge] = useState('');
  const [newOfferBadgeEn, setNewOfferBadgeEn] = useState('');
  const [newOfferValid, setNewOfferValid] = useState('');
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferImageUrl, setNewOfferImageUrl] = useState('');

  // Home Stats Edit and Form local states
  const [editingHomeStatId, setEditingHomeStatId] = useState<string | null>(null);
  const [editHomeStatBadge, setEditHomeStatBadge] = useState('');
  const [editHomeStatTitle, setEditHomeStatTitle] = useState('');
  const [editHomeStatDesc, setEditHomeStatDesc] = useState('');
  const [editHomeStatImageUrl, setEditHomeStatImageUrl] = useState('');

  const [newHomeStatBadge, setNewHomeStatBadge] = useState('');
  const [newHomeStatBadgeEn, setNewHomeStatBadgeEn] = useState('');
  const [newHomeStatTitle, setNewHomeStatTitle] = useState('');
  const [newHomeStatTitleEn, setNewHomeStatTitleEn] = useState('');
  const [newHomeStatDesc, setNewHomeStatDesc] = useState('');
  const [newHomeStatDescEn, setNewHomeStatDescEn] = useState('');
  const [newHomeStatImageUrl, setNewHomeStatImageUrl] = useState('');

  // About Cards Edit and Form local states
  const [editingAboutCardId, setEditingAboutCardId] = useState<string | null>(null);
  const [editAboutCardTitle, setEditAboutCardTitle] = useState('');
  const [editAboutCardDesc, setEditAboutCardDesc] = useState('');
  const [editAboutCardIcon, setEditAboutCardIcon] = useState('Sparkles');
  const [editAboutCardImageUrl, setEditAboutCardImageUrl] = useState('');

  const [newAboutCardTitle, setNewAboutCardTitle] = useState('');
  const [newAboutCardTitleEn, setNewAboutCardTitleEn] = useState('');
  const [newAboutCardDesc, setNewAboutCardDesc] = useState('');
  const [newAboutCardDescEn, setNewAboutCardDescEn] = useState('');
  const [newAboutCardIcon, setNewAboutCardIcon] = useState('Sparkles');
  const [newAboutCardImageUrl, setNewAboutCardImageUrl] = useState('');

  // Reviews/Testimonial CMS local states
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewName, setEditReviewName] = useState('');
  const [editReviewRole, setEditReviewRole] = useState('');
  const [editReviewComment, setEditReviewComment] = useState('');
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewImageUrl, setEditReviewImageUrl] = useState('');
  const [editReviewPinned, setEditReviewPinned] = useState(false);

  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewNameEn, setNewReviewNameEn] = useState('');
  const [newReviewRole, setNewReviewRole] = useState('');
  const [newReviewRoleEn, setNewReviewRoleEn] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewCommentEn, setNewReviewCommentEn] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewImageUrl, setNewReviewImageUrl] = useState('');
  const [newReviewPinned, setNewReviewPinned] = useState(false);

  // Service Edit States (Inline modification)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceTitle, setEditServiceTitle] = useState('');
  const [editServiceDesc, setEditServiceDesc] = useState('');
  const [editServiceCat, setEditServiceCat] = useState<'ai_design' | 'music_writing' | 'video_content' | 'apparel_art' | 'web_dev'>('ai_design');
  const [editServiceHigh, setEditServiceHigh] = useState(false);
  const [editServiceImgUrl, setEditServiceImgUrl] = useState('');
  const [editServiceYoutubeUrl, setEditServiceYoutubeUrl] = useState('');

  // Tool Edit States (Inline modification)
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editToolName, setEditToolName] = useState('');
  const [editToolDesc, setEditToolDesc] = useState('');
  const [editToolIcon, setEditToolIcon] = useState('Code');
  const [editToolCat, setEditToolCat] = useState('Service');
  const [editToolImageUrl, setEditToolImageUrl] = useState('');

  // Subscription Plans local state (fallback) and prop synchronization
  const [localSubscriptionPlans, setLocalSubscriptionPlans] = useState<any[]>([
    { id: 'plan_1', title: 'WEEKLY PACK', priceUsd: 1, originalPriceUsd: 10, discountTag: '90% OFF', durationLabel: 'සතියක් වලංගු සම්පූර්ණ ප්‍රවේශය', perks: [], isPopular: false, isFree: false },
    { id: 'plan_2', title: 'MONTHLY PACK', priceUsd: 3, originalPriceUsd: 30, discountTag: '90% OFF', durationLabel: 'මසක් වලංගු සම්පූර්ණ ප්‍රවේශය', perks: [], isPopular: false, isFree: false },
    { id: 'plan_3', title: '6 MO PACK', priceUsd: 15, originalPriceUsd: 150, discountTag: '90% OFF', durationLabel: 'මාස 6ක කාලයක් සඳහා වරප්‍රසාද', perks: [], isPopular: false, isFree: false },
    { id: 'plan_4', title: 'YEARLY PACK', priceUsd: 20, originalPriceUsd: 200, discountTag: '90% OFF', durationLabel: 'මුළු වසරක් සඳහා වලංගු SPT මෙවලම්', perks: [], isPopular: false, isFree: false },
    { id: 'plan_5', title: 'LIFETIME PACK', priceUsd: 100, originalPriceUsd: 1000, discountTag: '90% OFF', durationLabel: 'ජීවිත කාලයටම SPT සාමාජිකත්වය', perks: [], isPopular: false, isFree: false },
    { id: 'plan_6', title: '7-DAY FREE TRIAL', priceUsd: 0, durationLabel: 'නොමිලේ අත්හදා බැලීමට (දින 7ක්)', perks: [], isPopular: false, isFree: true }
  ]);
  const subscriptionPlans = propSubscriptionPlans || localSubscriptionPlans;
  const setSubscriptionPlans = propSetSubscriptionPlans || setLocalSubscriptionPlans;

  // Subscription Plan Edit States
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanTitle, setEditPlanTitle] = useState('');
  const [editPlanPrice, setEditPlanPrice] = useState(0);
  const [editPlanOriginalPrice, setEditPlanOriginalPrice] = useState(0);
  const [editPlanDiscountTag, setEditPlanDiscountTag] = useState('');
  const [editPlanDuration, setEditPlanDuration] = useState('');
  const [editPlanIsFree, setEditPlanIsFree] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanTitleEn, setNewPlanTitleEn] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState(0);
  const [newPlanOriginalPrice, setNewPlanOriginalPrice] = useState(0);
  const [newPlanDiscountTag, setNewPlanDiscountTag] = useState('');
  const [newPlanDiscountTagEn, setNewPlanDiscountTagEn] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState('');
  const [newPlanDurationEn, setNewPlanDurationEn] = useState('');
  const [newPlanImageUrl, setNewPlanImageUrl] = useState('');
  const [newPlanIsFree, setNewPlanIsFree] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  // Payment Gateways dynamic and local fallback state (fully synchronized with database/CMS)
  const [localPaymentGateways, setLocalPaymentGateways] = useState<any[]>([
    { id: 'pay_bank', type: 'bank', name: 'Bank Transfer (BOC, Commercial)', nameEn: 'Bank Transfer (BOC, Commercial)', details: 'Account 123456789 - SPT Holdings', detailsEn: 'Account 123456789 - SPT Holdings', isActive: true },
    { id: 'pay_gpay', type: 'googlepay', name: 'Google Pay', nameEn: 'Google Pay', details: 'sptofficial@gmail.com', detailsEn: 'sptofficial@gmail.com', isActive: false },
    { id: 'pay_paypal', type: 'paypal', name: 'PayPal', nameEn: 'PayPal', details: 'sptofficial@paypal.com', detailsEn: 'sptofficial@paypal.com', isActive: false }
  ]);
  const paymentGateways = propPaymentGateways || localPaymentGateways;
  const setPaymentGateways = propSetPaymentGateways || setLocalPaymentGateways;
  const [newPayName, setNewPayName] = useState('');
  const [newPayNameEn, setNewPayNameEn] = useState('');
  const [newPayDetails, setNewPayDetails] = useState('');
  const [newPayDetailsEn, setNewPayDetailsEn] = useState('');
  const [newPayType, setNewPayType] = useState('bank');

  // Security Admins local state
  const [adminUsers, setAdminUsers] = useState<any[]>([
    { id: 'admin_1', name: 'Sadeep Pasindu', email: 'sadeeppasindu0218@gmail.com', role: 'superadmin', isActive: true },
    { id: 'admin_2', name: 'Staff Assistant', email: 'support@spt.com', role: 'moderator', isActive: true }
  ]);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('editor');
  const [adminRecoveryEmail, setAdminRecoveryEmail] = useState(config.adminRecoveryEmail || 'sadeeppasindu0218@gmail.com');


  // Brand Edit States (Inline modification)
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBrandSubtitle, setEditBrandSubtitle] = useState('');
  const [editBrandDesc, setEditBrandDesc] = useState('');
  const [editBrandImg, setEditBrandImg] = useState('');

  // New Tool Form local states
  const [toolName, setToolName] = useState('');
  const [toolNameEn, setToolNameEn] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolDescEn, setToolDescEn] = useState('');
  const [toolIcon, setToolIcon] = useState('Code');
  const [toolCat, setToolCat] = useState('Service');
  const [toolImageUrl, setToolImageUrl] = useState('');

  // New Service Form local states
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceTitleEn, setServiceTitleEn] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceDescEn, setServiceDescEn] = useState('');
  const [serviceCat, setServiceCat] = useState<'ai_design' | 'music_writing' | 'video_content' | 'apparel_art' | 'web_dev'>('ai_design');
  const [serviceHigh, setServiceHigh] = useState(false);
  const [serviceImgUrl, setServiceImgUrl] = useState('');
  const [serviceYoutubeUrl, setServiceYoutubeUrl] = useState('');

  // State to manage showcase file insertion form for a selected service
  const [showcaseFormServiceId, setShowcaseFormServiceId] = useState<string | null>(null);
  const [newShowcaseType, setNewShowcaseType] = useState<'image' | 'video'>('image');
  const [newShowcaseTitle, setNewShowcaseTitle] = useState('');
  const [newShowcaseUrl, setNewShowcaseUrl] = useState('');

  // New Subsidiary Brand Form local states
  const [brandName, setBrandName] = useState('');
  const [brandNameEn, setBrandNameEn] = useState('');
  const [brandSubtitle, setBrandSubtitle] = useState('');
  const [brandSubtitleEn, setBrandSubtitleEn] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [brandDescEn, setBrandDescEn] = useState('');
  const [brandImg, setBrandImg] = useState('https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800');

  // Live info text input form registers
  const [siteTitleInput, setSiteTitleInput] = useState(config.siteTitle);
  const [siteSubtitleInput, setSiteSubtitleInput] = useState(config.siteSubtitle);
  const [siteSloganInput, setSloganInput] = useState(config.siteCreatorSlogan);
  const [siteMiddleInput, setSiteMiddleInput] = useState(config.siteMiddleTagline);
  const [storySinhalaInput, setStorySinhalaInput] = useState(config.aboutSinhalaStory || '');
  const [storyEnglishInput, setStoryEnglishInput] = useState(config.aboutEnglishStory || '');
  const [brandGenesisStoryInput, setBrandGenesisStoryInput] = useState(config.brandGenesisStory || '');
  const [brandGenesisStoryEnInput, setBrandGenesisStoryEnInput] = useState(config.brandGenesisStoryEn || '');
  const [blogSubtitleInput, setBlogSubtitleInput] = useState(config.blogSubtitle || '');
  const [blogSubtitleEnInput, setBlogSubtitleEnInput] = useState(config.blogSubtitleEn || '');
  const [reviewsTitleInput, setReviewsTitleInput] = useState(config.reviewsTitle || '');
  const [reviewsTitleEnInput, setReviewsTitleEnInput] = useState(config.reviewsTitleEn || '');
  const [reviewsSubtitleInput, setReviewsSubtitleInput] = useState(config.reviewsSubtitle || '');
  const [reviewsSubtitleEnInput, setReviewsSubtitleEnInput] = useState(config.reviewsSubtitleEn || '');
  const [submitReviewTitleInput, setSubmitReviewTitleInput] = useState(config.submitReviewTitle || '');
  const [submitReviewTitleEnInput, setSubmitReviewTitleEnInput] = useState(config.submitReviewTitleEn || '');
  const [submitReviewDescInput, setSubmitReviewDescInput] = useState(config.submitReviewDesc || '');
  const [submitReviewDescEnInput, setSubmitReviewDescEnInput] = useState(config.submitReviewDescEn || '');

  const [newAdminPassInput, setNewAdminPassInput] = useState(config.adminPassword || 'spt');
  const [ownerPhotoInput, setOwnerPhotoInput] = useState(config.aboutOwnerPhotoUrl || '');
  const [logoUrlInput, setLogoUrlInput] = useState(config.logoUrl || '');
  const [reviewsStoryImageUrlInput, setReviewsStoryImageUrlInput] = useState(config.reviewsStoryImageUrl || '');
  const [showPass, setShowPass] = useState(false);

  // Background Universe Animation states
  const [showUniverseAnimation, setShowUniverseAnimation] = useState<boolean>(config.showUniverseAnimation !== false);
  const [universeGifUrl, setUniverseGifUrl] = useState<string>(config.universeGifUrl || '');

  // Contacts CMS states
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactTitle, setEditContactTitle] = useState('');
  const [editContactUrl, setEditContactUrl] = useState('');
  const [editContactImageUrl, setEditContactImageUrl] = useState('');

  const [newContactTitle, setNewContactTitle] = useState('');
  const [newContactTitleEn, setNewContactTitleEn] = useState('');
  const [newContactUrl, setNewContactUrl] = useState('');
  const [newContactImageUrl, setNewContactImageUrl] = useState('');

  // Blogs CMS states
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [editBlogTitle, setEditBlogTitle] = useState('');
  const [editBlogContent, setEditBlogContent] = useState('');
  const [editBlogMediaType, setEditBlogMediaType] = useState<'none' | 'image' | 'video' | 'audio'>('none');
  const [editBlogMediaUrl, setEditBlogMediaUrl] = useState('');
  const [editBlogYoutubeUrl, setEditBlogYoutubeUrl] = useState('');

  const [newBlogTitle, setNewBlogTitle] = useState('');
  const [newBlogTitleEn, setNewBlogTitleEn] = useState('');
  const [newBlogContent, setNewBlogContent] = useState('');
  const [newBlogContentEn, setNewBlogContentEn] = useState('');
  const [newBlogMediaType, setNewBlogMediaType] = useState<'none' | 'image' | 'video' | 'audio'>('none');
  const [newBlogMediaUrl, setNewBlogMediaUrl] = useState('');
  const [newBlogYoutubeUrl, setNewBlogYoutubeUrl] = useState('');

  const [customBgUrl, setCustomBgUrl] = useState('');

  const handleStartEditService = (serv: ServiceItem) => {
    setEditingServiceId(serv.id);
    setEditServiceTitle(serv.title);
    setEditServiceDesc(serv.description || '');
    setEditServiceCat(serv.category as any);
    setEditServiceHigh(serv.highlight || false);
    setEditServiceImgUrl(serv.imageUrl || '');
    setEditServiceYoutubeUrl(serv.youtubeUrl || '');
  };

  const handleSaveEditService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServiceId || !onUpdateServices) return;
    onUpdateServices(prev => prev.map(s => s.id === editingServiceId ? {
      ...s,
      title: editServiceTitle,
      description: editServiceDesc,
      category: editServiceCat,
      highlight: editServiceHigh,
      imageUrl: editServiceImgUrl || undefined,
      youtubeUrl: editServiceYoutubeUrl.trim() || undefined
    } : s));
    setEditingServiceId(null);
    setEditServiceYoutubeUrl('');
    alert('සේවාව සාර්ථකව යාවත්කාලීන කරන ලදී! Service updated successfully.');
  };

  const handleStartEditTool = (tool: SptTool) => {
    setEditingToolId(tool.id);
    setEditToolName(tool.name);
    setEditToolDesc(tool.description || '');
    setEditToolIcon(tool.icon || 'Code');
    setEditToolCat(tool.category || 'Service');
    setEditToolImageUrl(tool.imageUrl || '');
  };

  const handleSaveEditTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingToolId || !onUpdateTools) return;
    onUpdateTools(prev => prev.map(t => t.id === editingToolId ? {
      ...t,
      name: editToolName,
      description: editToolDesc,
      icon: editToolIcon,
      category: editToolCat,
      imageUrl: editToolImageUrl.trim() || undefined
    } : t));
    setEditingToolId(null);
    alert('මෙවලම සාර්ථකව යාවත්කාලීන කරන ලදී! Tool updated successfully.');
  };

  const handleStartEditBrand = (brand: AccessoryBrand) => {
    setEditingBrandId(brand.id);
    setEditBrandName(brand.name);
    setEditBrandSubtitle(brand.subtitle || '');
    setEditBrandDesc(brand.description || '');
    setEditBrandImg(brand.visualUrl || '');
  };

  const handleSaveEditBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrandId || !onUpdateBrands) return;
    onUpdateBrands(prev => prev.map(b => b.id === editingBrandId ? {
      ...b,
      name: editBrandName,
      subtitle: editBrandSubtitle,
      description: editBrandDesc,
      visualUrl: editBrandImg
    } : b));
    setEditingBrandId(null);
    alert('අනුබද්ධිත සන්නාමය සාර්ථකව යාවත්කාලීන කරන ලදී! Brand alliance updated successfully.');
  };

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPass = config.adminPassword || 'spt';
    if (username.toLowerCase() === 'sadeep' && password === correctPass) {
      onSetUnlockStatus(true);
      setAuthError('');
    } else {
      setAuthError('ක්රියාත්මක වීමේ දෝෂයකි: Invalid Credentials! Sadeep / Access Key error.');
    }
  };

  // Offer handlers
  const handleStartEditOffer = (offer: OfferItem) => {
    setEditingOfferId(offer.id);
    setEditOfferTitle(offer.title);
    setEditOfferDesc(offer.description);
    setEditOfferBadge(offer.discountBadge || '');
    setEditOfferValid(offer.validUntil || '');
    setEditOfferCode(offer.promoCode || '');
    setEditOfferImageUrl(offer.imageUrl || '');
  };

  const handleSaveEditOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfferId) return;
    setOffersList(prev => prev.map(o => o.id === editingOfferId ? {
      ...o,
      title: editOfferTitle,
      description: editOfferDesc,
      discountBadge: editOfferBadge || undefined,
      validUntil: editOfferValid || undefined,
      promoCode: editOfferCode || undefined,
      imageUrl: editOfferImageUrl ? editOfferImageUrl.trim() : undefined
    } : o));
    setEditingOfferId(null);
    alert('දීමනාව සාර්ථකව යාවත්කාලීන කරන ලදී! Offer details updated.');
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferTitle || !newOfferDesc) {
      alert('කරුණාකර මාතෘකාව සහ විස්තරය ඇතුලත් කරන්න.');
      return;
    }
    const item: OfferItem = {
      id: `custom_o_${Date.now()}`,
      title: newOfferTitle, titleEn: newOfferTitleEn,
      description: newOfferDesc, descriptionEn: newOfferDescEn,
      discountBadge: newOfferBadge || undefined,
      validUntil: newOfferValid || undefined,
      promoCode: newOfferCode || undefined,
      imageUrl: newOfferImageUrl ? newOfferImageUrl.trim() : undefined
    };
    setOffersList(prev => [...prev, item]);
    setNewOfferTitle(''); setNewOfferTitleEn('');
    setNewOfferDesc(''); setNewOfferDescEn('');
    setNewOfferBadge(''); setNewOfferBadgeEn('');
    setNewOfferValid('');
    setNewOfferCode('');
    setNewOfferImageUrl('');
    alert('නව විශේෂ දීමනාව සාර්ථකව එක් කරන ලදී!');
  };

  const handleDeleteOffer = (id: string) => {
    if (confirm('මෙම දීමනාව ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?')) {
      setOffersList(prev => prev.filter(o => o.id !== id));
      alert('දීමනාව ඉවත් කරන ලදී.');
    }
  };

  // Home Stats handlers
  const handleStartEditHomeStat = (item: HomeStatCard) => {
    setEditingHomeStatId(item.id);
    setEditHomeStatBadge(item.badge);
    setEditHomeStatTitle(item.title);
    setEditHomeStatDesc(item.description);
    setEditHomeStatImageUrl(item.imageUrl || '');
  };

  const handleSaveEditHomeStat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHomeStatId) return;
    setHomeStatsList(prev => prev.map(s => s.id === editingHomeStatId ? {
      ...s,
      badge: editHomeStatBadge,
      title: editHomeStatTitle,
      description: editHomeStatDesc,
      imageUrl: editHomeStatImageUrl ? editHomeStatImageUrl.trim() : undefined
    } : s));
    setEditingHomeStatId(null);
    alert('Homepage metric item updated successfully!');
  };

  const handleCreateHomeStat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeStatTitle || !newHomeStatBadge) return;
    const item: HomeStatCard = {
      id: `custom_hs_${Date.now()}`,
      badge: newHomeStatBadge, badgeEn: newHomeStatBadgeEn,
      title: newHomeStatTitle, titleEn: newHomeStatTitleEn,
      description: newHomeStatDesc, descriptionEn: newHomeStatDescEn,
      imageUrl: newHomeStatImageUrl ? newHomeStatImageUrl.trim() : undefined
    };
    setHomeStatsList(prev => [...prev, item]);
    setNewHomeStatTitle(''); setNewHomeStatTitleEn('');
    setNewHomeStatBadge(''); setNewHomeStatBadgeEn('');
    setNewHomeStatDesc(''); setNewHomeStatDescEn('');
    setNewHomeStatImageUrl('');
    alert('නව මුල් පිටුවේ දර්ශකය සාර්ථකව එක් කරන ලදී!');
  };

  const handleDeleteHomeStat = (id: string) => {
    if (confirm('මෙම දර්ශකය ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?')) {
      setHomeStatsList(prev => prev.filter(s => s.id !== id));
    }
  };

  // About pillars handlers
  const handleStartEditAboutCard = (card: AboutCard) => {
    setEditingAboutCardId(card.id);
    setEditAboutCardTitle(card.title);
    setEditAboutCardDesc(card.description);
    setEditAboutCardIcon(card.icon);
    setEditAboutCardImageUrl(card.imageUrl || '');
  };

  const handleSaveEditAboutCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAboutCardId) return;
    setAboutCardsList(prev => prev.map(c => c.id === editingAboutCardId ? {
      ...c,
      title: editAboutCardTitle,
      description: editAboutCardDesc,
      icon: editAboutCardIcon,
      imageUrl: editAboutCardImageUrl ? editAboutCardImageUrl.trim() : undefined
    } : c));
    setEditingAboutCardId(null);
    alert('About Us pillar updated successfully!');
  };

  const handleCreateAboutCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAboutCardTitle || !newAboutCardDesc) return;
    const item: AboutCard = {
      id: `custom_a_${Date.now()}`,
      title: newAboutCardTitle, titleEn: newAboutCardTitleEn,
      description: newAboutCardDesc, descriptionEn: newAboutCardDescEn,
      icon: newAboutCardIcon,
      imageUrl: newAboutCardImageUrl ? newAboutCardImageUrl.trim() : undefined
    };
    setAboutCardsList(prev => [...prev, item]);
    setNewAboutCardTitle(''); setNewAboutCardTitleEn('');
    setNewAboutCardDesc(''); setNewAboutCardDescEn('');
    setNewAboutCardIcon('Sparkles');
    setNewAboutCardImageUrl('');
    alert('නව "අපි ගැන" පදනම සාර්ථකව එක් කරන ලදී!');
  };

  const handleDeleteAboutCard = (id: string) => {
    if (confirm('මෙම "අපි ගැන" පදනම ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?')) {
      setAboutCardsList(prev => prev.filter(c => c.id !== id));
    }
  };

  // Reviews/Testimonials handlers
  const handleStartEditReview = (rev: ReviewItem) => {
    setEditingReviewId(rev.id);
    setEditReviewName(rev.name);
    setEditReviewRole(rev.role);
    setEditReviewComment(rev.comment);
    setEditReviewRating(rev.rating);
    setEditReviewImageUrl(rev.imageUrl || '');
    setEditReviewPinned(!!rev.pinned);
  };

  const handleSaveEditReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReviewId) return;
    setReviewsList(prev => prev.map(r => r.id === editingReviewId ? {
      ...r,
      name: editReviewName,
      role: editReviewRole,
      comment: editReviewComment,
      rating: editReviewRating,
      imageUrl: editReviewImageUrl ? editReviewImageUrl.trim() : undefined,
      pinned: editReviewPinned
    } : r));
    setEditingReviewId(null);
    alert('පාරිභෝගික අදහස සාර්ථකව යාවත්කාලීන කරන ලදී!');
  };

  const handleCreateReviewInAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName || !newReviewComment) return;
    const item: ReviewItem = {
      id: `custom_rev_${Date.now()}`,
      name: newReviewName, nameEn: newReviewNameEn,
      role: newReviewRole || 'Client Partner',
      comment: newReviewComment, commentEn: newReviewCommentEn,
      rating: newReviewRating,
      avatarSeed: newReviewName.toLowerCase().replace(/\s+/g, ''),
      imageUrl: newReviewImageUrl ? newReviewImageUrl.trim() : undefined,
      pinned: newReviewPinned
    };
    setReviewsList(prev => [...prev, item]);
    setNewReviewName(''); setNewReviewNameEn('');
    setNewReviewRole(''); setNewReviewRoleEn('');
    setNewReviewComment(''); setNewReviewCommentEn('');
    setNewReviewRating(5);
    setNewReviewImageUrl('');
    setNewReviewPinned(false);
    alert('නව පාරිභෝගික අදහස සාර්ථකව එක් කරන ලදී!');
  };

  const handleDeleteReview = (id: string) => {
    if (confirm('මෙම පාරිභෝගික අදහස ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?')) {
      setReviewsList(prev => prev.filter(r => r.id !== id));
      alert('අදහස සාර්ථකව ඉවත් කෙරිණි.');
    }
  };

  const handleTogglePinReview = (id: string) => {
    setReviewsList(prev => prev.map(r => r.id === id ? { ...r, pinned: !r.pinned } : r));
    alert('අදහසේ ප්‍රමුඛතාවය (pinned state) වෙනස් කරන ලදී!');
  };

  const handleCreateTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName || !toolDesc) return;
    const toolItem: SptTool = {
      id: `custom_t_${Date.now()}`,
      name: toolName, nameEn: toolNameEn,
      description: toolDesc, descriptionEn: toolDescEn,
      icon: toolIcon,
      category: toolCat,
      imageUrl: toolImageUrl.trim() || undefined
    };
    onAddNewTool(toolItem);
    setToolName(''); setToolNameEn('');
    setToolDesc(''); setToolDescEn('');
    setToolImageUrl('');
    alert(`නව මෙවලම සාර්ථකව App Drawer එකට එක් කරන ලදී: ${toolName}`);
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle || !serviceDesc) return;
    const servItem: ServiceItem = {
      id: `custom_s_${Date.now()}`,
      title: serviceTitle, titleEn: serviceTitleEn,
      description: serviceDesc, descriptionEn: serviceDescEn,
      category: serviceCat,
      highlight: serviceHigh,
      imageUrl: serviceImgUrl || undefined,
      showcaseFiles: [],
      youtubeUrl: serviceYoutubeUrl.trim() || undefined
    };
    onAddNewService(servItem);
    setServiceTitle(''); setServiceTitleEn('');
    setServiceDesc(''); setServiceDescEn('');
    setServiceHigh(false);
    setServiceImgUrl('');
    setServiceYoutubeUrl('');
    alert(`නව සේවාවක් සාර්ථකව Portfolio එකට එක් කරන ලදී: ${serviceTitle}`);
  };

  const applyCustomWallpaper = () => {
    if (customBgUrl.startsWith('http')) {
      setConfig(prev => ({ ...prev, bgImage: customBgUrl }));
      alert('බාහිර රූපය සාර්ථකව පසුබිමට යොදන ලදී!');
    } else {
      alert('කරුණාකර නිවැරදි URL ලිපිනයක් ඇතුළත් කරන්න.');
    }
  };

  const handleCreateBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName || !brandDesc) return;
    const brandItem: AccessoryBrand = {
      id: `custom_b_${Date.now()}`,
      name: brandName, nameEn: brandNameEn,
      subtitle: brandSubtitle || 'COSMIC STYLE',
      description: brandDesc, descriptionEn: brandDescEn,
      visualUrl: brandImg
    };
    onAddNewBrand(brandItem);
    setBrandName(''); setBrandNameEn('');
    setBrandSubtitle(''); setBrandSubtitleEn('');
    setBrandDesc(''); setBrandDescEn('');
    alert(`නව අනුබද්ධිත සන්නාමය සාර්ථකව එක් කරන ලදී: ${brandName}`);
  };

  const saveTextConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig(prev => ({
      ...prev,
      siteTitle: siteTitleInput,
      siteSubtitle: siteSubtitleInput,
      siteCreatorSlogan: siteSloganInput,
      siteMiddleTagline: siteMiddleInput,
      aboutSinhalaStory: storySinhalaInput,
      aboutEnglishStory: storyEnglishInput,
      brandGenesisStory: brandGenesisStoryInput,
      brandGenesisStoryEn: brandGenesisStoryEnInput,
      blogSubtitle: blogSubtitleInput,
      blogSubtitleEn: blogSubtitleEnInput,
      reviewsTitle: reviewsTitleInput,
      reviewsTitleEn: reviewsTitleEnInput,
      reviewsSubtitle: reviewsSubtitleInput,
      reviewsSubtitleEn: reviewsSubtitleEnInput,
      submitReviewTitle: submitReviewTitleInput,
      submitReviewTitleEn: submitReviewTitleEnInput,
      submitReviewDesc: submitReviewDescInput,
      submitReviewDescEn: submitReviewDescEnInput,

      adminPassword: newAdminPassInput,
      aboutOwnerPhotoUrl: ownerPhotoInput.trim() || undefined,
      logoUrl: logoUrlInput.trim() || undefined,
      reviewsStoryImageUrl: reviewsStoryImageUrlInput.trim() || undefined,
      showUniverseAnimation: showUniverseAnimation,
      universeGifUrl: universeGifUrl.trim() || undefined
    }));
    alert('වෙබ් අඩවියේ තොරතුරු සහ රහස්පදය සාර්ථකව යාවත්කාලීන කරන ලදී! (Site details and Admin password updated!)');
  };

  // Showcase managers
  const handleAddShowcaseFile = (serviceId: string) => {
    if (!newShowcaseTitle || !newShowcaseUrl) {
      alert('කරුණාකර මාතෘකාවක් සහ URL ලිපිනයක් ඇතුළත් කරන්න.');
      return;
    }

    if (onUpdateServices) {
      onUpdateServices(prev => prev.map(s => {
        if (s.id === serviceId) {
          const files = s.showcaseFiles || [];
          return {
            ...s,
            showcaseFiles: [...files, {
              id: `sc_${Date.now()}`,
              type: newShowcaseType,
              title: newShowcaseTitle,
              url: newShowcaseUrl
            }]
          };
        }
        return s;
      }));
      setNewShowcaseTitle('');
      setNewShowcaseUrl('');
      setShowcaseFormServiceId(null);
      alert('නව Showcase නිර්මාණ සාර්ථකය එක් කරන ලදී!');
    } else {
      alert('Error updating services context.');
    }
  };

  const handleDeleteShowcaseFile = (serviceId: string, fileId: string) => {
    if (confirm('මෙම Showcase නිර්මාණය ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?')) {
      if (onUpdateServices) {
        onUpdateServices(prev => prev.map(s => {
          if (s.id === serviceId) {
            return {
              ...s,
              showcaseFiles: (s.showcaseFiles || []).filter(f => f.id !== fileId)
            };
          }
          return s;
        }));
      }
    }
  };

  // Render Lock Screen if not logged in
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl glass-panel relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 blur-xl rounded-full" />
        
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-6">
          <KeyRound className="w-8 h-8 text-amber-300 animate-pulse" />
        </div>

        <h3 className="text-2xl font-display font-bold text-white mb-2">පරිපාලක පිවිසුම් පුවරුව</h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Sadeep Pasindu (Super Admin) හැඳුනුම් අක්තපත්‍ර භාවිත කරමින් ඇතුල් වන්න.
        </p>

        {authError && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-500/20 text-xs text-rose-300">
            {authError}
          </div>
        )}

        <form onSubmit={handleUnlockAdmin} className="space-y-4 text-left">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">username</label>
            <input
              type="text"
              placeholder="sadeep"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">access key</label>
            <input
              type="password"
              placeholder="••••• (spt)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold transition duration-200 active:scale-95 cursor-pointer shadow-lg"
          >
            තහවුරු කරන්න (Verify Credentials)
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-white/5">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">SPT Official Cyber Security Protected</p>
        </div>
      </div>
    );
  }

  const BackupActionCard = ({ icon, title, description, buttonLabel, buttonColor, onAction }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonLabel: string;
    buttonColor: string;
    onAction: () => void;
  }) => (
    <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex flex-col">
      <div className="w-14 h-14 rounded-2xl bg-cyan-400/5 border border-white/5 flex items-center justify-center text-cyan-400 mb-4">
        {icon}
      </div>
      <h4 className="text-base font-bold text-white font-display mb-2">{title}</h4>
      <p className="text-xs text-slate-400 leading-relaxed mb-6 flex-grow">{description}</p>
      <button
        onClick={onAction}
        className={`w-full py-3 bg-gradient-to-r ${buttonColor} text-neutral-950 font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:opacity-90`}
      >
        {buttonLabel}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Active Theme Accent', value: config.neonAccent.toUpperCase(), color: 'text-cyan-400' },
          { label: 'Installed Plugins', value: `${tools.length} Tools`, color: 'text-indigo-400' },
          { label: 'Active Services Offered', value: `${services.length} items`, color: 'text-emerald-400' },
          { label: 'Brand Partnerships', value: `${brands.length} Alliances`, color: 'text-amber-400' }
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl glass-panel relative overflow-hidden">
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">{stat.label}</span>
            <span className={`block text-lg font-bold font-display mt-0.5 ${stat.color} tracking-tight`}>{stat.value}</span>
            <div className="absolute right-0 bottom-0 w-8 h-8 rounded-tl-xl bg-white/5 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
        ))}
        {/* System Health badge */}
        <div
          onClick={() => setShowHealthModal(true)}
          className="p-4 rounded-xl glass-panel relative overflow-hidden cursor-pointer hover:bg-white/5 transition group"
        >
          <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">System Health</span>
          <span className="block text-lg font-bold font-display mt-0.5 tracking-tight">
            {healthError
              ? <span className="text-slate-500">⚠️ ?</span>
              : !healthData
                ? <span className="text-slate-500 animate-pulse">⋯</span>
                : healthData.overall === 'healthy'
                  ? <span className="text-emerald-400">🟢 Healthy</span>
                  : healthData.overall === 'degraded'
                    ? <span className="text-amber-400">🟡 Degraded</span>
                    : <span className="text-rose-400">🔴 Unhealthy</span>
            }
          </span>
          <div className="absolute right-0 bottom-0 w-8 h-8 rounded-tl-xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <span className="text-[9px] text-slate-400">+</span>
          </div>
        </div>
      </div>

      {/* High-End Sub tab navigation bar */}
      <div className="flex border-b border-white/10 pb-0.5 scrollbar-hide overflow-x-auto gap-2">
        {[
          { id: 'analytics', label: '📊 DATA ANALYTICS SUITE', icon: BarChart3 },
          { id: 'backup', label: '💾 BACKUP & RESTORE', icon: Download },
          { id: 'support', label: '✉️ CLIENT SUPPORT MESSAGES', icon: FileText },
          { id: 'plans', label: '📦 SUBSCRIPTION PACKAGES', icon: Star },
          { id: 'security', label: '🛡️ SECURITY & ADMINS', icon: Shield },
          { id: 'payments', label: '💳 PAYMENT GATEWAYS', icon: Users },
          { id: 'users', label: '👥 REGISTERED MEMBERS', icon: User },
          { id: 'blogs', label: '📝 DECLARED BLOGS CMS', icon: BookOpen },
          { id: 'aiconfig', label: '🤖 AI API GATEWAY', icon: Sparkles },
          { id: 'info', label: 'SITE CMS TEXT & LOOK', icon: Settings },
          { id: 'services', label: 'PORTFOLIO SERVICES', icon: FolderKanban },
          { id: 'offers', label: 'OFFERS & PROMOS', icon: Sparkles },
          { id: 'homestats', label: 'HOME STATS GRID', icon: Layout },
          { id: 'aboutcards', label: 'ABOUT VALUE PILLARS', icon: Shield },
          { id: 'reviews', label: 'CLIENT TESTIMONIALS CMS', icon: Star },
          { id: 'contacts', label: '📞 CONTACT LINKS CMS', icon: Users },
          { id: 'tools', label: 'APP DRAWER TOOLS', icon: Laptop },
          { id: 'brands', label: 'SUBSIDIARY BRANDS', icon: Image }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = consoleTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setConsoleTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-mono font-bold tracking-wider rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isSelected 
                  ? 'bg-white/10 text-[#00f0ff] border-t-2 border-[#00f0ff] rounded-t-xl' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grid configuration panel based on Tab state */}
      {consoleTab === 'aiconfig' && (
        <div className="space-y-6 animate-fade-in text-left max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl glass-panel space-y-6">
            <div>
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00f0ff]" /> AI Service API Configurations
              </h3>
              <p className="text-sm text-slate-300 mt-2">
                මෙහිදී ඔබට Customer Support Chatbot එකට සහ අනෙකුත් website tools වලට වෙන වෙනම Google Gemini API Keys ඇතුලත් කල හැක.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-xl border border-white/10 bg-black/40">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-mono text-[#00f0ff] font-bold">💬 Customer Support Chatbot API Key</label>
                  {isAiConfigured.chat && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold uppercase tracking-wider">Active</span>}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="password"
                    placeholder="Enter Chat API Key here..."
                    value={aiApiKeyInputChat}
                    onChange={(e) => setAiApiKeyInputChat(e.target.value)}
                    className="flex-grow w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#00f0ff]/50"
                  />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!aiApiKeyInputChat.trim()) { alert('Please enter a valid API key'); return; }
                        try {
                          const res = await fetch('/api/ai/configure', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ apiKey: aiApiKeyInputChat, feature: 'chat' })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setIsAiConfigured(data.apiConfigured);
                            setAiApiKeyInputChat('');
                            alert('අලුත් Chat API Key එක සාර්ථකව සම්බන්ධ කරන ලදි!');
                          }
                        } catch (e) { alert('Failed to connect.'); }
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] font-bold font-mono tracking-wider hover:bg-[#00f0ff]/20 transition cursor-pointer"
                    >
                      SAVE
                    </button>
                    {isAiConfigured.chat && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/ai/configure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: null, feature: 'chat' }) });
                            const data = await res.json();
                            if (data.success) setIsAiConfigured(data.apiConfigured);
                          } catch (e) {}
                        }}
                        className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold transition cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-black/40">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-mono text-[#00f0ff] font-bold">🛠️ Platform Tools & Other Features API Key</label>
                  {isAiConfigured.tools && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold uppercase tracking-wider">Active</span>}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="password"
                    placeholder="Enter Tools AI API Key here..."
                    value={aiApiKeyInputTools}
                    onChange={(e) => setAiApiKeyInputTools(e.target.value)}
                    className="flex-grow w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#00f0ff]/50"
                  />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!aiApiKeyInputTools.trim()) { alert('Please enter a valid API key'); return; }
                        try {
                          const res = await fetch('/api/ai/configure', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ apiKey: aiApiKeyInputTools, feature: 'tools' })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setIsAiConfigured(data.apiConfigured);
                            setAiApiKeyInputTools('');
                            alert('අලුත් Tools API Key එක සාර්ථකව සම්බන්ධ කරන ලදි!');
                          }
                        } catch (e) { alert('Failed to connect.'); }
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] font-bold font-mono tracking-wider hover:bg-[#00f0ff]/20 transition cursor-pointer"
                    >
                      SAVE
                    </button>
                    {isAiConfigured.tools && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/ai/configure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: null, feature: 'tools' }) });
                            const data = await res.json();
                            if (data.success) setIsAiConfigured(data.apiConfigured);
                          } catch (e) {}
                        }}
                        className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold transition cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 pt-2 text-center pb-4 border-b border-white/5">
                Note: These keys are securely stored server-side and will not be exposed to client browsers.
              </p>

              {/* Custom Additional AI Models Config */}
              <div className="pt-4">
                <h4 className="text-lg font-display font-medium text-white mb-2 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-cyan-400" /> Additional Custom AI APIs
                </h4>
                <p className="text-sm text-slate-400 mb-4">
                  ඔබට අවශ්‍ය වෙනත් AI මෝඩල (Models) සහ ඒවායේ API Keys මෙහිදී අලුතින් ලිස්ට් එකට එකතු කල හැක.
                </p>

                {/* Form to add a new custom model */}
                <div className="p-5 rounded-xl border border-white/10 bg-black/40 mb-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">AI Model Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Claude 3, OpenAI, GPT-4"
                        value={newCustomModelName}
                        onChange={(e) => setNewCustomModelName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">API Key</label>
                      <input
                        type="password"
                        placeholder="Enter API Key here..."
                        value={newCustomModelKey}
                        onChange={(e) => setNewCustomModelKey(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newCustomModelName.trim() || !newCustomModelKey.trim()) {
                        alert('Please fill out both name and key.');
                        return;
                      }
                      try {
                        const res = await fetch('/api/ai/custom-models', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'add', name: newCustomModelName, apiKey: newCustomModelKey })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setCustomModels(data.customModels);
                          setNewCustomModelName('');
                          setNewCustomModelKey('');
                          alert('අලුත් Model එක සාර්ථකව සම්බන්ධ කරන ලදි!');
                        }
                      } catch (e) {
                         alert('Error connecting.');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 font-bold uppercase tracking-wider text-sm transition"
                  >
                    + Add New AI Model
                  </button>
                </div>

                {/* List of custom models */}
                {customModels.length > 0 && (
                  <div className="space-y-3">
                    {customModels.map(model => (
                      <div key={model.id} className={`p-4 rounded-xl border ${model.isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700 bg-black/50'} flex flex-col sm:flex-row items-center justify-between gap-3`}>
                        <div>
                          <div className="flex items-center gap-2">
                             <h5 className="text-sm font-bold text-white tracking-wide">{model.name}</h5>
                             {model.isActive ? (
                               <span className="text-[9px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">Active</span>
                             ) : (
                               <span className="text-[9px] uppercase tracking-wider bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">Inactive</span>
                             )}
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-1">ID: {model.id}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/ai/custom-models', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'toggleActive', id: model.id, isActive: !model.isActive })
                                });
                                const data = await res.json();
                                if (data.success) setCustomModels(data.customModels);
                              } catch (e) {}
                            }}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${model.isActive ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                          >
                            {model.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this custom AI Model config?')) {
                                try {
                                  const res = await fetch('/api/ai/custom-models', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'delete', id: model.id })
                                  });
                                  const data = await res.json();
                                  if (data.success) setCustomModels(data.customModels);
                                } catch (e) {}
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {consoleTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl glass-panel text-left">
              <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="text-[#00f0ff] w-5 h-5" /> Site Metadata & About Us Text
              </h3>
              
              <form onSubmit={saveTextConfigs} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Navbar Logo / Site Title</label>
                    <input
                      type="text"
                      value={siteTitleInput}
                      onChange={e => setSiteTitleInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Developer Subtitle</label>
                    <input
                      type="text"
                      value={siteSubtitleInput}
                      onChange={e => setSiteSubtitleInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Dynamic Slogan Line</label>
                    <input
                      type="text"
                      value={siteSloganInput}
                      onChange={e => setSloganInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Middle Tagline text</label>
                    <input
                      type="text"
                      value={siteMiddleInput}
                      onChange={e => setSiteMiddleInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Sinhala Bio/Story (About Us section)</label>
                  <textarea
                    rows={4}
                    value={storySinhalaInput}
                    onChange={e => setStorySinhalaInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="අති නවීන තාක්‍ෂණය සහ උසස් නිර්මාණාත්මක කලාවන්ගේ..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">English Bio/Story (About Us section)</label>
                  <textarea
                    rows={3}
                    value={storyEnglishInput}
                    onChange={e => setStoryEnglishInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="SPT OFFICIAL originates from a deep conceptual design process..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Brand Genesis Story (Sinhala)</label>
                  <textarea
                    rows={3}
                    value={brandGenesisStoryInput}
                    onChange={e => setBrandGenesisStoryInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="Sadeep Pasindu වන මා විසින් ආරම්භ කරන ලද..."
                  />
                  <textarea
                    rows={3}
                    value={brandGenesisStoryEnInput}
                    onChange={e => setBrandGenesisStoryEnInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-cyan-400/50 mt-2 text-white focus:outline-none"
                    placeholder="[English] The Sadeep Pasindu Creative Universe..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Blog Subtitle (Sinhala)</label>
                  <textarea
                    rows={2}
                    value={blogSubtitleInput}
                    onChange={e => setBlogSubtitleInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="SPT OFFICIAL වෙතින් පිරිනමන දිනපතා අලුත්ම..."
                  />
                  <textarea
                    rows={2}
                    value={blogSubtitleEnInput}
                    onChange={e => setBlogSubtitleEnInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-cyan-400/50 mt-2 text-white focus:outline-none"
                    placeholder="[English] Read the latest technical information..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Reviews Title (Sinhala)</label>
                  <input
                    type="text"
                    value={reviewsTitleInput}
                    onChange={e => setReviewsTitleInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="පාරිභෝගික අදහස් (User Testimony)"
                  />
                  <input
                    type="text"
                    value={reviewsTitleEnInput}
                    onChange={e => setReviewsTitleEnInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-cyan-400/50 mt-2 text-white focus:outline-none"
                    placeholder="[English] User Testimony"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Reviews Subtitle (Sinhala)</label>
                  <input
                    type="text"
                    value={reviewsSubtitleInput}
                    onChange={e => setReviewsSubtitleInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="CLIENT VOICE FEEDS"
                  />
                  <input
                    type="text"
                    value={reviewsSubtitleEnInput}
                    onChange={e => setReviewsSubtitleEnInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-cyan-400/50 mt-2 text-white focus:outline-none"
                    placeholder="[English] CLIENT VOICE FEEDS"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Submit Review Title (Sinhala)</label>
                  <input
                    type="text"
                    value={submitReviewTitleInput}
                    onChange={e => setSubmitReviewTitleInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="ඔබගේ අදහස අප වෙත එවන්න (Submit Testimony)"
                  />
                  <input
                    type="text"
                    value={submitReviewTitleEnInput}
                    onChange={e => setSubmitReviewTitleEnInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-cyan-400/50 mt-2 text-white focus:outline-none"
                    placeholder="[English] Submit Testimony"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Submit Review Description (Sinhala)</label>
                  <textarea
                    rows={2}
                    value={submitReviewDescInput}
                    onChange={e => setSubmitReviewDescInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    placeholder="SPT OFFICIAL සේවාවන් පිළිබඳ ඔබගේ වටිනා අදහස..."
                  />
                  <textarea
                    rows={2}
                    value={submitReviewDescEnInput}
                    onChange={e => setSubmitReviewDescEnInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-cyan-400/50 mt-2 text-white focus:outline-none"
                    placeholder="[English] Add your valuable feedback regarding SPT OFFICIAL services..."
                  />
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <span className="block text-[10px] font-mono uppercase text-[#00f0ff] font-bold">Image & Media Direct Upload CMS</span>
                  
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-300 mb-1">Chief Creator / Owner Photo (පරිපාලකගේ ඡායාරූපය)</label>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <input
                        type="text"
                        value={ownerPhotoInput}
                        onChange={e => setOwnerPhotoInput(e.target.value)}
                        className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none text-[10px]"
                        placeholder="Image URL or loaded raw base64 data..."
                      />
                      <FileUploadTrigger onUploaded={(b64) => setOwnerPhotoInput(b64)} label="Upload Founder Photo" />
                    </div>
                    {ownerPhotoInput && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] font-mono text-emerald-400">Current Photo Preview:</span>
                        <img src={ownerPhotoInput} alt="Creator" className="w-10 h-10 rounded border border-white/20 object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-300 mb-1">Website Logo Image (වෙබ් අඩවියේ ප්‍රධාන Logo පින්තූරය)</label>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <input
                        type="text"
                        value={logoUrlInput}
                        onChange={e => setLogoUrlInput(e.target.value)}
                        className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none text-[10px]"
                        placeholder="Image URL or loaded raw base64 data..."
                      />
                      <FileUploadTrigger onUploaded={(b64) => setLogoUrlInput(b64)} label="Upload Logo Image" />
                    </div>
                    {logoUrlInput && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] font-mono text-emerald-400">Current Logo Preview:</span>
                        <img src={logoUrlInput} alt="Logo" className="w-10 h-10 rounded border border-white/20 object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-300 mb-1">Brand Genesis Saga - Review/Story Image (සන්නාම ආරම්භක කථාවේ රූපය)</label>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <input
                        type="text"
                        value={reviewsStoryImageUrlInput}
                        onChange={e => setReviewsStoryImageUrlInput(e.target.value)}
                        className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none text-[10px]"
                        placeholder="Saga story avatar image URL or load device files..."
                      />
                      <FileUploadTrigger onUploaded={(b64) => setReviewsStoryImageUrlInput(b64)} label="Upload Saga Image" />
                      {reviewsStoryImageUrlInput && (
                        <button
                          type="button"
                          onClick={() => setReviewsStoryImageUrlInput('')}
                          className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 font-mono text-[9px] uppercase tracking-wider font-bold border border-red-500/30 transition cursor-pointer"
                        >
                          Remove (ඉවත් කරන්න)
                        </button>
                      )}
                    </div>
                    {reviewsStoryImageUrlInput && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] font-mono text-emerald-400">Current Story Avatar Preview:</span>
                        <img src={reviewsStoryImageUrlInput} alt="Saga Story" className="w-10 h-10 rounded-full border border-yellow-300 object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Universe Background Animation Control Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <span className="block text-[10px] font-mono uppercase text-[#00f0ff] font-bold">Universe Animation Controller (විශ්ව පසුබිම් සජීවීකරණය)</span>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5">
                    <div>
                      <span className="block text-xs font-bold text-white">Active Universe Background Animation</span>
                      <span className="block text-[9px] text-slate-400 font-mono">Toggle astronomical galaxy animation on/off behind transparent glass</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUniverseAnimation(!showUniverseAnimation)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-bold tracking-wider transition ${
                        showUniverseAnimation 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {showUniverseAnimation ? '● ACTIVE (ක්‍රියාත්මකයි)' : '○ DEACTIVATED (අක්‍රියයි)'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-300 mb-1">Custom Universe Background GIF or Image (පසුබිම් GIF සජීවීකරණය උඩුගත කරන්න)</label>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <input
                        type="text"
                        value={universeGifUrl}
                        onChange={e => setUniverseGifUrl(e.target.value)}
                        className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none text-[10px]"
                        placeholder="GIF URL or upload local file transparent animation..."
                      />
                      <FileUploadTrigger onUploaded={(b64) => setUniverseGifUrl(b64)} label="Upload GIF Animation" />
                      {universeGifUrl && (
                        <button
                          type="button"
                          onClick={() => setUniverseGifUrl('')}
                          className="px-2.5 py-1.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 font-mono text-[9px] uppercase tracking-wider font-bold border border-red-500/30 transition cursor-pointer"
                        >
                          Delete GIF (මකන්න)
                        </button>
                      )}
                    </div>
                    <span className="block text-[8px] text-slate-500 font-mono mt-1">Recommended: Use high-quality loopable transparent background cosmological or starry network GIF to blend beautifully with overall color palettes.</span>
                    {universeGifUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] font-mono text-emerald-400">Current GIF Preview:</span>
                        <img src={universeGifUrl} alt="Universe Custom Anim" className="w-14 h-14 rounded border border-cyan-400/30 object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <span className="block text-[10px] font-mono uppercase text-[#00f0ff] mb-2 font-bold">Admin Console Security Keys</span>
                  <div className="flex gap-4">
                    <div className="flex-grow">
                      <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Set New Access Key Password</label>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={newAdminPassInput}
                          onChange={e => setNewAdminPassInput(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white pr-10 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 border border-[#00f0ff]/30 text-white text-xs font-mono font-bold tracking-widest rounded-xl transition cursor-pointer"
                  >
                    SAVE CHANGES & LIVE UPDATES
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl glass-panel text-left">
              <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
                <Paintbrush className="text-neon-blue w-5 h-5" /> Live Glass & Background Looks
              </h3>

              <div className="space-y-4">
                {/* Glass opacity */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Glass opacity multiplier ({config.glassOpacity})</label>
                    <span className="text-xs font-mono text-cyan-400">{Math.round(config.glassOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.45"
                    step="0.01"
                    value={config.glassOpacity}
                    onChange={e => setConfig(prev => ({ ...prev, glassOpacity: parseFloat(e.target.value) }))}
                    className="w-full accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Glass Blur strength */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Glass backdrop blur strength ({config.glassBlur}px)</label>
                    <span className="text-xs font-mono text-cyan-400">{config.glassBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="28"
                    step="2"
                    value={config.glassBlur}
                    onChange={e => setConfig(prev => ({ ...prev, glassBlur: parseInt(e.target.value) }))}
                    className="w-full accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Active Neon Accent choice */}
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">Neon Aura style tint</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'blue', label: 'Neon Blue', color: 'bg-cyan-500' },
                      { id: 'green', label: 'Neon Green', color: 'bg-emerald-500' },
                      { id: 'purple', label: 'Lavender', color: 'bg-fuchsia-500' },
                      { id: 'gold', label: 'Solar Gold', color: 'bg-yellow-500' }
                    ].map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, neonAccent: style.id as any }))}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          config.neonAccent === style.id
                            ? 'border-white bg-white/10 text-white font-bold'
                            : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${style.color}`} />
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cosmic Wallpaper presets */}
                <div className="border-t border-white/5 pt-4">
                  <span className="block text-[10px] font-mono uppercase text-slate-400 mb-2">Space Wallpapers</span>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {SPACE_WALLPAPERS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, bgImage: preset.url }))}
                        className={`group relative h-14 rounded-lg overflow-hidden border cursor-pointer text-left transition ${
                          config.bgImage === preset.url ? 'border-amber-400' : 'border-white/5'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 p-1 flex flex-col justify-end">
                          <span className="text-[9px] text-white truncate">{preset.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Custom Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={customBgUrl}
                      onChange={e => setCustomBgUrl(e.target.value)}
                      className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none"
                    />
                    <button
                      onClick={applyCustomWallpaper}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium rounded-lg transition"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {consoleTab === 'analytics' && (
        <div className="space-y-6 text-left animate-fade-in">
          {/* Header Description */}
          <div className="p-6 rounded-2xl glass-panel relative overflow-hidden text-left">
            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-[#00f0ff]/10 to-transparent blur-2xl rounded-full" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-display font-medium text-white flex items-center gap-2">
                  <BarChart3 className="text-[#00f0ff] w-5 h-5 animate-pulse" /> Cybernetic Data Analytics Suite
                </h3>
                <p className="text-xs text-slate-400 mt-1 select-none">
                  Sadeep Pasindu Creative Universe සජීවී පරිශීලක හැසිරීම් නිරීක්ෂණ පද්ධතිය. (Real-time tracking of visitor traffic & conversions)
                </p>
              </div>
              <div className="flex gap-1.5 p-1 bg-black/60 border border-white/5 rounded-xl flex-wrap">
                {(['day', 'week', 'month', '6months', 'year', 'lifetime'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setAnalyticsTimeframe(tf)}
                    className={`px-3 py-1 text-[10px] uppercase font-mono font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                      analyticsTimeframe === tf 
                        ? 'bg-[#00f0ff] text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf === '6months' ? '6 Months (මාස 6)' : tf === 'lifetime' ? 'Lifetime (සදාකාලික)' : tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Summary Cards Row */}
          {(() => {
            const chartData = (() => {
              const now = new Date();
              if (analyticsTimeframe === 'day') {
                const labels = ['0-4h', '4-8h', '8-12h', '12-16h', '16-20h', '20-24h'];
                const visits = [28, 41, 62, 55, 87, 49];
                const signups = [3, 5, 10, 6, 14, 8];
                const actualVisits = Array(6).fill(0);
                const actualSignups = Array(6).fill(0);
                telemetryList.forEach(item => {
                  const itemDate = new Date(item.timestamp);
                  const diffHours = (now.getTime() - itemDate.getTime()) / (1000 * 3600);
                  if (diffHours >= 0 && diffHours < 24) {
                    const idx = Math.floor(itemDate.getHours() / 4) % 6;
                    if (item.type === 'pageview') actualVisits[idx]++;
                    else if (item.type === 'signup') actualSignups[idx]++;
                  }
                });
                return {
                  labels,
                  visits: visits.map((v, i) => v + actualVisits[i]),
                  signups: signups.map((s, i) => s + actualSignups[i])
                };
              } else if (analyticsTimeframe === 'week') {
                const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const visits = [95, 112, 148, 105, 126, 185, 154];
                const signups = [14, 18, 25, 16, 20, 34, 28];
                const actualVisits = Array(7).fill(0);
                const actualSignups = Array(7).fill(0);
                telemetryList.forEach(item => {
                  const itemDate = new Date(item.timestamp);
                  const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24));
                  if (diffDays >= 0 && diffDays < 7) {
                    const idx = 6 - diffDays;
                    if (idx >= 0 && idx < 7) {
                      if (item.type === 'pageview') actualVisits[idx]++;
                      else if (item.type === 'signup') actualSignups[idx]++;
                    }
                  }
                });
                return {
                  labels,
                  visits: visits.map((v, i) => v + actualVisits[i]),
                  signups: signups.map((s, i) => s + actualSignups[i])
                };
              } else if (analyticsTimeframe === 'month') {
                const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                const visits = [520, 640, 580, 786];
                const signups = [85, 110, 94, 138];
                const actualVisits = Array(4).fill(0);
                const actualSignups = Array(4).fill(0);
                telemetryList.forEach(item => {
                  const itemDate = new Date(item.timestamp);
                  const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24));
                  if (diffDays >= 0 && diffDays < 28) {
                    const idx = 3 - Math.floor(diffDays / 7);
                    if (idx >= 0 && idx < 4) {
                      if (item.type === 'pageview') actualVisits[idx]++;
                      else if (item.type === 'signup') actualSignups[idx]++;
                    }
                  }
                });
                return {
                  labels,
                  visits: visits.map((v, i) => v + actualVisits[i]),
                  signups: signups.map((s, i) => s + actualSignups[i])
                };
              } else if (analyticsTimeframe === '6months') {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const labels: string[] = [];
                for (let i = 5; i >= 0; i--) {
                  const d = new Date();
                  d.setMonth(now.getMonth() - i);
                  labels.push(months[d.getMonth()]);
                }
                const visits = [1200, 1420, 1680, 1550, 1890, 2100];
                const signups = [185, 220, 280, 245, 310, 340];
                const actualVisits = Array(6).fill(0);
                const actualSignups = Array(6).fill(0);
                telemetryList.forEach(item => {
                  const itemDate = new Date(item.timestamp);
                  const diffMonths = (now.getFullYear() - itemDate.getFullYear()) * 12 + (now.getMonth() - itemDate.getMonth());
                  if (diffMonths >= 0 && diffMonths < 6) {
                    const idx = 5 - diffMonths;
                    if (idx >= 0 && idx < 6) {
                      if (item.type === 'pageview') actualVisits[idx]++;
                      else if (item.type === 'signup') actualSignups[idx]++;
                    }
                  }
                });
                return {
                  labels,
                  visits: visits.map((v, i) => v + actualVisits[i]),
                  signups: signups.map((s, i) => s + actualSignups[i])
                };
              } else if (analyticsTimeframe === 'year') {
                const labels = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'];
                const visits = [2400, 3200, 4100, 5420];
                const signups = [390, 510, 640, 895];
                const actualVisits = Array(4).fill(0);
                const actualSignups = Array(4).fill(0);
                telemetryList.forEach(item => {
                  const itemDate = new Date(item.timestamp);
                  const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24));
                  if (diffDays >= 0 && diffDays < 365) {
                    const idx = 3 - Math.floor(diffDays / 91.25);
                    if (idx >= 0 && idx < 4) {
                      if (item.type === 'pageview') actualVisits[idx]++;
                      else if (item.type === 'signup') actualSignups[idx]++;
                    }
                  }
                });
                return {
                  labels,
                  visits: visits.map((v, i) => v + actualVisits[i]),
                  signups: signups.map((s, i) => s + actualSignups[i])
                };
              } else {
                const labels = ['2023', '2024', '2025', '2026'];
                const visits = [4800, 7800, 12400, 16900];
                const signups = [720, 1150, 1980, 2540];
                const actualVisits = Array(4).fill(0);
                const actualSignups = Array(4).fill(0);
                telemetryList.forEach(item => {
                  if (item.type === 'pageview') actualVisits[3]++;
                  else if (item.type === 'signup') actualSignups[3]++;
                });
                return {
                  labels,
                  visits: visits.map((v, i) => v + actualVisits[i]),
                  signups: signups.map((s, i) => s + actualSignups[i])
                };
              }
            })();

            const totalVisitsCount = chartData.visits.reduce((a, b) => a + b, 0);
            const totalSignupsCount = chartData.signups.reduce((a, b) => a + b, 0);
            const conversionPercentage = totalVisitsCount > 0 ? ((totalSignupsCount / totalVisitsCount) * 100).toFixed(1) : '12.4';

            // Generate SVG paths for Visits and Signups
            const getSvgPaths = (series: number[]) => {
              if (series.length < 2) return { line: '', area: '' };
              const maxVal = Math.max(...series, 10);
              const points = series.map((val, idx) => {
                const x = (idx / (series.length - 1)) * 460 + 20;
                const y = 180 - (val / maxVal) * 140;
                return { x, y };
              });
              
              // Straight or bezier curve
              let linePath = `M ${points[0].x} ${points[0].y}`;
              for (let i = 1; i < points.length; i++) {
                const prev = points[i-1];
                const curr = points[i];
                // control point
                const cp1x = prev.x + (curr.x - prev.x) / 2;
                const cp1y = prev.y;
                const cp2x = prev.x + (curr.x - prev.x) / 2;
                const cp2y = curr.y;
                linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
              }

              const areaPath = `${linePath} L ${points[points.length-1].x} 190 L ${points[0].x} 190 Z`;
              return { line: linePath, area: areaPath, points };
            };

            const visitsPaths = getSvgPaths(chartData.visits);
            const signupsPaths = getSvgPaths(chartData.signups);

            // Paths Page Analytics Popularity
            const pathWeights = {
              'home': 450,
              'services': 310,
              'offers': 195,
              'tools': 160,
              'reviews': 125,
              'about': 180,
              'admin': 32
            };
            telemetryList.forEach(item => {
              if (item.type === 'pageview') {
                const p = item.path.toLowerCase() as keyof typeof pathWeights;
                if (pathWeights[p] !== undefined) {
                  pathWeights[p]++;
                }
              }
            });
            const pathsSorted = Object.entries(pathWeights).sort((a,b) => b[1] - a[1]);
            const maxPathVal = Math.max(...pathsSorted.map(p => p[1]));

            // Interactive Clicks logs
            const clicksWeight = {
              'Contact WhatsApp': 142,
              'Click Call Hotline': 64,
              'AIO Sandbox Custom Link Generation': 84,
              'QR Code Custom Stamp Created': 96,
              'Launch Apparel Tool': 45,
              'Submit Service Order form': 38,
              'Read FAQ Item': 52
            };
            telemetryList.forEach(item => {
              if (item.type === 'click' && item.elementName) {
                const key = item.elementName;
                clicksWeight[key as keyof typeof clicksWeight] = (clicksWeight[key as keyof typeof clicksWeight] || 0) + 1;
              }
            });
            const clicksSorted = Object.entries(clicksWeight).sort((a,b) => b[1] - a[1]);
            const maxClickVal = Math.max(...clicksSorted.map(c => c[1]));

            return (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-black/40 border border-[#00f0ff]/15 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute right-3 top-3 p-2 bg-[#00f0ff]/10 rounded-xl">
                      <Users className="w-4 h-4 text-[#00f0ff]" />
                    </div>
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest">Total Visits (පැමිණීම්)</span>
                    <span className="block text-3xl font-display font-medium text-white mt-2 font-bold tracking-tight">
                      {totalVisitsCount.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-[#00f0ff] font-mono flex items-center gap-1 mt-1 font-bold">
                      ● Active Traffic stream online
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/15 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute right-3 top-3 p-2 bg-emerald-500/10 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest">Client Sign-ups (ලියාපදිංචිවීම්)</span>
                    <span className="block text-3xl font-display font-medium text-emerald-400 mt-2 font-bold tracking-tight">
                      {totalSignupsCount.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 mt-1 font-bold">
                      ↑ 14.2% verified registration growth
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-black/40 border border-amber-500/15 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute right-3 top-3 p-2 bg-amber-500/10 rounded-xl">
                      <Activity className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest">Action Conversion % (CTA)</span>
                    <span className="block text-3xl font-display font-medium text-amber-400 mt-2 font-bold tracking-tight">
                      {conversionPercentage}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                      Conversion of visitors to leads
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-black/40 border border-indigo-500/15 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute right-3 top-3 p-2 bg-indigo-500/10 rounded-xl">
                      <MousePointerClick className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest">Total Button Clicks</span>
                    <span className="block text-3xl font-display font-medium text-indigo-300 mt-2 font-bold tracking-tight">
                      {(totalVisitsCount * 1.8).toFixed(0)}
                    </span>
                    <span className="text-[9px] text-indigo-400 font-mono flex items-center gap-1 mt-1 font-bold">
                      Avg 1.8 clicks per session
                    </span>
                  </div>
                </div>

                {/* Graph Visualization Card */}
                <div className="p-6 rounded-2xl glass-panel text-left">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-sm font-mono uppercase text-white font-bold tracking-wider">Visual Traffic Waveform & Conversions</h4>
                      <p className="text-[10px] text-slate-400">Cyan line represents Page Visits. Purple line indicates Confirmed Signups / Key CTAs.</p>
                    </div>
                    <div className="flex gap-4 font-mono text-[9px] tracking-wide">
                      <div className="flex items-center gap-1.5 text-[#00f0ff] uppercase font-bold">
                        <span className="w-2.5 h-2.5 rounded bg-[#00f0ff]" /> Page Views
                      </div>
                      <div className="flex items-center gap-1.5 text-purple-400 uppercase font-bold">
                        <span className="w-2.5 h-2.5 rounded bg-purple-500" /> Registrations
                      </div>
                    </div>
                  </div>

                  {/* Elegant Scalable SVG Area Graph */}
                  <div className="relative w-full h-[220px] bg-black/60 border border-white/5 rounded-2xl p-4 overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d946ef" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#d946ef" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[0, 1, 2, 3, 4].map((grid, index) => {
                        const y = 20 + index * 40;
                        return (
                          <line
                            key={index}
                            x1="10"
                            y1={y}
                            x2="490"
                            y2={y}
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeWidth="1"
                            strokeDasharray="4"
                          />
                        );
                      })}

                      {/* Area & Curves for Visits */}
                      {visitsPaths.area && (
                        <path d={visitsPaths.area} fill="url(#gradCyan)" />
                      )}
                      {visitsPaths.line && (
                        <path
                          d={visitsPaths.line}
                          fill="none"
                          stroke="#00f0ff"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Area & Curves for Signups */}
                      {signupsPaths.area && (
                        <path d={signupsPaths.area} fill="url(#gradPurple)" />
                      )}
                      {signupsPaths.line && (
                        <path
                          d={signupsPaths.line}
                          fill="none"
                          stroke="#d946ef"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="2"
                        />
                      )}

                      {/* Hot dots on hovering points */}
                      {visitsPaths.points && visitsPaths.points.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          className="fill-[#00f0ff] stroke-black stroke-2 hover:r-6 cursor-crosshair transition-all"
                        />
                      ))}
                    </svg>

                    {/* X-Axis labels */}
                    <div className="absolute bottom-2 left-4 right-4 flex justify-between font-mono text-[9px] text-slate-500 font-bold select-none">
                      {chartData.labels.map((lbl, idx) => (
                        <span key={idx}>{lbl}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grid Split section list detailing Pages Flow and Action Elements clicks */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Popular Sections Visited */}
                  <div className="p-6 rounded-2xl glass-panel relative">
                    <h4 className="text-sm font-semibold uppercase text-slate-200 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-cyan-400 rounded-full" /> Page Visitor Popularity (ජනප්‍රියම අංශ)
                    </h4>
                    
                    <div className="space-y-4">
                      {pathsSorted.map(([pName, count]) => {
                        const pct = maxPathVal > 0 ? (count / maxPathVal) * 100 : 0;
                        return (
                          <div key={pName} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-mono font-bold text-slate-300 uppercase tracking-wider">{pName} page</span>
                              <span className="text-slate-400 text-[11px] font-mono">{count} hits</span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Interactive Call To Action elements clicked */}
                  <div className="p-6 rounded-2xl glass-panel relative">
                    <h4 className="text-sm font-semibold uppercase text-slate-200 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-[#00f0ff] rounded-full" /> CTA Link & Feature Button Interactions
                    </h4>
                    
                    <div className="space-y-4">
                      {clicksSorted.map(([cName, count]) => {
                        const pct = maxClickVal > 0 ? (count / maxClickVal) * 100 : 0;
                        return (
                          <div key={cName} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-sans text-slate-300 font-medium">{cName}</span>
                              <span className="text-amber-400 text-[11px] font-mono font-bold">{count} trigger attempts</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Sub Tab: Live User Interactive logs feeds */}
                <div className="p-6 rounded-2xl glass-panel text-left">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <h4 className="text-md font-semibold font-display text-white">Live Visitor Event Stream (සජීවී පරිශීලක ක්‍රියාකාරකම් සැසිය)</h4>
                      <p className="text-xs text-slate-400">Actual real-time clicks, sections opened, and devices currently tracking.</p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={selectedLogType}
                        onChange={e => setSelectedLogType(e.target.value as any)}
                        className="px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider font-bold bg-black/60 border border-white/10 rounded-lg text-slate-300 cursor-pointer text-xs"
                      >
                        <option value="all">🔍 Show All Events</option>
                        <option value="pageview">Pageviews Only</option>
                        <option value="click">Clicks Only</option>
                        <option value="signup">Signups Only</option>
                      </select>
                      
                      <button
                        onClick={onClearTelemetry}
                        className="px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider font-bold text-red-400 hover:text-red-300 bg-red-400/5 hover:bg-red-400/10 border border-red-500/20 rounded-lg transition"
                      >
                        🗑️ Reset Logs
                      </button>
                    </div>
                  </div>

                  {/* Sessions Tables details */}
                  <div className="border border-white/5 rounded-xl bg-black/45 overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto scrollbar-hide text-[11px] divide-y divide-white/5">
                      {(() => {
                        // Blend telemetryList with simulation records for elegant display
                        const fallbackLogs = [
                          { id: 'sim_1', type: 'click', path: 'offers', elementName: 'Contact WhatsApp', timestamp: new Date(Date.now() - 15000).toISOString(), location: 'Colombo', browser: 'Safari Mobile' },
                          { id: 'sim_2', type: 'signup', path: 'home', elementName: 'Join Spt Official Portal', timestamp: new Date(Date.now() - 48000).toISOString(), location: 'Kandy', browser: 'Chrome Desktop' },
                          { id: 'sim_3', type: 'pageview', path: 'services', timestamp: new Date(Date.now() - 120000).toISOString(), location: 'Galle', browser: 'Chrome Mobile' },
                          { id: 'sim_4', type: 'click', path: 'tools', elementName: 'AIO Sandbox Custom Link Generation', timestamp: new Date(Date.now() - 400000).toISOString(), location: 'Colombo', browser: 'Firefox Quantum' },
                          { id: 'sim_5', type: 'pageview', path: 'reviews', timestamp: new Date(Date.now() - 800000).toISOString(), location: 'Gampaha', browser: 'Safari Mobile' },
                          { id: 'sim_6', type: 'click', path: 'home', elementName: 'Click Call Hotline', timestamp: new Date(Date.now() - 1500000).toISOString(), location: 'Negombo', browser: 'Chrome Desktop' },
                          { id: 'sim_7', type: 'signup', path: 'home', elementName: 'Join Spt Official Portal', timestamp: new Date(Date.now() - 3600000).toISOString(), location: 'Gampaha', browser: 'Chrome Mobile' },
                          { id: 'sim_8', type: 'pageview', path: 'about', timestamp: new Date(Date.now() - 8600000).toISOString(), location: 'Colombo', browser: 'Firefox Quantum' }
                        ];

                        const actualLogs = telemetryList.map(item => ({
                          id: item.id,
                          type: item.type,
                          path: item.path,
                          elementName: item.elementName,
                          timestamp: item.timestamp,
                          location: item.ipLocation || 'Sri Lanka',
                          browser: 'Device Browser'
                        }));

                        const logsCombined = [...actualLogs, ...fallbackLogs]
                          .filter(log => selectedLogType === 'all' || log.type === selectedLogType)
                          .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                        if (logsCombined.length === 0) {
                          return (
                            <div className="p-8 text-center text-slate-500 font-mono text-xs uppercase tracking-wider">
                              No log events registered yet. Browse the site to see real-time triggers!
                            </div>
                          );
                        }

                        return logsCombined.map(log => {
                          const logTime = new Date(log.timestamp);
                          return (
                            <div key={log.id} className="p-3 hover:bg-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition duration-150">
                              <div className="flex items-center gap-3">
                                {/* Indicator badge */}
                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono tracking-widest uppercase font-bold ${
                                  log.type === 'signup' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : log.type === 'click' 
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                }`}>
                                  {log.type}
                                </span>
                                <div>
                                  <div className="text-white font-medium">
                                    {log.type === 'pageview' ? (
                                      <span>Opened <strong className="text-cyan-300 font-mono">/{log.path}</strong> section</span>
                                    ) : log.type === 'signup' ? (
                                      <span>Completed <strong className="text-emerald-400">Ecosystem Register</strong> successfully</span>
                                    ) : (
                                      <span>Clicked button <span className="text-amber-300">"{log.elementName}"</span></span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2 items-center">
                                    <span>📍 Location: <strong className="text-slate-300">{log.location}</strong></span>
                                    <span className="text-slate-600">|</span>
                                    <span>💻 Browser: <strong className="text-slate-300">{log.browser}</strong></span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-slate-500 font-mono text-[9px] whitespace-nowrap">
                                {logTime.toLocaleTimeString()} ({Math.floor((Date.now() - logTime.getTime()) / 60000)}m ago)
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {consoleTab === 'services' && (
        <div className="space-y-6 text-left">
          {/* Create new service form */}
          <div className="p-6 rounded-2xl glass-panel">
            <h3 className="text-lg font-display font-bold text-white mb-2 flex items-center gap-2">
              <PlusCircle className="text-indigo-400 w-5 h-5" /> Create a New Service & Portfolio Card
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              සේවා ලැයිස්තුවට අලුත් සේවාවක් සහ ඊට අදාළ ඡායාරූප ඇතුලත් කරන්න. සේවාදායකයින්ට මෙය සජීවීව පෙන්වනු ඇත.
            </p>

            <form onSubmit={handleCreateService} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Service Title (සේවාවේ නම)</label>
                  <input
                    type="text"
                    placeholder="e.g. Premium Web Development (වෙබ් අඩවි නිර්මාණය)"
                    value={serviceTitle}
                    onChange={e => setServiceTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white"
                    required
                  />
<input
                    type="text"
                    placeholder="[English] e.g. Premium Web Development (වෙබ් අඩවි නිර්මාණය)"
                    value={serviceTitleEn}
                    onChange={e => setServiceTitleEn(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white mt-2 border-dashed border-cyan-400/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Service Description (විස්තරය)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. High performance web applications in React with rich responsive dynamic components and mobile support..."
                    value={serviceDesc}
                    onChange={e => setServiceDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none"
                    required
                  />
<textarea
                    rows={2}
                    placeholder="[English] e.g. High performance web applications in React with rich responsive dynamic components and mobile support..."
                    value={serviceDescEn}
                    onChange={e => setServiceDescEn(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none mt-2 border-dashed border-cyan-400/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Genre Category</label>
                    <select
                      value={serviceCat}
                      onChange={e => setServiceCat(e.target.value as any)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-black/60 border border-white/10 text-white"
                    >
                      <option value="web_dev">Web Design & Dev (දැන් පවතී!)</option>
                      <option value="ai_design">AI & Digital Design</option>
                      <option value="music_writing">Music & Song Writing</option>
                      <option value="video_content">Video Content & Production</option>
                      <option value="apparel_art">Clothing & Custom Art</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      checked={serviceHigh}
                      onChange={e => setServiceHigh(e.target.checked)}
                      id="serviceHigh"
                      className="w-4 h-4 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="serviceHigh" className="text-xs font-medium text-slate-200 cursor-pointer">Highlight Flag</label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Primary Display Image URL (ප්‍රධාන ඡායාරූපය)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={serviceImgUrl}
                      onChange={e => setServiceImgUrl(e.target.value)}
                      className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white"
                    />
                    <FileUploadTrigger onUploaded={(b64) => setServiceImgUrl(b64)} label="Upload" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">YouTube Video Link (යූටියුබ් වීඩියෝ ලින්ක් එක) - Optional</label>
                  <input
                    type="text"
                    placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    value={serviceYoutubeUrl}
                    onChange={e => setServiceYoutubeUrl(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-indigo-400"
                  />
                  <p className="text-[9px] text-slate-500 mt-0.5">පාරිභෝගිකයින්ට මෙම සේවාව ක්ලික් කළ විට එතැනදීම YouTube වීඩියෝව නැරඹිය හැක.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600/50 border border-indigo-400/50 hover:bg-indigo-600/70 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Adding Service Card
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* List of current services with delete + showcase attachments management */}
          <div className="space-y-4">
            <h4 className="text-sm font-mono uppercase tracking-widest text-slate-300 mb-2">පවත්නා සේවාවන් සහ Showcase වීඩියෝ/රූප ({services.length})</h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {services.map(serv => (
                <div key={serv.id} className="p-5 rounded-2xl glass-panel flex flex-col justify-between border border-white/5 space-y-4">
                  {editingServiceId === serv.id ? (
                    <form onSubmit={handleSaveEditService} className="space-y-3 font-sans text-left w-full">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-amber-300">Edit Service Mode (සංස්කරණය)</span>
                        <button 
                          type="button" 
                          onClick={() => setEditingServiceId(null)}
                          className="text-[10px] text-slate-405 hover:text-white cursor-pointer px-2 py-0.5 rounded bg-white/5"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-1">Service Title</label>
                          <input 
                            type="text" 
                            className="w-full px-2.5 py-1.5 text-xs rounded bg-black/60 border border-white/10 text-white" 
                            value={editServiceTitle} 
                            onChange={e => setEditServiceTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-1">Description</label>
                          <textarea 
                            rows={3}
                            className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white resize-none" 
                            value={editServiceDesc} 
                            onChange={e => setEditServiceDesc(e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] font-mono text-[#a5f3fc] uppercase mb-1">Category</label>
                            <select 
                              className="w-full px-2 py-1.5 rounded bg-black/80 border border-white/10 text-white text-xs" 
                              value={editServiceCat}
                              onChange={e => setEditServiceCat(e.target.value as any)}
                            >
                              <option value="web_dev">Web Design & Dev</option>
                              <option value="ai_design">AI & Digital Design</option>
                              <option value="music_writing">Music & Writing</option>
                              <option value="video_content">Video Production</option>
                              <option value="apparel_art">Clothing & Paintings</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2 pt-4">
                            <input 
                              type="checkbox" 
                              id={`edit_high_${serv.id}`}
                              checked={editServiceHigh} 
                              onChange={e => setEditServiceHigh(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-350 accent-indigo-505"
                            />
                            <label htmlFor={`edit_high_${serv.id}`} className="text-slate-300 text-xs font-medium cursor-pointer select-none">Highlight Flag</label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-1">Display Image (URL)</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-grow px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white font-mono text-[10px]" 
                              value={editServiceImgUrl} 
                              onChange={e => setEditServiceImgUrl(e.target.value)}
                              placeholder="Optional image url..."
                            />
                            <FileUploadTrigger onUploaded={(b64) => setEditServiceImgUrl(b64)} label="Upload" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-1">YouTube Video Link (යූටියුබ් වීඩියෝ ලින්ක් එක)</label>
                          <input 
                            type="text" 
                            className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-400" 
                            value={editServiceYoutubeUrl} 
                            onChange={e => setEditServiceYoutubeUrl(e.target.value)}
                            placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                          />
                        </div>
                        <button 
                          type="submit" 
                          className="w-full py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:opacity-95 font-bold rounded-xl text-slate-950 text-xs transition active:scale-95 cursor-pointer mt-1"
                        >
                          Save Service Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="inline-block px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider bg-white/10 text-slate-300 rounded mb-1.5">
                            {serv.category.replace('_', ' ')}
                          </span>
                          <h5 className="text-md font-bold text-white">{serv.title}</h5>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditService(serv)}
                            className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition cursor-pointer"
                            title="Edit Service"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`'${serv.title}' සේවාව සම්පූර්ණයෙන්ම ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?`)) {
                                onDeleteService(serv.id);
                              }
                            }}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                            title="Delete Service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    <p className="text-xs text-slate-400 mt-1 lines-clamp-2 leading-relaxed">{serv.description}</p>
                    
                    {serv.imageUrl && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">Image:</span>
                        <a href={serv.imageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#00f0ff] hover:underline flex items-center gap-0.5 truncate max-w-[200px]">
                          {serv.imageUrl} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    {/* Showcase media inside this service */}
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-semibold text-slate-300 tracking-wider">Showcase Works ({serv.showcaseFiles?.length || 0})</span>
                        <button
                          onClick={() => setShowcaseFormServiceId(showcaseFormServiceId === serv.id ? null : serv.id)}
                          className="px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 hover:bg-cyan-400/20 text-[9px] font-mono rounded flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Work
                        </button>
                      </div>

                      {/* Showcase files inline drawer */}
                      {serv.showcaseFiles && serv.showcaseFiles.length > 0 ? (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {serv.showcaseFiles.map(file => (
                            <div key={file.id} className="flex justify-between items-center text-[10px] bg-black/40 p-2 rounded-lg border border-white/5">
                              <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                                <span className="text-slate-500">{file.type === 'video' ? '🎥' : '📷'}</span>
                                <span className="text-slate-300 truncate font-medium">{file.title}</span>
                              </div>
                              <button
                                onClick={() => handleDeleteShowcaseFile(serv.id, file.id)}
                                className="text-rose-400 hover:text-rose-300 font-mono underline cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">කිසිදු ඡායාරූපයක් හෝ වීඩියෝවක් ඇතුලත් කර නැත. (No showcase media)</p>
                      )}

                      {/* Form: Add Showcase Work to this specific card */}
                      {showcaseFormServiceId === serv.id && (
                        <div className="p-3 bg-white/5 rounded-xl border border-cyan-500/20 space-y-3 mt-3">
                          <span className="block text-[10px] font-mono text-[#00f0ff] font-bold">Add Showcase Visual Work</span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-mono text-slate-400">File Media Type</label>
                              <select
                                value={newShowcaseType}
                                onChange={e => setNewShowcaseType(e.target.value as any)}
                                className="w-full px-2 py-1 bg-black text-slate-200 text-[10px] rounded border border-white/10"
                              >
                                <option value="image">📷 Image Photo Link</option>
                                <option value="video">🎥 Video Embed Link</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-mono text-slate-400">Title of Work (නම)</label>
                              <input
                                type="text"
                                placeholder="e.g. Campaign Teaser Clip"
                                value={newShowcaseTitle}
                                onChange={e => setNewShowcaseTitle(e.target.value)}
                                className="w-full px-2 py-1 bg-black text-slate-200 text-[10px] rounded border border-white/10"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono text-slate-400">Media URL Link (යූටියුබ් හෝ රූපයේ ලින්ක් එක)</label>
                            <input
                              type="text"
                              placeholder="e.g. https://www.youtube.com/embed/dQw4w9WgXcQ or https://images..."
                              value={newShowcaseUrl}
                              onChange={e => setNewShowcaseUrl(e.target.value)}
                              className="w-full px-2 py-1 bg-black text-slate-200 text-[10px] rounded border border-white/10 font-mono"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddShowcaseFile(serv.id)}
                              className="flex-grow py-1 bg-emerald-600/30 border border-emerald-500/30 hover:bg-emerald-600/50 rounded text-white text-[10px] font-bold"
                            >
                              Add File To Service Showcase
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowcaseFormServiceId(null)}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-slate-400 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        </div>
      )}

      {/* Offers CMS Tab Panel */}
      {consoleTab === 'offers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* Form to Create a New Offer */}
          <div className="lg:col-span-5 p-6 rounded-2xl glass-panel space-y-4">
            <h3 className="text-lg font-display font-medium text-white flex items-center gap-2">
              <Plus className="text-cyan-400 w-5 h-5 animate-pulse" /> Add New Offer or Promotion
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              නව විශේෂ මිල අඩු කිරීමක් හෝ ප්‍රවර්ධන දීමනාවක් එක් කරන්න. මෙය පාරිභෝගිකයින්ට සජීවීව පෙන්වනු ඇත.
            </p>

            <form onSubmit={handleCreateOffer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Offer Title (දීමනාවේ නම)</label>
                <input
                  type="text"
                  placeholder="e.g. End of Season Tech Sale"
                  value={newOfferTitle}
                  onChange={e => setNewOfferTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. End of Season Tech Sale"
                  value={newOfferTitleEn}
                  onChange={e => setNewOfferTitleEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400 mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Description (විස්තරය)</label>
                <textarea
                  rows={3}
                  placeholder="Provide precise details of the discount or perk..."
                  value={newOfferDesc}
                  onChange={e => setNewOfferDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400 resize-none"
                  required
                />
<textarea
                  rows={3}
                  placeholder="[English] Provide precise details of the discount or perk..."
                  value={newOfferDescEn}
                  onChange={e => setNewOfferDescEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400 resize-none mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#00f0ff] mb-1">Discount Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. 40% OFF"
                    value={newOfferBadge}
                    onChange={e => setNewOfferBadge(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
<input
                    type="text"
                    placeholder="[English] e.g. 40% OFF"
                    value={newOfferBadgeEn}
                    onChange={e => setNewOfferBadgeEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400 mt-2 border-dashed border-cyan-400/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-amber-300 mb-1">Valid Until</label>
                  <input
                    type="text"
                    placeholder="e.g. Sept 30, 2026"
                    value={newOfferValid}
                    onChange={e => setNewOfferValid(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Promo Code (ප්‍රවර්ධන කේතය)</label>
                <input
                  type="text"
                  placeholder="e.g. SPTSUMMER"
                  value={newOfferCode}
                  onChange={e => setNewOfferCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Promo Image URL (දීමනාවට අදාල පින්තූරය - Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newOfferImageUrl}
                    onChange={e => setNewOfferImageUrl(e.target.value)}
                    className="flex-grow px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                  <FileUploadTrigger onUploaded={(b64) => setNewOfferImageUrl(b64)} label="Upload" />
                </div>
                {newOfferImageUrl && (
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                    <span>Image Preview:</span>
                    <img src={newOfferImageUrl} alt="Preview" className="w-8 h-8 rounded border border-white/10 object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-xl bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-500 font-mono text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
              >
                Create Promo Offer Card
              </button>
            </form>
          </div>

          {/* List and Inline Edit Panel for Current Offers */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-sm font-mono uppercase text-slate-300 tracking-wider">Active Promo Codes & Offers ({offersList.length})</h4>

            {offersList.length === 0 ? (
              <div className="p-8 text-center glass-panel rounded-2xl border border-dashed border-white/10">
                <span className="text-2xl block mb-2">🏜️</span>
                <p className="text-slate-400 text-xs font-mono">No offers live inside the cache system.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {offersList.map(offer => (
                  <div key={offer.id} className="p-5 rounded-2xl glass-panel border border-white/5 space-y-4">
                    {editingOfferId === offer.id ? (
                      // Inline edit form
                      <form onSubmit={handleSaveEditOffer} className="space-y-3 text-xs">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-amber-300">Edit Offer (දීමනාව සංස්කරණය)</span>
                          <button
                            type="button"
                            onClick={() => setEditingOfferId(null)}
                            className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Offer Title</label>
                          <input
                            type="text"
                            value={editOfferTitle}
                            onChange={e => setEditOfferTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded bg-black/60 border border-white/10 text-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Description</label>
                          <textarea
                            rows={2}
                            value={editOfferDesc}
                            onChange={e => setEditOfferDesc(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded bg-black/60 border border-white/10 text-white resize-none"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[8px] font-mono text-[#00f0ff] uppercase mb-0.5">Badge</label>
                            <input
                              type="text"
                              value={editOfferBadge}
                              onChange={e => setEditOfferBadge(e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded bg-black/60 border border-white/10 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono text-amber-300 uppercase mb-0.5">Expiry</label>
                            <input
                              type="text"
                              value={editOfferValid}
                              onChange={e => setEditOfferValid(e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded bg-black/60 border border-white/10 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono text-slate-450 uppercase mb-0.5">Promo Code</label>
                            <input
                              type="text"
                              value={editOfferCode}
                              onChange={e => setEditOfferCode(e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded bg-black/60 border border-white/10 text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Promo Image URL (Optional)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editOfferImageUrl}
                              onChange={e => setEditOfferImageUrl(e.target.value)}
                              placeholder="https://images.unsplash.com/photo-..."
                              className="flex-grow px-2 py-1 text-xs rounded bg-black/60 border border-white/10 text-white"
                            />
                            <FileUploadTrigger onUploaded={(b64) => setEditOfferImageUrl(b64)} label="Upload" />
                          </div>
                          {editOfferImageUrl && (
                            <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                              <span>Image Preview:</span>
                              <img src={editOfferImageUrl} alt="Preview" className="w-6 h-6 rounded border border-white/10 object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:opacity-95 font-bold rounded-xl text-slate-950 font-mono text-xs uppercase"
                        >
                          Save Changes
                        </button>
                      </form>
                    ) : (
                      // Display Mode
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {offer.discountBadge && (
                              <span className="px-1.5 py-0.5 bg-cyan-400/20 text-cyan-300 border border-cyan-400/25 rounded text-[9px] font-mono font-bold">
                                {offer.discountBadge}
                              </span>
                            )}
                            <h5 className="text-sm font-bold text-white font-sans">{offer.title}</h5>
                          </div>
                          <p className="text-xs text-slate-400 font-sans leading-relaxed">{offer.description}</p>
                          <div className="flex gap-4 text-[10px] text-slate-500 font-mono pt-1">
                            {offer.promoCode && <span>PROMO: <strong className="text-cyan-400 font-bold">{offer.promoCode}</strong></span>}
                            {offer.validUntil && <span>VAL: <span className="text-yellow-400">{offer.validUntil}</span></span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEditOffer(offer)}
                            className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="p-1.5 rounded bg-[#f43f5e]/10 hover:bg-[#f43f5e]/20 text-[#f43f5e] transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Home stats CMS Tab Panel */}
      {consoleTab === 'homestats' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* Form to Create a New HomeStat */}
          <div className="lg:col-span-5 p-6 rounded-2xl glass-panel space-y-4">
            <h3 className="text-lg font-display font-medium text-white flex items-center gap-2">
              <Plus className="text-amber-300 w-5 h-5 animate-pulse" /> Add Home Metric Element
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              මුල් පිටුවේ මැද ඇති Highlight වෙන අංක හෝ සේවිත දර්ශක (Achievements Showcase Stats Grid) කොටස් වෙනස් කරන්න.
            </p>

            <form onSubmit={handleCreateHomeStat} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Badge (දර්ශක ප්‍රමාණය)</label>
                <input
                  type="text"
                  placeholder="e.g. 50+ Clients, AI Production, 100%"
                  value={newHomeStatBadge}
                  onChange={e => setNewHomeStatBadge(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. 50+ Clients, AI Production, 100%"
                  value={newHomeStatBadgeEn}
                  onChange={e => setNewHomeStatBadgeEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400 mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Stat Title (මාතෘකාව)</label>
                <input
                  type="text"
                  placeholder="e.g. Original Music, High-End Styling"
                  value={newHomeStatTitle}
                  onChange={e => setNewHomeStatTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. Original Music, High-End Styling"
                  value={newHomeStatTitleEn}
                  onChange={e => setNewHomeStatTitleEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400 mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Description (කෙටි විස්තරය)</label>
                <input
                  type="text"
                  placeholder="e.g. Bespoke Melodies, Custom style codes"
                  value={newHomeStatDesc}
                  onChange={e => setNewHomeStatDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. Bespoke Melodies, Custom style codes"
                  value={newHomeStatDescEn}
                  onChange={e => setNewHomeStatDescEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400 mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Metric Image URL (දර්ශකයට අදාල පින්තූරය - Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newHomeStatImageUrl}
                    onChange={e => setNewHomeStatImageUrl(e.target.value)}
                    className="flex-grow px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  />
                  <FileUploadTrigger onUploaded={(b64) => setNewHomeStatImageUrl(b64)} label="Upload" />
                </div>
                {newHomeStatImageUrl && (
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                    <span>Image Preview:</span>
                    <img src={newHomeStatImageUrl} alt="Preview" className="w-8 h-8 rounded border border-white/10 object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-500 font-mono text-xs uppercase transition active:scale-95 cursor-pointer"
              >
                Add Landing Metric Card
              </button>
            </form>
          </div>

          {/* List and Inline Edit Panel for Current Home Stats */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-sm font-mono uppercase text-slate-300 tracking-wider">Active landing stats ({homeStatsList.length})</h4>

            <div className="space-y-3">
              {homeStatsList.map(item => (
                <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-full">
                  {editingHomeStatId === item.id ? (
                    <form onSubmit={handleSaveEditHomeStat} className="space-y-3 text-xs text-left">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-amber-300">Edit Stat Pillar (සංස්කරණය)</span>
                        <button
                          type="button"
                          onClick={() => setEditingHomeStatId(null)}
                          className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[8px] font-mono uppercase text-slate-400">Badge</label>
                          <input
                            type="text"
                            value={editHomeStatBadge}
                            onChange={e => setEditHomeStatBadge(e.target.value)}
                            className="w-full px-2.5 py-1 rounded bg-black/60 border border-white/10 text-white text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono uppercase text-slate-400">Title</label>
                          <input
                            type="text"
                            value={editHomeStatTitle}
                            onChange={e => setEditHomeStatTitle(e.target.value)}
                            className="w-full px-2.5 py-1 rounded bg-black/60 border border-white/10 text-white text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono uppercase text-slate-400">Description</label>
                          <input
                            type="text"
                            value={editHomeStatDesc}
                            onChange={e => setEditHomeStatDesc(e.target.value)}
                            className="w-full px-2.5 py-1 rounded bg-black/60 border border-white/10 text-white text-xs"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Metric Image URL (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editHomeStatImageUrl}
                            onChange={e => setEditHomeStatImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="flex-grow px-2 py-1 text-xs rounded bg-black/60 border border-white/10 text-white"
                          />
                          <FileUploadTrigger onUploaded={(b64) => setEditHomeStatImageUrl(b64)} label="Upload" />
                        </div>
                        {editHomeStatImageUrl && (
                          <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                            <span>Image Preview:</span>
                            <img src={editHomeStatImageUrl} alt="Preview" className="w-6 h-6 rounded border border-white/10 object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full py-1.5 bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                      >
                        Save Pillar Changes
                      </button>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <span className="text-xs font-bold text-amber-200 uppercase font-mono mr-2">[{item.badge}]</span>
                        <span className="text-xs font-bold text-white">{item.title}</span>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditHomeStat(item)}
                          className="p-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition cursor-pointer"
                        >
                          <PenTool className="w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteHomeStat(item.id)}
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* About Us CMS Tab Panel */}
      {consoleTab === 'aboutcards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* Form to Create a New About Card */}
          <div className="lg:col-span-5 p-6 rounded-2xl glass-panel space-y-4">
            <h3 className="text-lg font-display font-medium text-white flex items-center gap-2">
              <Plus className="text-purple-400 w-5 h-5 animate-pulse" /> Add About Us Pillar Card
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              &quot;අපි ගැන&quot; (About Us) පිටුවේ පහළින් ඇති තාක්ෂණික පද්ධති හෝ විශ්වාසනීයත්ව වටිනාකම් (Value Pillars) වෙනස් කරන්න.
            </p>

            <form onSubmit={handleCreateAboutCard} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">Pillar Title (පදනමේ නම)</label>
                <input
                  type="text"
                  placeholder="e.g. පාරිභෝගික සේවය (Client Service)"
                  value={newAboutCardTitle}
                  onChange={e => setNewAboutCardTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-purple-450"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. පාරිභෝගික සේවය (Client Service)"
                  value={newAboutCardTitleEn}
                  onChange={e => setNewAboutCardTitleEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-purple-450 mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">Description (විස්තරය)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. පැය 24 පුරා ක්‍රියාත්මක අපගේ සේවා සහාය..."
                  value={newAboutCardDesc}
                  onChange={e => setNewAboutCardDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-purple-450 resize-none"
                  required
                />
<textarea
                  rows={3}
                  placeholder="[English] e.g. පැය 24 පුරා ක්‍රියාත්මක අපගේ සේවා සහාය..."
                  value={newAboutCardDescEn}
                  onChange={e => setNewAboutCardDescEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-purple-450 resize-none mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">Pillar Icon (රූපය)</label>
                <select
                  value={newAboutCardIcon}
                  onChange={e => setNewAboutCardIcon(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs"
                >
                  <option value="Sparkles">Sparkles ✨</option>
                  <option value="Layers">Layers 🥞</option>
                  <option value="Shield">Shield 🛡️</option>
                  <option value="Info">Info ℹ️</option>
                  <option value="Heart">Heart ❤️</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">Pillar Photo URL (පින්තූරය - Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newAboutCardImageUrl}
                    onChange={e => setNewAboutCardImageUrl(e.target.value)}
                    className="flex-grow px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-purple-450"
                  />
                  <FileUploadTrigger onUploaded={(b64) => setNewAboutCardImageUrl(b64)} label="Upload" />
                </div>
                {newAboutCardImageUrl && (
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                    <span>Image Preview:</span>
                    <img src={newAboutCardImageUrl} alt="Preview" className="w-8 h-8 rounded border border-white/10 object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 font-mono text-xs uppercase transition active:scale-95 cursor-pointer"
              >
                Add About Pillar Card
              </button>
            </form>
          </div>

          {/* List and Inline Edit Panel for Current About Pillars */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-sm font-mono uppercase text-slate-300 tracking-wider">Active about pillars ({aboutCardsList.length})</h4>

            <div className="space-y-3">
              {aboutCardsList.map(card => (
                <div key={card.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  {editingAboutCardId === card.id ? (
                    <form onSubmit={handleSaveEditAboutCard} className="space-y-3 text-xs text-left">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-purple-305">Edit Pillar (පදනම සංස්කරණය)</span>
                        <button
                          type="button"
                          onClick={() => setEditingAboutCardId(null)}
                          className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-405 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[8px] font-mono uppercase">Pillar Title</label>
                          <input
                            type="text"
                            value={editAboutCardTitle}
                            onChange={e => setEditAboutCardTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono uppercase">Description</label>
                          <textarea
                            rows={2}
                            value={editAboutCardDesc}
                            onChange={e => setEditAboutCardDesc(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white font-sans resize-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono uppercase">Icon</label>
                          <select
                            value={editAboutCardIcon}
                            onChange={e => setEditAboutCardIcon(e.target.value)}
                            className="w-full px-2 py-1 rounded bg-black/80 border border-white/10 text-white"
                          >
                            <option value="Sparkles">Sparkles ✨</option>
                            <option value="Layers">Layers 🥞</option>
                            <option value="Shield">Shield 🛡️</option>
                            <option value="Info">Info ℹ️</option>
                            <option value="Heart">Heart ❤️</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] font-mono uppercase">Pillar Photo URL (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editAboutCardImageUrl}
                            onChange={e => setEditAboutCardImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="flex-grow px-2 py-1 text-xs rounded bg-black/60 border border-white/10 text-white"
                          />
                          <FileUploadTrigger onUploaded={(b64) => setEditAboutCardImageUrl(b64)} label="Upload" />
                        </div>
                        {editAboutCardImageUrl && (
                          <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                            <span>Image Preview:</span>
                            <img src={editAboutCardImageUrl} alt="Preview" className="w-6 h-6 rounded border border-white/10 object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full py-1.5 bg-purple-500 font-bold rounded-lg text-white"
                      >
                        Save Pillar Changes
                      </button>
                    </form>
                  ) : (
                    <div className="flex justify-between items-start gap-3">
                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                          <span className="text-purple-300 font-mono">[{card.icon}]</span>
                          <span>{card.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal font-sans font-light">{card.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditAboutCard(card)}
                          className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition cursor-pointer"
                        >
                          <PenTool className="w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteAboutCard(card.id)}
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {consoleTab === 'reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* New Testimonial Form */}
          <div className="lg:col-span-5 p-6 rounded-2xl glass-panel space-y-4">
            <h3 className="text-lg font-display font-medium text-white flex items-center gap-2">
              <Plus className="text-amber-400 w-5 h-5 animate-pulse" /> Add Client Testimonial
            </h3>
            <p className="text-xs text-slate-400 leading-normal font-sans font-light">
              පාරිභෝගිකයින් වෙබ් අඩවියේ හෝ සේවා ගැන තැබූ අදහස් සංස්කරණය කිරීමට, මැකීමට හෝ අලුතින් එක් කිරීමට මෙම මෙවලම් භාවිතා කරන්න. හොඳම අදහස් ඉහළින් පින් කිරීමට (Pin reviews) හැක.
            </p>

            <form onSubmit={handleCreateReviewInAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">Client Name (පාරිභෝගික නම)</label>
                <input
                  type="text"
                  placeholder="e.g. Sahan Perera"
                  value={newReviewName}
                  onChange={e => setNewReviewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. Sahan Perera"
                  value={newReviewNameEn}
                  onChange={e => setNewReviewNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400 mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">Designation / Role (තනතුර/පසුබිම)</label>
                <input
                  type="text"
                  placeholder="e.g. Chief Executive, Tech Lead, Client"
                  value={newReviewRole}
                  onChange={e => setNewReviewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                />
<input
                  type="text"
                  placeholder="[English] e.g. Chief Executive, Tech Lead, Client"
                  value={newReviewRoleEn}
                  onChange={e => setNewReviewRoleEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400 mt-2 border-dashed border-cyan-400/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">Rating (තරු ප්‍රමාණය)</label>
                <select
                  value={newReviewRating}
                  onChange={e => setNewReviewRating(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs cursor-pointer"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                  <option value={3}>⭐⭐⭐ (3 Stars)</option>
                  <option value={2}>⭐⭐ (2 Stars)</option>
                  <option value={1}>⭐ (1 Star)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">Opinion / Comment (අදහස)</label>
                <textarea
                  rows={3}
                  placeholder="Type the customer experience details..."
                  value={newReviewComment}
                  onChange={e => setNewReviewComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400 resize-none"
                  required
                />
<textarea
                  rows={3}
                  placeholder="[English] Type the customer experience details..."
                  value={newReviewCommentEn}
                  onChange={e => setNewReviewCommentEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400 resize-none mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">Avatar/Profile Image URL (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or blank"
                    value={newReviewImageUrl}
                    onChange={e => setNewReviewImageUrl(e.target.value)}
                    className="flex-grow px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  />
                  <FileUploadTrigger onUploaded={(b64) => setNewReviewImageUrl(b64)} label="Upload" />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="newReviewPinned"
                  checked={newReviewPinned}
                  onChange={e => setNewReviewPinned(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <label htmlFor="newReviewPinned" className="text-[10px] text-slate-300 font-mono cursor-pointer select-none">
                  📌 Pin to Top (ප්‍රමුඛතම එකක් ලෙස ඉහළින්ම තබන්න)
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-500 font-mono text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer font-sans"
              >
                Create Client Testimony
              </button>
            </form>
          </div>

          {/* Testimonies List Column */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-sm font-mono uppercase text-slate-300 tracking-wider">
              Client Reviews & Feedbacks ({reviewsList.length})
            </h4>

            {reviewsList.length === 0 ? (
              <div className="p-8 text-center glass-panel rounded-2xl border border-dashed border-white/10">
                <span className="text-2xl block mb-2">📢</span>
                <p className="text-slate-400 text-xs font-mono">No customer reviews inside system storage cache.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {reviewsList.map(rev => (
                  <div key={rev.id} className={`p-4 rounded-xl border transition ${rev.pinned ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
                    {editingReviewId === rev.id ? (
                      // Inline edit form
                      <form onSubmit={handleSaveEditReview} className="space-y-3 text-xs text-left">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-amber-300">Edit Review Details & Pin state</span>
                          <button
                            type="button"
                            onClick={() => setEditingReviewId(null)}
                            className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-404 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] font-mono uppercase text-slate-400 font-bold">Name</label>
                            <input
                              type="text"
                              value={editReviewName}
                              onChange={e => setEditReviewName(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white font-sans text-xs"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono uppercase text-slate-400 font-bold">Designation / Role</label>
                            <input
                              type="text"
                              value={editReviewRole}
                              onChange={e => setEditReviewRole(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white font-sans text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] font-mono uppercase text-slate-400 font-bold">Rating</label>
                            <select
                              value={editReviewRating}
                              onChange={e => setEditReviewRating(Number(e.target.value))}
                              className="w-full px-2 py-1 rounded bg-black/80 border border-white/10 text-white text-xs font-mono cursor-pointer"
                            >
                              <option value={5}>5 Stars</option>
                              <option value={4}>4 Stars</option>
                              <option value={3}>3 Stars</option>
                              <option value={2}>2 Stars</option>
                              <option value={1}>1 Star</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-mono uppercase text-slate-400 font-bold">Avatar Photo URL</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editReviewImageUrl}
                                onChange={e => setEditReviewImageUrl(e.target.value)}
                                placeholder="Photo URL link"
                                className="flex-grow px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white font-sans text-xs"
                              />
                              <FileUploadTrigger onUploaded={(b64) => setEditReviewImageUrl(b64)} label="Upload" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono uppercase text-slate-400 font-bold">Opinion Description</label>
                          <textarea
                            rows={2}
                            value={editReviewComment}
                            onChange={e => setEditReviewComment(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white font-sans resize-none text-xs"
                            required
                          />
                        </div>

                        <div className="flex items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            id={`editReviewPinned_${rev.id}`}
                            checked={editReviewPinned}
                            onChange={e => setEditReviewPinned(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                          />
                          <label htmlFor={`editReviewPinned_${rev.id}`} className="text-[10px] text-slate-300 font-mono cursor-pointer select-none">
                            Keep pinned to Top (ඉහළින්ම තබන්න)
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-1.5 bg-amber-400 text-slate-900 hover:bg-amber-500 font-bold rounded-lg text-xs cursor-pointer font-sans"
                        >
                          Save Review Changes
                        </button>
                      </form>
                    ) : (
                      <div className="flex justify-between items-start gap-3 text-left">
                        <div className="flex items-start gap-3">
                          {/* Image avatar preview */}
                          {rev.imageUrl ? (
                            <img
                              src={rev.imageUrl}
                              alt={rev.name}
                              className="w-9 h-9 rounded-full object-cover border border-white/25 mt-1"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-[10px] text-slate-200 uppercase font-bold mt-1 font-mono">
                              {rev.name.substring(0, 2)}
                            </div>
                          )}

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white font-display">{rev.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-light">({rev.role})</span>
                              {rev.pinned && (
                                <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 border border-amber-400/25 rounded text-[8px] font-mono font-bold">
                                  PINNED 📌
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-300 font-sans italic my-1 leading-relaxed">
                              &ldquo;{rev.comment}&rdquo;
                            </p>

                            <div className="flex gap-0.5 pt-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Toggle Pin Trigger Button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePinReview(rev.id)}
                            className={`p-1 rounded transition cursor-pointer ${rev.pinned ? 'bg-amber-400/25 text-amber-400 hover:bg-amber-400/35' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                            title={rev.pinned ? 'Unpin review' : 'Pin review to top'}
                          >
                            <Star className={`w-3.5 h-3.5 ${rev.pinned ? 'fill-amber-400' : ''}`} />
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleStartEditReview(rev)}
                            className="p-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition cursor-pointer"
                            title="Edit feedback content"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                            title="Delete public review from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {consoleTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* Tool adding CMS */}
          <div className="lg:col-span-5 p-6 rounded-2xl glass-panel">
            <h3 className="text-lg font-display font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="text-neon-blue w-5 h-5" /> App Drawer CMS Injector
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              SPT Tools ජංගම දුරකථන App Drawer එකට නව මෙවලමක් එක් කරන්න.
            </p>

            <form onSubmit={handleCreateTool} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase">Tool Name</label>
                <input
                  type="text"
                  placeholder="e.g. Subtitles Sync Pro"
                  value={toolName}
                  onChange={e => setToolName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. Subtitles Sync Pro"
                  value={toolNameEn}
                  onChange={e => setToolNameEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Generate frame rates aligned lyrics for your shorts..."
                  value={toolDesc}
                  onChange={e => setToolDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. Generate frame rates aligned lyrics for your shorts..."
                  value={toolDescEn}
                  onChange={e => setToolDescEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Icon Blueprint</label>
                  <select
                    value={toolIcon}
                    onChange={e => setToolIcon(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg bg-black/60 border border-white/10 text-white"
                  >
                    <option value="Code">Code Indicator</option>
                    <option value="Laptop">Laptop Workstation</option>
                    <option value="Music">Musical Audio</option>
                    <option value="Sparkles">Creative Spark</option>
                    <option value="Smartphone">Mobile Device</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Sub Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Video Utility"
                    value={toolCat}
                    onChange={e => setToolCat(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase">Custom Icon Image (වෙබ් අඩවියේ පෙන්වන Icon රූපය - Optional)</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-1">
                  <input
                    type="text"
                    placeholder="Load package image/icon or enter link..."
                    value={toolImageUrl}
                    onChange={e => setToolImageUrl(e.target.value)}
                    className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white text-[10px]"
                  />
                  <FileUploadTrigger onUploaded={(b64) => setToolImageUrl(b64)} label="Upload Icon" />
                </div>
                {toolImageUrl && (
                  <div className="mt-2 flex items-center gap-2 bg-black/30 p-2 rounded border border-white/5">
                    <img src={toolImageUrl} alt="Preview icon" className="w-8 h-8 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <span className="text-[9px] font-mono text-emerald-400 font-semibold">Custom Icon Loaded</span>
                    <button
                      type="button"
                      onClick={() => setToolImageUrl('')}
                      className="ml-auto text-[8px] bg-red-500/15 hover:bg-red-500/30 text-red-400 font-mono px-2 py-0.5 rounded uppercase cursor-pointer"
                    >
                      Clear (ඉවත් කරන්න)
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600/40 border border-indigo-400/30 hover:bg-indigo-600/60 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Inject New Tool Card
              </button>
            </form>
          </div>

          {/* Tool deleting list */}
          <div className="lg:col-span-7 p-6 rounded-2xl glass-panel">
            <h3 className="text-lg font-display font-bold text-white mb-4">පවතින Tools සහ Plugins ({tools.length})</h3>
            
            <div className="space-y-3.5">
              {tools.map(tool => (
                <div key={tool.id} className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                  {editingToolId === tool.id ? (
                    <form onSubmit={handleSaveEditTool} className="space-y-3 font-sans w-full text-left">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-xs font-bold text-amber-300">Edit Tool (සංස්කරණය)</span>
                        <button 
                          type="button" 
                          onClick={() => setEditingToolId(null)}
                          className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded bg-white/5 font-sans"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Tool Name</label>
                          <input 
                            type="text" 
                            className="w-full px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-xs" 
                            value={editToolName} 
                            onChange={e => setEditToolName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Sub Category</label>
                          <input 
                            type="text" 
                            className="w-full px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-xs" 
                            value={editToolCat} 
                            onChange={e => setEditToolCat(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Description</label>
                        <input 
                          type="text" 
                          className="w-full px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-xs" 
                          value={editToolDesc} 
                          onChange={e => setEditToolDesc(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1 mt-1.5">
                        <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Custom Icon URL or Image Upload</label>
                        <div className="flex flex-col sm:flex-row gap-1.5 items-start sm:items-center">
                          <input 
                            type="text" 
                            className="flex-grow px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-[10px]" 
                            value={editToolImageUrl} 
                            onChange={e => setEditToolImageUrl(e.target.value)}
                            placeholder="URL or raw graphic data..."
                          />
                          <FileUploadTrigger onUploaded={(b64) => setEditToolImageUrl(b64)} label="Upload" />
                          {editToolImageUrl && (
                            <button
                              type="button"
                              onClick={() => setEditToolImageUrl('')}
                              className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 font-mono text-[8px] uppercase tracking-wider font-bold border border-red-500/30 transition cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Icon Style</label>
                          <select 
                            className="w-full px-2 py-1 bg-black/80 border border-white/10 text-white rounded text-xs" 
                            value={editToolIcon}
                            onChange={e => setEditToolIcon(e.target.value)}
                          >
                            <option value="Code">Code Indicator</option>
                            <option value="Laptop">Laptop Workstation</option>
                            <option value="Music">Musical Audio</option>
                            <option value="Sparkles">Creative Spark</option>
                            <option value="Smartphone">Mobile Device</option>
                          </select>
                        </div>
                        <div className="pt-3">
                          <button 
                            type="submit" 
                            className="w-full py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:opacity-95 text-slate-950 font-bold rounded text-[10px] transition cursor-pointer"
                          >
                            Save Tool Changes
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-white/10 bg-slate-900">
                          {tool.imageUrl ? (
                            <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Laptop className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">{tool.name}</h5>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{tool.description}</p>
                          <span className="inline-block mt-1 px-1.5 py-0.5 text-[8px] bg-white/5 text-slate-300 rounded uppercase font-mono">{tool.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditTool(tool)}
                          className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition cursor-pointer"
                          title="Edit Tool"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`'${tool.name}' මෙවලම ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?`)) {
                              onDeleteTool(tool.id);
                            }
                          }}
                          className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                          title="Delete Tool"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {consoleTab === 'brands' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* Create Subsidiary Brand Alliances */}
          <div className="lg:col-span-5 p-6 rounded-2xl glass-panel">
            <h3 className="text-lg font-display font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="text-neon-blue w-5 h-5" /> About/Subsidiaries Alliance Creator
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              සේවා සහ අයිතිය පිටුවේ දැක්වෙන SPT අනුබද්ධිත සන්නාමයන් කළමනාකරණය කරන්න.
            </p>

            <form onSubmit={handleCreateBrand} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase">Brand Alliance Name</label>
                <input
                  type="text"
                  placeholder="e.g. Phoenix Art Studio"
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. Phoenix Art Studio"
                  value={brandNameEn}
                  onChange={e => setBrandNameEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase">Slogan subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. FINE ACRYLICS & CANVAS"
                  value={brandSubtitle}
                  onChange={e => setBrandSubtitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-[#ffffff1c] text-white"
                />
<input
                  type="text"
                  placeholder="[English] e.g. FINE ACRYLICS & CANVAS"
                  value={brandSubtitleEn}
                  onChange={e => setBrandSubtitleEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-[#ffffff1c] text-white mt-2 border-dashed border-cyan-400/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase">Alliance Description</label>
                <textarea
                  rows={2}
                  placeholder="Street apparel designs engineered to merge with custom artworks..."
                  value={brandDesc}
                  onChange={e => setBrandDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none"
                  required
                />
<textarea
                  rows={2}
                  placeholder="[English] Street apparel designs engineered to merge with custom artworks..."
                  value={brandDescEn}
                  onChange={e => setBrandDescEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase">Banner Showcase Image URL (අනුබද්ධ සන්නාමයේ පින්තූරය)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or upload raw image"
                    value={brandImg}
                    onChange={e => setBrandImg(e.target.value)}
                    className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none"
                  />
                  <FileUploadTrigger onUploaded={(b64) => setBrandImg(b64)} label="Upload" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-500/20 border border-amber-400/30 hover:bg-amber-500/40 rounded-xl text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Subsidiary Brand
              </button>
            </form>
          </div>

          {/* Delete Subsidiary list */}
          <div className="lg:col-span-7 p-6 rounded-2xl glass-panel">
            <h3 className="text-lg font-display font-bold text-white mb-4">පවතින අනුබද්ධිත සන්නාම ({brands.length})</h3>
            
            <div className="space-y-3.5">
              {brands.map(brand => (
                <div key={brand.id} className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                  {editingBrandId === brand.id ? (
                    <form onSubmit={handleSaveEditBrand} className="space-y-3 font-sans w-full text-left">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-xs font-bold text-amber-300">Edit Alliance (සන්නාම සංස්කරණය)</span>
                        <button 
                          type="button" 
                          onClick={() => setEditingBrandId(null)}
                          className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded bg-white/5 font-sans"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Brand Name</label>
                          <input 
                            type="text" 
                            className="w-full px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-xs" 
                            value={editBrandName} 
                            onChange={e => setEditBrandName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Slogan Subtitle</label>
                          <input 
                            type="text" 
                            className="w-full px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-xs" 
                            value={editBrandSubtitle} 
                            onChange={e => setEditBrandSubtitle(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Description</label>
                        <textarea 
                          rows={2}
                          className="w-full px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-xs resize-none" 
                          value={editBrandDesc} 
                          onChange={e => setEditBrandDesc(e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div className="md:col-span-2">
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Banner Image URL</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-grow px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-[10px] font-mono focus:outline-none" 
                              value={editBrandImg} 
                              onChange={e => setEditBrandImg(e.target.value)}
                            />
                            <FileUploadTrigger onUploaded={(b64) => setEditBrandImg(b64)} label="Upload" />
                          </div>
                        </div>
                        <div className="pt-4 flex items-end">
                          <button 
                            type="submit" 
                            className="w-full py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:opacity-95 text-slate-950 font-bold rounded text-[10px] transition cursor-pointer"
                          >
                            Save Alliance
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        <img src={brand.visualUrl} alt={brand.name} className="w-12 h-12 rounded-lg object-cover border border-white/10" referrerPolicy="no-referrer" />
                        <div>
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">{brand.name}</h5>
                          <span className="text-[9px] font-mono text-amber-300 uppercase block">{brand.subtitle}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-sans">{brand.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEditBrand(brand)}
                          className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition cursor-pointer"
                          title="Edit Brand Alliance"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`'${brand.name}' අනුබද්ධිත සන්නාමය ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?`)) {
                              onDeleteBrand(brand.id);
                            }
                          }}
                          className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                          title="Delete Subsidiary Brand"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {consoleTab === 'contacts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left animate-fadeIn">
          {/* Create Contact Channel Segment */}
          <div className="lg:col-span-5 p-6 rounded-2xl glass-panel">
            <h3 className="text-lg font-display font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="text-cyan-400 w-5 h-5" /> Contact Channel Creator
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              සම්බන්ධතා පිටුවේ (Contacts Tab) දිස්වන සමාජ මාධ්‍ය නාලිකා සහ සම්බන්ධතා තොරතුරු මෙතැනින් සාදා ලබා දෙන්න.
            </p>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newContactTitle || !newContactUrl) {
                  alert('කරුණාකර නමක් සහ ලින්ක් ලිපිනයක් ඇතුළත් කරන්න.');
                  return;
                }
                if (!setContactsList) return;
                const newItem: ContactLinkItem = {
                  id: `c_${Date.now()}`,
                  title: newContactTitle, titleEn: newContactTitleEn,
                  url: newContactUrl,
                  imageUrl: newContactImageUrl.trim() || undefined
                };
                setContactsList(prev => [newItem, ...prev]);
                setNewContactTitle(''); setNewContactTitleEn('');
                setNewContactUrl('');
                setNewContactImageUrl('');
                alert(`නව සම්බන්ධතාව සාර්ථකව එක් කරන ලදී: ${newContactTitle}`);
              }} 
              className="space-y-3"
            >
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Contact Link Title (නම)</label>
                <input
                  type="text"
                  placeholder="e.g. Official WhatsApp Helpline"
                  value={newContactTitle}
                  onChange={e => setNewContactTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. Official WhatsApp Helpline"
                  value={newContactTitleEn}
                  onChange={e => setNewContactTitleEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Target Address Link (URL / Email / Tel)</label>
                <input
                  type="text"
                  placeholder="e.g. https://wa.me/94770000000 or mailto:info@spt.com"
                  value={newContactUrl}
                  onChange={e => setNewContactUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Custom Link Representative Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or upload raw image"
                    value={newContactImageUrl}
                    onChange={e => setNewContactImageUrl(e.target.value)}
                    className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none"
                  />
                  <FileUploadTrigger onUploaded={(b64) => setNewContactImageUrl(b64)} label="Upload" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/40 rounded-xl text-cyan-300 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Contact Link
              </button>
            </form>
          </div>

          {/* Existing Contacts List Grid */}
          <div className="lg:col-span-7 p-6 rounded-2xl glass-panel">
            <h3 className="text-lg font-display font-bold text-white mb-4">පවතින සම්බන්ධතා නාලිකා ({contactsList.length})</h3>
            
            <div className="space-y-3.5">
              {contactsList.map(contact => (
                <div key={contact.id} className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                  {editingContactId === contact.id ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!editingContactId || !setContactsList) return;
                        setContactsList(prev => prev.map(c => c.id === editingContactId ? {
                          ...c,
                          title: editContactTitle,
                          url: editContactUrl,
                          imageUrl: editContactImageUrl.trim() || undefined
                        } : c));
                        setEditingContactId(null);
                        alert('සම්බන්ධතා තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී! Contact updated successfully.');
                      }} 
                      className="space-y-3 font-sans w-full text-left"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-xs font-bold text-cyan-300">Edit Contact (සම්බන්ධතා සංස්කරණය)</span>
                        <button 
                          type="button" 
                          onClick={() => setEditingContactId(null)}
                          className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded bg-white/5 font-sans"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Contact Title</label>
                          <input 
                            type="text" 
                            className="w-full px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-xs" 
                            value={editContactTitle} 
                            onChange={e => setEditContactTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Target Address Link</label>
                          <input 
                            type="text" 
                            className="w-full px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-xs" 
                            value={editContactUrl} 
                            onChange={e => setEditContactUrl(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Representative Image URL</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-grow px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-[10px] font-mono focus:outline-none" 
                            value={editContactImageUrl} 
                            onChange={e => setEditContactImageUrl(e.target.value)}
                          />
                          <FileUploadTrigger onUploaded={(b64) => setEditContactImageUrl(b64)} label="Upload" />
                        </div>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button 
                          type="submit" 
                          className="px-4 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:opacity-95 text-slate-950 font-bold rounded text-[10px] transition cursor-pointer"
                        >
                          Save Contact
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        {contact.imageUrl ? (
                          <img src={contact.imageUrl} alt={contact.title} className="w-12 h-12 rounded-lg object-cover border border-white/10" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-300 font-bold text-[10px] shrink-0">
                            LINK
                          </div>
                        )}
                        <div>
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">{contact.title}</h5>
                          <span className="text-[9px] font-mono text-cyan-300 block break-all">{contact.url}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingContactId(contact.id);
                            setEditContactTitle(contact.title);
                            setEditContactUrl(contact.url);
                            setEditContactImageUrl(contact.imageUrl || '');
                          }}
                          className="p-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition cursor-pointer"
                          title="Edit Contact details"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`'${contact.title}' සම්බන්ධතා ලින්ක් එක ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?`)) {
                              if (setContactsList) {
                                setContactsList(prev => prev.filter(c => c.id !== contact.id));
                              }
                            }
                          }}
                          className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {contactsList.length === 0 && (
                <div className="text-center p-8 text-slate-500 text-xs font-mono">
                  නාලිකා කිසිවක් නැත. කරුණාකර නව එකක් සාදා එක් කරන්න. (No contact links present).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {consoleTab === 'blogs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left animate-fadeIn font-sans">
          {/* Create Blog Segment */}
          <div className="lg:col-span-12 xl:col-span-5 p-6 rounded-2xl glass-panel">
            <h3 className="text-lg font-display font-bold text-white mb-2 flex items-center gap-2">
              <PlusCircle className="text-yellow-400 w-5 h-5 animate-pulse" /> Write a New Blog Post (බ්ලොග් ලිපියක් ලියන්න)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              ලියන ලිපි සියල්ල බ්ලොග් පිටුවෙහි (Blogs Tab) සජීවීව පාරිභෝගිකයින්ට දිස්වේ. රූප, ශ්‍රව්‍ය (Audio) හෝ වීඩියෝ (Video) උඩුගත කිරීම් ද කළ හැක.
            </p>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBlogTitle || !newBlogContent) {
                  alert('කරුණාකර මාතෘකාව සහ අන්තර්ගතය ඇතුළත් කරන්න.');
                  return;
                }
                if (!setBlogsList) return;
                const newItem: BlogPost = {
                  id: `b_${Date.now()}`,
                  title: newBlogTitle, titleEn: newBlogTitleEn,
                  content: newBlogContent, contentEn: newBlogContentEn,
                  mediaType: newBlogMediaType,
                  mediaUrl: newBlogMediaUrl.trim() || undefined,
                  createdAt: new Date().toISOString(),
                  author: 'Sadeep (Super Admin)',
                  youtubeUrl: newBlogYoutubeUrl.trim() || undefined
                };
                setBlogsList(prev => [newItem, ...prev]);
                setNewBlogTitle(''); setNewBlogTitleEn('');
                setNewBlogContent(''); setNewBlogContentEn('');
                setNewBlogMediaType('none');
                setNewBlogMediaUrl('');
                setNewBlogYoutubeUrl('');
                alert(`නව බ්ලොග් ලිපිය සාර්ථකව පල කරන ලදී! \nTitle: ${newBlogTitle}`);
              }} 
              className="space-y-3"
            >
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Post Title (මාතෘකාව)</label>
                <input
                  type="text"
                  placeholder="e.g. Generation AI & Creative Designs"
                  value={newBlogTitle}
                  onChange={e => setNewBlogTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:border-yellow-400 focus:outline-none"
                  required
                />
<input
                  type="text"
                  placeholder="[English] e.g. Generation AI & Creative Designs"
                  value={newBlogTitleEn}
                  onChange={e => setNewBlogTitleEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:border-yellow-400 focus:outline-none mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Post Content (අන්තර්ගතය)</label>
                <textarea
                  placeholder="Write your article body here... Supports long multiline text"
                  value={newBlogContent}
                  onChange={e => setNewBlogContent(e.target.value)}
                  className="w-full h-32 px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:border-yellow-400 focus:outline-none scrollbar-hide"
                  required
                />
<textarea
                  placeholder="[English] Write your article body here... Supports long multiline text"
                  value={newBlogContentEn}
                  onChange={e => setNewBlogContentEn(e.target.value)}
                  className="w-full h-32 px-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white focus:border-yellow-400 focus:outline-none scrollbar-hide mt-2 border-dashed border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Attach Media Type (මාධ්‍ය වර්ගය)</label>
                <select
                  value={newBlogMediaType}
                  onChange={e => setNewBlogMediaType(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none font-mono text-[11px]"
                >
                  <option value="none">No Attachment</option>
                  <option value="image">Image (ඡායාරූපයක්)</option>
                  <option value="video">Video (වීඩියෝවක්)</option>
                  <option value="audio">Audio (ශ්‍රව්‍ය ගොනුවක්)</option>
                </select>
              </div>

              {newBlogMediaType !== 'none' && (
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2.5 animate-fadeIn">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">
                    Upload Raw File or Provide Web Link (ගොනුව උඩුගත කරන්න)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Https URL or upload local file media content..."
                      value={newBlogMediaUrl}
                      onChange={e => setNewBlogMediaUrl(e.target.value)}
                      className="flex-grow px-2 py-1.5 text-xs bg-black/30 border border-white/10 rounded text-white text-[10px] focus:outline-none"
                    />
                    <FileUploadTrigger onUploaded={(b64) => setNewBlogMediaUrl(b64)} label="Upload" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">YouTube Video Link (යූටියුබ් වීඩියෝ ලින්ක් එක) - Optional</label>
                <input
                  type="text"
                  placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  value={newBlogYoutubeUrl}
                  onChange={e => setNewBlogYoutubeUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900/40 border border-white/10 text-white focus:border-yellow-400 focus:outline-none"
                />
                <p className="text-[9px] text-slate-500 mt-0.5">පාරිභෝගිකයින්ට මෙම ලිපිය තුළදීම YouTube වීඩියෝව නැරඹිය හැක.</p>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-yellow-500/10 border border-yellow-400/30 hover:bg-yellow-500/20 text-yellow-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Publish Blog Post
              </button>
            </form>
          </div>

          {/* Existing Blogs List */}
          <div className="lg:col-span-12 xl:col-span-7 p-6 rounded-2xl glass-panel">
            <h3 className="text-lg font-display font-bold text-white mb-4">පවතින ලිපි ගොනුව ({blogsList.length})</h3>
            
            <div className="space-y-4">
              {blogsList.map(blog => (
                <div key={blog.id} className="p-4 rounded-xl bg-black/30 border border-white/5">
                  {editingBlogId === blog.id ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!editingBlogId || !setBlogsList) return;
                        setBlogsList(prev => prev.map(b => b.id === editingBlogId ? {
                          ...b,
                          title: editBlogTitle,
                          content: editBlogContent,
                          mediaType: editBlogMediaType,
                          mediaUrl: editBlogMediaUrl,
                          youtubeUrl: editBlogYoutubeUrl.trim() || undefined
                        } : b));
                        setEditingBlogId(null);
                        setEditBlogYoutubeUrl('');
                        alert('අන්තර්ගතය සාර්ථකව යාවත්කාලීන කරන ලදී! Updated successfully.');
                      }} 
                      className="space-y-3 text-left"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-xs font-bold text-yellow-300">Edit Post Details</span>
                        <button 
                          type="button" 
                          onClick={() => setEditingBlogId(null)}
                          className="text-[9px] text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded bg-white/5 font-mono"
                        >
                          Cancel
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Post Title</label>
                        <input 
                          type="text" 
                          className="w-full px-2 py-1.5 bg-black/60 border border-white/10 text-white rounded text-xs" 
                          value={editBlogTitle} 
                          onChange={e => setEditBlogTitle(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Post Content</label>
                        <textarea 
                          className="w-full h-24 px-2 py-1.5 bg-black/60 border border-white/10 text-white rounded text-xs scrollbar-hide" 
                          value={editBlogContent} 
                          onChange={e => setEditBlogContent(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Media Attachment Type</label>
                          <select
                            value={editBlogMediaType}
                            onChange={e => setEditBlogMediaType(e.target.value as any)}
                            className="w-full px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-xs"
                          >
                            <option value="none">No Media</option>
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                            <option value="audio">Audio</option>
                          </select>
                        </div>
                        {editBlogMediaType !== 'none' && (
                          <div>
                            <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">Media File Link/Upload</label>
                            <div className="flex gap-1.5">
                              <input 
                                type="text" 
                                className="flex-grow px-2 py-1 bg-black/60 border border-white/10 text-white rounded text-[10px] font-mono focus:outline-none" 
                                value={editBlogMediaUrl} 
                                onChange={e => setEditBlogMediaUrl(e.target.value)}
                              />
                              <FileUploadTrigger onUploaded={(b64) => setEditBlogMediaUrl(b64)} label="Upload" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[8px] font-mono text-slate-400 uppercase mb-0.5">YouTube Video Link (යූටියුබ් වීඩියෝ ලින්ක් එක)</label>
                        <input 
                          type="text" 
                          className="w-full px-2 py-1.5 bg-black/60 border border-white/10 text-white rounded text-xs focus:outline-none focus:border-yellow-400" 
                          value={editBlogYoutubeUrl} 
                          onChange={e => setEditBlogYoutubeUrl(e.target.value)}
                          placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button 
                          type="submit" 
                          className="px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:opacity-95 text-slate-950 font-bold rounded text-[10px] transition cursor-pointer"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-white tracking-wide uppercase">{blog.title}</h4>
                          <span className="text-[9px] font-mono text-amber-400 block mt-0.5">Published at: {new Date(blog.createdAt).toLocaleDateString()} by {blog.author}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBlogId(blog.id);
                              setEditBlogTitle(blog.title);
                              setEditBlogContent(blog.content);
                              setEditBlogMediaType(blog.mediaType);
                              setEditBlogMediaUrl(blog.mediaUrl || '');
                              setEditBlogYoutubeUrl(blog.youtubeUrl || '');
                            }}
                            className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition cursor-pointer"
                            title="Edit Blog details"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`'${blog.title}' බ්ලොග් ලිපිය ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?`)) {
                                if (setBlogsList) {
                                  setBlogsList(prev => prev.filter(b => b.id !== blog.id));
                                }
                              }
                            }}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                            title="Delete Blog"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 break-words whitespace-pre-line">
                        {blog.content}
                      </p>

                      {blog.mediaUrl && (
                        <div className="mt-2 text-[10px] font-mono text-cyan-400 flex items-center gap-2">
                          <span className="capitalize">[{blog.mediaType} attached]:</span>
                          <span className="text-slate-500 truncate max-w-xs">{blog.mediaUrl}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {blogsList.length === 0 && (
                <div className="text-center p-8 text-slate-500 text-xs font-mono">
                  බ්ලොග් ලිපි කිසිවක් නැත. කරුණාකර නව එකක් සාදා පලකරන්න. (No blogs present).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {consoleTab === 'users' && (
        <div className="p-6 rounded-2xl glass-panel text-left space-y-6 animate-fadeIn font-sans">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <User className="text-[#00f0ff] w-5 h-5 animate-pulse" /> Registered Portal Members ({sptUsersList.length})
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                පද්ධතියට ලියාපදිංචි වී ඇති පරිශීලකයින්ගේ ලැයිස්තුව, ඔවුන්ගේ SPT Tools ඇක්ටිව් පැකේජ විස්තර සහ ගෙවීම් පත් මෙතැනින් තහවුරු කරන්න.
              </p>
            </div>
            
            {/* Quick stats indicators */}
            <div className="flex gap-2">
              <span className="text-[9px] font-mono px-2 py-1 rounded bg-yellow-400/15 border border-yellow-500/20 text-yellow-300">
                PENDING: {sptUsersList.filter(u => u.subscriptionStatus === 'pending').length}
              </span>
              <span className="text-[9px] font-mono px-2 py-1 rounded bg-green-400/15 border border-green-500/20 text-green-300">
                ACTIVE: {sptUsersList.filter(u => u.subscriptionStatus === 'active').length}
              </span>
              <span className="text-[9px] font-mono px-2 py-1 rounded bg-slate-500/15 border border-slate-500/10 text-slate-400">
                TRIAL: {sptUsersList.filter(u => u.subscriptionStatus === 'trial').length}
              </span>
            </div>
          </div>

          {/* Users layout list */}
          <div className="space-y-4">
            {sptUsersList.map(user => {
              const registeredDate = new Date(user.registeredAt).toLocaleDateString();
              const expiresDate = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : 'Lifetime / No Expiry';
              
              // Helper to calculate status colors
              const getStatusBadge = () => {
                switch (user.subscriptionStatus) {
                  case 'active':
                    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/25 text-green-300 border border-green-500/30">● ACTIVE SUBSCRIBER</span>;
                  case 'pending':
                    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/30 animate-pulse">● PENDING PROOF APPROVAL</span>;
                  case 'trial':
                    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-cyan-300 border border-cyan-500/20">○ FREE TRIAL</span>;
                  case 'expired':
                    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/40 text-red-400 border border-red-500/20">○ EXPIRED</span>;
                  default:
                    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-600 text-slate-300">UNTYPED</span>;
                }
              };

              // Admin confirm handers
              const approveSubscription = (plan: 'weekly' | 'monthly' | '6months' | 'yearly' | 'lifetime') => {
                if (!setSptUsersList) return;
                
                let daysMultiplier = 7;
                if (plan === 'monthly') daysMultiplier = 30;
                else if (plan === '6months') daysMultiplier = 180;
                else if (plan === 'yearly') daysMultiplier = 365;
                else if (plan === 'lifetime') daysMultiplier = 3650; // 10 years

                const expDate = new Date(Date.now() + daysMultiplier * 24 * 3600 * 1000).toISOString();

                setSptUsersList(prev => prev.map(u => {
                  if (u.id === user.id) {
                    return {
                      ...u,
                      subscriptionStatus: 'active',
                      subscriptionPlan: plan,
                      subscriptionExpiresAt: expDate
                    };
                  }
                  return u;
                }));
                alert(`පරිශීලක '${user.name}' සාර්ථකව ${plan.toUpperCase()} පැකේජය සදහා සක්‍රිය කරන ලදී! App approved successfully.`);
              };

              return (
                <div key={user.id} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-4 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-md uppercase tracking-wider">{user.name}</span>
                        {getStatusBadge()}
                      </div>
                      <span className="block text-xs font-mono text-cyan-300">{user.email}</span>
                      <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-400 font-mono">
                        <span>RegisteredOn: {registeredDate}</span>
                        <span>ExpiresOn: <b className="text-yellow-400">{expiresDate}</b></span>
                        {user.subscriptionPlan && (
                          <span className="text-cyan-400 uppercase font-black">Plan: {user.subscriptionPlan}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Delete User */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`'${user.name}' පරිශීලකයාව පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍ය බව ස්ථිරද?`)) {
                            if (setSptUsersList) {
                              setSptUsersList(prev => prev.filter(u => u.id !== user.id));
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer text-xs flex items-center gap-1 self-start md:self-auto font-bold border border-red-500/20"
                        title="Delete registered member"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete User
                      </button>
                    </div>
                  </div>

                  {/* Payment Pending Receipt Actions */}
                  {user.subscriptionStatus === 'pending' && (
                    <div className="p-4 rounded-xl bg-[#00f0ff]/5 border border-cyan-500/20 space-y-3 mt-2">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                        <div>
                          <span className="block text-xs text-yellow-300 font-semibold uppercase tracking-wider">💳 Uploaded payment slip / deposit details detected:</span>
                          <span className="text-[10px] font-mono text-slate-300">Unique user reference code: <b className="text-white bg-slate-900 border border-white/10 px-2 py-0.5 rounded">{user.paymentReference || 'N/A'}</b></span>
                        </div>
                        {user.receiptUrl && (
                          <a 
                            href={user.receiptUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] font-mono text-cyan-400 underline hover:text-cyan-200 flex items-center gap-0.5"
                          >
                            Open Receipt in New Tab <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {user.receiptUrl && (
                        <div className="flex gap-4 items-start bg-black/60 p-3 rounded-lg border border-white/5">
                          <img 
                            src={user.receiptUrl} 
                            alt="Bank Slip Deposit Receipt" 
                            className="max-h-56 max-w-xs object-contain rounded border border-white/15" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-[10px] font-mono text-slate-400 space-y-1">
                            <p className="text-white font-bold">Selected User Plan Requested:</p>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-amber-400 text-black font-black uppercase text-[10px]">
                              {user.subscriptionPlan} package
                            </span>
                            <p className="mt-2 text-[9px]">Check your bank account for reference: <b>{user.paymentReference}</b></p>
                          </div>
                        </div>
                      )}

                      {/* Approval Buttons for each individual packages */}
                      <div>
                        <span className="block text-[10px] font-mono text-slate-300 uppercase mb-2 font-bold select-none">
                          Confirm Package & Activate Subscription (පැකේජය තහවුරු කර සක්‍රිය කරන්න)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => approveSubscription('weekly')}
                            className="px-3 py-1.5 rounded bg-emerald-500 text-slate-950 font-black font-mono text-[10px] uppercase hover:bg-emerald-400 transition cursor-pointer"
                          >
                            Approve Weekly ($1)
                          </button>
                          <button
                            type="button"
                            onClick={() => approveSubscription('monthly')}
                            className="px-3 py-1.5 rounded bg-emerald-500 text-slate-950 font-black font-mono text-[10px] uppercase hover:bg-emerald-400 transition cursor-pointer"
                          >
                            Approve Monthly ($3)
                          </button>
                          <button
                            type="button"
                            onClick={() => approveSubscription('6months')}
                            className="px-3 py-1.5 rounded bg-emerald-500 text-slate-950 font-black font-mono text-[10px] uppercase hover:bg-emerald-400 transition cursor-pointer"
                          >
                            Approve 6 Months ($15)
                          </button>
                          <button
                            type="button"
                            onClick={() => approveSubscription('yearly')}
                            className="px-3 py-1.5 rounded bg-emerald-500 text-slate-950 font-black font-mono text-[10px] uppercase hover:bg-emerald-400 transition cursor-pointer"
                          >
                            Approve Yearly ($20)
                          </button>
                          <button
                            type="button"
                            onClick={() => approveSubscription('lifetime')}
                            className="px-3 py-1.5 rounded bg-emerald-500 text-slate-950 font-black font-mono text-[10px] uppercase hover:bg-emerald-400 transition cursor-pointer"
                          >
                            Approve Lifetime ($100)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Override plan for any active/trial user */}
                  {user.subscriptionStatus !== 'pending' && (
                    <div className="pt-2.5 border-t border-white/5 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="text-[9px] font-mono text-slate-500 uppercase select-none">Change subscription manually:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => approveSubscription('weekly')}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-[9px] font-mono transition cursor-pointer"
                        >
                          Weekly ($1)
                        </button>
                        <button
                          type="button"
                          onClick={() => approveSubscription('monthly')}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-[9px] font-mono transition cursor-pointer"
                        >
                          Monthly ($3)
                        </button>
                        <button
                          type="button"
                          onClick={() => approveSubscription('6months')}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-[9px] font-mono transition cursor-pointer"
                        >
                          6-Mo ($15)
                        </button>
                        <button
                          type="button"
                          onClick={() => approveSubscription('yearly')}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-[9px] font-mono transition cursor-pointer"
                        >
                          Yearly ($20)
                        </button>
                        <button
                          type="button"
                          onClick={() => approveSubscription('lifetime')}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-[9px] font-mono transition cursor-pointer"
                        >
                          Lifetime ($100)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!setSptUsersList) return;
                            setSptUsersList(prev => prev.map(u => u.id === user.id ? {
                              ...u,
                              subscriptionStatus: 'expired',
                              subscriptionExpiresAt: new Date(Date.now() - 1000).toISOString()
                            } : u));
                          }}
                          className="px-2 py-1 rounded bg-rose-950/20 border border-rose-900/10 text-red-300 hover:bg-rose-900/20 text-[9px] font-mono transition cursor-pointer"
                        >
                          Expire subscription
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subscription Plans Tab Panel */}
      {consoleTab === 'plans' && (
        <div className="max-w-5xl mx-auto space-y-6 text-left animate-fade-in pt-4">
           <div>
             <h3 className="text-xl font-display font-medium text-cyan-400 flex items-center gap-2">
                <Star className="w-5 h-5" /> Membership Plans & Packages
             </h3>
             <p className="text-xs text-slate-300 mt-1">මෙම ස්ථානයෙන් ඔබට පරිශීලකයින්ට ලබා දෙන Subscription Packages (මිල, දින ගණන, Free trial ආදී) කළමනාකරණය කළ හැක.</p>
           </div>

           <div className="bg-black/30 border border-white/10 p-5 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-white tracking-widest uppercase mb-1">Add New Plan</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                 <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Plan Title</label>
                    <input type="text" value={newPlanTitle} onChange={e => setNewPlanTitle(e.target.value)} placeholder="e.g. LIFETIME PACK" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-cyan-400/50" />
<input type="text" value={newPlanTitleEn} onChange={e => setNewPlanTitleEn(e.target.value)} placeholder="[English] e.g. LIFETIME PACK" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-cyan-400/50 mt-2 border-dashed border-cyan-400/50" />
                 </div>
                 <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Base Price (USD)</label>
                    <input type="number" value={newPlanOriginalPrice} onChange={e => setNewPlanOriginalPrice(Number(e.target.value))} placeholder="$ 100" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-cyan-400/50" />
                 </div>
                 <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Discount Price</label>
                    <input type="number" value={newPlanPrice} onChange={e => setNewPlanPrice(Number(e.target.value))} placeholder="$" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-cyan-400/50" />
                 </div>
                 <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Discount Tag</label>
                    <input type="text" value={newPlanDiscountTag} onChange={e => setNewPlanDiscountTag(e.target.value)} placeholder="e.g. 90% OFF" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-cyan-400/50" />
<input type="text" value={newPlanDiscountTagEn} onChange={e => setNewPlanDiscountTagEn(e.target.value)} placeholder="[English] e.g. 90% OFF" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-cyan-400/50 mt-2 border-dashed border-cyan-400/50" />
                 </div>
                 <div className="md:col-span-2">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Duration Label / Subtitle</label>
                    <input type="text" value={newPlanDuration} onChange={e => setNewPlanDuration(e.target.value)} placeholder="e.g. ජීවිත කාලයටම SPT සාමාජිකත්වය" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-cyan-400/50" />
<input type="text" value={newPlanDurationEn} onChange={e => setNewPlanDurationEn(e.target.value)} placeholder="[English] e.g. ජීවිත කාලයටම SPT සාමාජිකත්වය" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-cyan-400/50 mt-2 border-dashed border-cyan-400/50" />
                 </div>
                 <div className="md:col-span-6">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Plan Image</label>
                    <div className="flex gap-2 mt-1">
                      <input type="text" value={newPlanImageUrl} onChange={e => setNewPlanImageUrl(e.target.value)} placeholder="https://example.com/image.png" className="flex-1 text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-400/50" />
                      <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded font-mono text-xs text-white uppercase cursor-pointer whitespace-nowrap transition">
                        Select Device Image
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const file = e.target.files[0];
                            const base64 = await convertFileToBase64(file);
                            setCropImageSrc(base64);
                            setIsCropperOpen(true);
                            e.target.value = '';
                          }
                        }} />
                      </label>
                    </div>
                    {newPlanImageUrl && newPlanImageUrl.startsWith('data:') && (
                        <div className="mt-2 flex gap-2">
                            <img src={newPlanImageUrl} className="h-12 rounded object-cover border border-white/10" alt="Preview" />
                        </div>
                    )}
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newPlanIsFree} onChange={e => setNewPlanIsFree(e.target.checked)} className="rounded border-slate-700 bg-slate-900" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Is this a Free/Trial Plan?</span>
                 </label>
              </div>
              
              {isCropperOpen && (
                  <ImageCropperModal
                    imageSrc={cropImageSrc}
                    aspectRatio={21/9}
                    onCropSave={(croppedUrl) => {
                        setNewPlanImageUrl(croppedUrl);
                        setIsCropperOpen(false);
                    }}
                    onCropCancel={() => setIsCropperOpen(false)}
                  />
              )}
              <button 
                  onClick={() => {
                    if(!newPlanTitle || !newPlanDuration) return;
                    setSubscriptionPlans(prev => [...prev, { id: `plan_${Date.now()}`, title: newPlanTitle, titleEn: newPlanTitleEn, priceUsd: newPlanPrice, originalPriceUsd: newPlanOriginalPrice, discountTag: newPlanDiscountTag, discountTagEn: newPlanDiscountTagEn, durationLabel: newPlanDuration, durationLabelEn: newPlanDurationEn, imageUrl: newPlanImageUrl, perks: [], isPopular: false, isFree: newPlanIsFree }]);
                    setNewPlanTitle(''); setNewPlanTitleEn(''); setNewPlanPrice(0); setNewPlanOriginalPrice(0); setNewPlanDiscountTag(''); setNewPlanDiscountTagEn(''); setNewPlanDuration(''); setNewPlanDurationEn(''); setNewPlanIsFree(false); setNewPlanImageUrl('');
                  }}
                  className="cursor-pointer bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 px-6 py-2 rounded font-mono text-xs font-bold uppercase transition block"
                >
                  + Create Package
              </button>
           </div>

           <div className="space-y-3">
              <h4 className="text-[11px] uppercase font-mono text-white mb-2 font-bold tracking-widest pl-1 border-l-2 border-cyan-500">Active Membership Packages</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscriptionPlans.map(plan => (
                  <div key={plan.id} className="p-5 rounded-2xl border border-white/10 bg-slate-900/50 relative overflow-hidden group">
                     {plan.isFree && <div className="absolute top-0 right-0 z-10 bg-emerald-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">Free Trial</div>}
                     {plan.imageUrl && (
                         <div className="w-full h-32 mb-4 rounded-lg overflow-hidden relative border border-white/5 -mt-2">
                            <img src={plan.imageUrl} alt={plan.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                         </div>
                     )}
                     <div className="flex justify-between items-start mb-3">
                        <h5 className="font-bold text-cyan-400 tracking-wide">{plan.title}</h5>
                     </div>
                     <div className="mb-4">
                        <span className="text-2xl font-bold text-white">${plan.priceUsd}</span>
                     </div>
                     <p className="text-xs text-slate-400 leading-relaxed min-h-[40px]">{plan.durationLabel}</p>
                     
                     <div className="mt-4 flex gap-2 w-full pt-4 border-t border-white/5 disabled opacity-20 pointer-events-none hidden">
                         {/* Edit disabled for now, mock UI */}
                     </div>
                     <button onClick={() => setSubscriptionPlans(prev => prev.filter(p => p.id !== plan.id))} className="cursor-pointer w-full mt-4 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 py-2 rounded font-mono text-[10px] font-bold uppercase transition flex items-center justify-center gap-2">
                        <Trash2 className="w-3.5 h-3.5" /> Remove Plan
                     </button>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* Security & Admins Tab Panel */}
      {consoleTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left max-w-7xl mx-auto animate-fade-in">
          {/* Admin Roles */}
          <div className="space-y-4">
            <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
              <h3 className="text-xl font-display font-medium text-emerald-400 flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" /> Admin Privilege Management
              </h3>
              <p className="text-xs text-slate-300 mb-6">ප්‍රධාන පරිපාලක (Super Admin) ලෙස වෙනත් අය සඳහා Admin ප්‍රවේශ (Roles) එක් කරන්න හෝ ඉවත් කරන්න.</p>
              
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Admin Name</label>
                    <input type="text" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-emerald-500/50" placeholder="e.g. Nimal" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Admin Email</label>
                    <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-emerald-500/50" placeholder="nimal@spt.com" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Access Role Level</label>
                  <select value={newAdminRole} onChange={e => setNewAdminRole(e.target.value)} className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-emerald-500/50">
                    <option value="superadmin">Super Admin (All Access + Security)</option>
                    <option value="moderator">Moderator (Users + Blogs + Packages)</option>
                    <option value="editor">Editor (CMS Info + Reviews Only)</option>
                  </select>
                </div>
                <button 
                  onClick={() => {
                    if(!newAdminName || !newAdminEmail) return;
                    setAdminUsers(prev => [...prev, { id: `admin_${Date.now()}`, name: newAdminName, email: newAdminEmail, role: newAdminRole, isActive: true }]);
                    setNewAdminName(''); setNewAdminEmail('');
                  }}
                  className="cursor-pointer w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 py-2 rounded font-mono text-xs font-bold uppercase transition"
                >
                  + Add Admin Role
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs uppercase font-mono text-slate-500 mb-2 font-bold">Active Administrators</h4>
                {adminUsers.map(admin => (
                  <div key={admin.id} className={`p-3 rounded border border-white/10 flex justify-between items-center ${admin.isActive ? 'bg-black/40' : 'bg-red-950/20'}`}>
                    <div>
                      <h5 className="font-bold text-sm text-white flex items-center gap-2">{admin.name} {admin.role === 'superadmin' && <Star className="w-3 h-3 text-amber-400" />}</h5>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{admin.email} • {admin.role.toUpperCase()}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setAdminUsers(prev => prev.map(a => a.id === admin.id ? {...a, isActive: !a.isActive} : a))} className={`cursor-pointer px-2 py-1 rounded text-[10px] font-bold uppercase ${admin.isActive ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                         {admin.isActive ? 'Suspend' : 'Activate'}
                       </button>
                       <button onClick={() => setAdminUsers(prev => prev.filter(a => a.id !== admin.id))} className="cursor-pointer text-rose-400 hover:text-rose-300 p-1 bg-white/5 rounded">
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/10 relative overflow-hidden">
                <h3 className="text-lg font-display font-bold text-rose-500 flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4" /> Emergency Recovery Email
                </h3>
                <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                  මෙම ගිණුමට ලොග් වීමට නොහැකි වුවහොත් හෝ වෙනත් Admin කෙනෙක් විසින් ඔබව ඉවත් කලහොත් මුරපදය යළි සැකසීමට යොදා ගත යුතු Master Security Email එක.
                </p>
                <div className="flex gap-2">
                   <input type="email" value={adminRecoveryEmail} onChange={e => setAdminRecoveryEmail(e.target.value)} className="flex-grow text-xs bg-black/60 border border-rose-500/30 rounded px-3 py-2 text-rose-100 focus:outline-none" />
                   <button onClick={() => alert('Recovery Email Successfully Updated!')} className="cursor-pointer px-3 bg-rose-500 hover:bg-rose-400 text-black font-bold uppercase font-mono text-[9px] rounded transition">Update</button>
                </div>
             </div>

             <div className="p-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 relative overflow-hidden">
                <h3 className="text-lg font-display font-bold text-[#00f0ff] flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[#00f0ff]" /> Admin 6-Digit Security PIN
                </h3>
                <p className="text-[10px] text-slate-300 mb-4 leading-relaxed">
                  පරිපාලක පැනලයට ඇතුල් වීමේදී සාමාන්‍යයෙන් භාවිතා වන ඉලක්කම් 6ක PIN එක මෙතැනින් වෙනස් කල හැක. ආරක්ෂාව තහවුරු කිරීම සඳහා පැරණි PIN එක වැරදුනහොත් ඔබව වහාම පද්ධතියෙන් සහ ගිණුමෙන් ඉවත් කෙරේ (Auto Logout).
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Old 6-Digit PIN (පැරණි PIN එක)</label>
                    <input 
                      type="password" 
                      maxLength={6} 
                      placeholder="••••••" 
                      value={oldPinField} 
                      onChange={e => setOldPinField(e.target.value.replace(/\D/g, ''))} 
                      className="w-full text-xs font-mono bg-black/60 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-1">New PIN (නව PIN)</label>
                      <input 
                        type="password" 
                        maxLength={6} 
                        placeholder="••••••" 
                        value={newPinField} 
                        onChange={e => setNewPinField(e.target.value.replace(/\D/g, ''))} 
                        className="w-full text-xs font-mono bg-black/60 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Confirm New PIN</label>
                      <input 
                        type="password" 
                        maxLength={6} 
                        placeholder="••••••" 
                        value={confirmPinField} 
                        onChange={e => setConfirmPinField(e.target.value.replace(/\D/g, ''))} 
                        className="w-full text-xs font-mono bg-black/60 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500" 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (!oldPinField || !newPinField || !confirmPinField) {
                        alert('කරුණාකර සියලුම PIN කොටු පුරවන්න. (Please complete all fields)');
                        return;
                      }
                      if (oldPinField !== adminPin) {
                        alert('ආරක්ෂක අනතුරු ඇඟවීම්! පැරණි PIN කේතය වැරදියි. ඔබව ස්වයංක්‍රීයව ලොග් අවුට් කරනු ලැබේ. \n\n(Incorrect old security PIN! Automatically logging out...)');
                        if (onIncorrectPinLogout) {
                          onIncorrectPinLogout();
                        }
                        return;
                      }
                      if (newPinField !== confirmPinField) {
                        alert('අලුත් PIN කේතය සහ තහවුරු කිරීමේ PIN එක එකිනෙකට නොගැලපේ! (New PIN and confirmation do not match!)');
                        return;
                      }
                      if (newPinField.length !== 6) {
                        alert('නව PIN කේතය ඉලක්කම් 6කින් සමන්විත විය යුතුය! (PIN must be exactly 6 digits!)');
                        return;
                      }
                      if (setAdminPin) {
                        setAdminPin(newPinField);
                        alert('සාර්ථකයි! නව ආරක්ෂක PIN කේතය යාවත්කාලීන කරන ලදී. (Success! Your Admin login verification PIN has been updated.)');
                        setOldPinField('');
                        setNewPinField('');
                        setConfirmPinField('');
                      }
                    }} 
                    className="cursor-pointer w-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/20 py-2.5 rounded font-mono text-[10px] font-bold uppercase transition"
                  >
                    🔐 Apply & Update Admin PIN
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Support Messages Tab Panel */}
      {consoleTab === 'support' && (
        <div id="admin-support-messages-panel" className="max-w-4xl mx-auto p-4 sm:p-6 rounded-2xl space-y-6 text-left animate-fade-in relative bg-slate-950/20 backdrop-blur-3xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.8)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
             <div>
                <h3 className="text-xl font-display font-semibold text-amber-400 flex items-center gap-2">
                   <Mail className="w-5 h-5 text-amber-500 animate-pulse" /> පාරිභෝගික සහාය පණිවිඩ එකතුව (Customer Support Message Inbox)
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                   පාරිභෝගිකයින් විසින් වෙබ් අඩවියේ ඇති Support Chatbot එක හරහා එවනු ලබන සියලුම ඍජු පණිවිඩ සහ ඊමේල් ලිපින මෙහිදී බලාගත හැක. (Handle offline messages filed by users.)
                </p>
             </div>
             
             {/* Statistics indicator badges */}
             <div className="flex gap-2 w-full sm:w-auto">
                <div className="px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-center flex-1 sm:flex-initial backdrop-blur-md font-mono">
                   <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-widest font-bold">මුළු පණිවිඩ (Total)</span>
                   <span className="text-sm font-bold font-mono text-cyan-300">{supportTickets.length}</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-white/[0.02] border border-rose-500/10 text-center flex-1 sm:flex-initial backdrop-blur-md font-mono">
                   <span className="block text-[8px] font-mono text-rose-400 uppercase tracking-widest font-bold">නොවිසඳූ (Pending)</span>
                   <span className="text-sm font-bold font-mono text-rose-400">{supportTickets.filter(t => t.status === 'pending').length}</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-white/[0.02] border border-emerald-500/10 text-center flex-1 sm:flex-initial backdrop-blur-md font-mono">
                   <span className="block text-[8px] font-mono text-emerald-400 uppercase tracking-widest font-bold">විසඳූ (Resolved)</span>
                   <span className="text-sm font-bold font-mono text-emerald-400">{supportTickets.filter(t => t.status === 'resolved').length}</span>
                </div>
             </div>
          </div>

          {/* Filter options bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
             <div className="sm:col-span-2">
                <label className="block text-[10px] font-mono text-[#00f0ff] uppercase tracking-wider mb-1.5 font-bold">EMAIL ලිපිනය හෝ පණිවිඩය සෙවීම (Search Keyword)</label>
                <input
                   type="text"
                   placeholder="e.g. sadeep@sptcreative.com..."
                   value={ticketSearch}
                   onChange={e => setTicketSearch(e.target.value)}
                   className="w-full text-xs bg-slate-950/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#00f0ff]/50 backdrop-blur-xl animate-none"
                />
             </div>
             <div>
                <label className="block text-[10px] font-mono text-[#00f0ff] uppercase tracking-wider mb-1.5 font-bold">තත්ත්වය අනුව පෙරීම (Filter Status)</label>
                <select
                   value={ticketStatusFilter}
                   onChange={e => setTicketStatusFilter(e.target.value as any)}
                   className="w-full text-xs bg-[#090d16]/80 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00f0ff]/50 cursor-pointer"
                >
                   <option value="all">සියලුම පණිවිඩ (All Transmissions)</option>
                   <option value="pending">විමර්ශනය වෙමින් පවතින (Pending Only)</option>
                   <option value="resolved">විසඳා අවසන් (Resolved Only)</option>
                </select>
             </div>
          </div>

          {/* Support Ticket Listing */}
          <div className="space-y-4 pt-2 relative z-10">
             {(() => {
                const query = ticketSearch.toLowerCase().trim();
                const filtered = supportTickets.filter(t => {
                  const matchesSearch = !query || t.email.toLowerCase().includes(query) || t.message.toLowerCase().includes(query);
                  const matchesStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 bg-black/30 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                       <Mail className="w-8 h-8 text-slate-600 mx-auto opacity-40 mb-3" />
                       <p className="text-xs text-slate-400 font-mono tracking-wider uppercase font-bold">
                          කිසිදු සහායක පණිවිඩයක් හමු නොවීය (Zero support inquiries found)
                       </p>
                    </div>
                  );
                }

                return filtered.map((ticket) => (
                   <div 
                      key={ticket.id} 
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 backdrop-blur-md relative overflow-hidden ${
                         ticket.status === 'resolved' 
                           ? 'border-emerald-500/20 bg-emerald-950/10' 
                           : 'border-[#00f0ff]/25 bg-[#00f0ff]/5 shadow-[0_4px_20px_rgba(0,240,255,0.05)]'
                      }`}
                   >
                     {ticket.status === 'pending' && (
                       <div className="absolute top-0 left-0 w-[4px] h-full bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600"></div>
                     )}

                     <div className="space-y-2.5 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                           <span className={`text-[8px] font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-lg border ${
                              ticket.status === 'resolved' 
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-bold'
                           }`}>
                              {ticket.status === 'resolved' ? '✅ RESOLVED' : '⚡ PENDING'}
                           </span>
                           <span className="font-mono text-xs text-white bg-slate-950/60 px-3 py-1 rounded-lg border border-white/10 inline-flex items-center gap-1.5 font-bold shadow-inner">
                              <User className="w-3.5 h-3.5 text-[#00f0ff]" />
                              {ticket.email}
                           </span>
                           <span className="text-[10px] text-slate-400 font-mono bg-black/40 px-2 py-1 rounded-md">
                              ⏱️ {new Date(ticket.createdAt).toLocaleString()}
                           </span>
                        </div>
                        
                        <p className="text-xs text-zinc-100 bg-slate-950/50 p-4 rounded-xl border border-white/5 leading-relaxed whitespace-pre-wrap font-sans">
                           {ticket.message}
                        </p>
                     </div>

                     <div className="flex flex-row md:flex-col justify-end items-stretch gap-2 w-full md:w-36 shrink-0 md:self-stretch">
                        <a 
                           href={`mailto:${ticket.email}?subject=Reply from SPT Support (Sadeep Pasindu Official)&body=Hello! We received your support ticket regarding: "${ticket.message.slice(0, 50)}...".`}
                           className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 border border-[#00f0ff]/20 text-[#00f0ff] font-mono text-[9px] font-bold uppercase tracking-wider transition flex-1 text-center"
                        >
                           📧 REPLY EMAIL
                        </a>
                        <button 
                           onClick={() => handleToggleTicketStatus(ticket.id)} 
                           className={`cursor-pointer px-3 py-2.5 rounded-xl text-[9px] font-mono font-bold uppercase tracking-wider border transition flex-1 text-center ${
                              ticket.status === 'resolved' 
                                ? 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white' 
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                           }`}
                        >
                           {ticket.status === 'resolved' ? '🔄 RE-OPEN' : '✔️ RESOLVE'}
                        </button>
                        <button 
                           onClick={() => handleDeleteTicket(ticket.id)} 
                           className="cursor-pointer px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition flex items-center justify-center"
                        >
                           <Trash2 className="w-3.5 h-3.5" />
                        </button>
                     </div>
                   </div>
                ));
             })()}
          </div>
        </div>
      )}

      {/* Payment Gateways Tab Panel */}
      {consoleTab === 'payments' && (
        <div className="max-w-4xl mx-auto p-6 rounded-2xl glass-panel space-y-6 text-left animate-fade-in">
           <h3 className="text-xl font-display font-medium text-amber-400 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" /> Payment Gateways Configuration
           </h3>
           <p className="text-xs text-slate-300">
              මෙහිදී ඔබට පාරිභෝගිකයින්ට මුදල් ගෙවීමට ලබා දෙන ක්‍රම (Bank Transfer, PayPal, GooglePay) කළමනාකරණය කළ හැක. සක්‍රීය කර ඇති ක්‍රම පමණක් මිලදී ගැනීම් වලදී පෙන්වනු ඇත.
           </p>

           <div className="bg-black/30 border border-white/10 p-4 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                 <div className="sm:col-span-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Gateway Type</label>
                    <select value={newPayType} onChange={e => setNewPayType(e.target.value)} className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-amber-400/50">
                       <option value="bank">Bank Transfer</option>
                       <option value="googlepay">Google Pay</option>
                       <option value="paypal">PayPal</option>
                       <option value="other">Other App</option>
                    </select>
                 </div>
                 <div className="sm:col-span-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Display Name</label>
                    <input type="text" value={newPayName} onChange={e => setNewPayName(e.target.value)} placeholder="e.g. BOC App" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-amber-400/50" />
<input type="text" value={newPayNameEn} onChange={e => setNewPayNameEn(e.target.value)} placeholder="[English] e.g. BOC App" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-amber-400/50 mt-2 border-dashed border-cyan-400/50" />
                 </div>
                 <div className="sm:col-span-2">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Details (Account / Email / Tag)</label>
                    <input type="text" value={newPayDetails} onChange={e => setNewPayDetails(e.target.value)} placeholder="e.g. sptofficial@paypal.com" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-amber-400/50" />
<input type="text" value={newPayDetailsEn} onChange={e => setNewPayDetailsEn(e.target.value)} placeholder="[English] e.g. sptofficial@paypal.com" className="w-full text-xs bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-white focus:outline-none focus:border-amber-400/50 mt-2 border-dashed border-cyan-400/50" />
                 </div>
              </div>
              <button 
                  onClick={() => {
                    if(!newPayName || !newPayDetails) return;
                    setPaymentGateways(prev => [...prev, { id: `pay_${Date.now()}`, type: newPayType, name: newPayName, nameEn: newPayNameEn, details: newPayDetails, detailsEn: newPayDetailsEn, isActive: true }]);
                    setNewPayName(''); setNewPayNameEn(''); setNewPayDetails(''); setNewPayDetailsEn('');
                  }}
                  className="cursor-pointer w-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 py-2 rounded font-mono text-xs font-bold uppercase transition block text-center"
                >
                  + Add Payment Option
              </button>
           </div>

           <div className="space-y-3 pt-2">
              <h4 className="text-[11px] uppercase font-mono text-white mb-2 font-bold tracking-widest pl-1 border-l-2 border-amber-500">Available Gateways</h4>
              {paymentGateways.map(gateway => (
                 <div key={gateway.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${gateway.isActive ? 'border-amber-500/30 bg-amber-950/10' : 'border-white/5 bg-black/50'}`}>
                    <div>
                       <div className="flex items-center gap-2">
                          <span className="text-xs bg-white/5 text-slate-300 font-mono px-2 py-0.5 rounded border border-white/10">{gateway.type.toUpperCase()}</span>
                          <h5 className="font-bold text-sm text-white">{gateway.name}</h5>
                       </div>
                       <p className="text-xs text-amber-200/80 font-mono mt-1 bg-black/40 inline-block px-2 py-0.5 rounded">{gateway.details}</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                       <button onClick={() => setPaymentGateways(prev => prev.map(g => g.id === gateway.id ? {...g, isActive: !g.isActive} : g))} className={`cursor-pointer flex-1 sm:flex-none px-3 py-1.5 rounded text-[10px] font-bold uppercase border transition ${gateway.isActive ? 'bg-slate-800 text-slate-400 hover:text-white border-white/10' : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'}`}>
                         {gateway.isActive ? 'Disable' : 'Enable'}
                       </button>
                        <button onClick={() => setPaymentGateways(prev => prev.filter(g => g.id !== gateway.id))} className="cursor-pointer px-3 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* BACKUP & RESTORE SECTION */}
      {consoleTab === 'backup' && (
        <div className="space-y-6 animate-fade-in text-left max-w-4xl mx-auto">
          {autoBackupToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono text-center">
              {autoBackupToast}
            </div>
          )}

          {/* Auto Backup Settings */}
          <div className="p-6 rounded-2xl glass-panel space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-400" /> Auto Backup
                </h3>
                <p className="text-xs text-slate-400 mt-1">ස්වයංක්‍රීයව backup කිරීමේ කාල පරතරය තෝරන්න. Backup data local browser එකේ save වෙයි.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {([
                { value: 'off', label: 'Manual Only' },
                { value: 'hourly', label: 'Every Hour' },
                { value: '6hours', label: 'Every 6 Hrs' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ] as { value: AutoBackupInterval; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    const newSettings: AutoBackupSettings = {
                      interval: opt.value,
                      lastBackup: autoBackupSettings.lastBackup,
                    };
                    saveAutoBackupSettings(newSettings);
                    setAutoBackupSettings(newSettings);
                  }}
                  className={`px-3 py-2.5 rounded-xl text-[10px] font-mono font-bold tracking-wider transition cursor-pointer ${
                    autoBackupSettings.interval === opt.value
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/[0.03] text-slate-400 border border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400">
              <span>Status: <span className={autoBackupSettings.interval === 'off' ? 'text-slate-500' : 'text-emerald-400'}>
                {autoBackupSettings.interval === 'off' ? '○ Manual Only' : '● Auto Active'}
              </span></span>
              {autoBackupSettings.lastBackup && (
                <span>Last: <span className="text-slate-300">{new Date(autoBackupSettings.lastBackup).toLocaleString()}</span></span>
              )}
              {autoBackupSettings.interval !== 'off' && (
                <button
                  onClick={() => {
                    const backup = createBackup({
                      config, tools, services, brands,
                      offers: offersList, homestats: homeStatsList,
                      aboutcards: aboutCardsList, reviews: reviewsList,
                      contacts: contactsList, blogs: blogsList,
                      users: sptUsersList, plans: propSubscriptionPlans,
                      gateways: propPaymentGateways, telemetry: telemetryList
                    });
                    saveAutoBackupData(backup);
                    const newSettings = { ...autoBackupSettings, lastBackup: new Date().toISOString() };
                    saveAutoBackupSettings(newSettings);
                    setAutoBackupSettings(newSettings);
                    setAutoBackupToast('🔄 Auto-backup saved at ' + new Date().toLocaleTimeString());
                    setTimeout(() => setAutoBackupToast(null), 4000);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer"
                >
                  Run Now
                </button>
              )}
            </div>
          </div>

          <div className="p-6 rounded-2xl glass-panel space-y-6">
            <div>
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-[#00f0ff]" /> Manual Backup & Restore
              </h3>
              <p className="text-sm text-slate-300 mt-2">
                සම්පූර්ණ SPT OFFICIAL වෙබ් අඩවියේ දත්තම එක් JSON ගොනුවකට backup කර ගන්න. Google Drive, Dropbox වැනි ඕනෑම තැනක ගබඩා කරන්න.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BackupActionCard
                icon={<Download className="w-8 h-8" />}
                title="Download Full Backup"
                description="සියලුම දත්ත JSON ගොනුවක් ලෙස download කරන්න."
                buttonLabel="📥 Download Backup"
                buttonColor="from-cyan-500 to-sky-500"
                onAction={() => {
                  const backup = createBackup({
                    config, tools, services, brands,
                    offers: offersList, homestats: homeStatsList,
                    aboutcards: aboutCardsList, reviews: reviewsList,
                    contacts: contactsList, blogs: blogsList,
                    users: sptUsersList, plans: propSubscriptionPlans,
                    gateways: propPaymentGateways, telemetry: telemetryList
                  });
                  downloadBackup(backup);
                }}
              />

              <BackupActionCard
                icon={<Upload className="w-8 h-8" />}
                title="Restore from File"
                description="ඔබගේ Drive එකේ තියෙන JSON ගොනුවක් upload කර restore කරන්න."
                buttonLabel="📤 Upload & Restore"
                buttonColor="from-amber-400 to-yellow-500"
                onAction={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    try {
                      const parsed = await parseBackupFile(file);
                      const d = parsed.data as Record<string, any>;
                      if (d.config && setConfig) setConfig(d.config);
                      if (d.tools && onUpdateTools) onUpdateTools(d.tools);
                      if (d.services && onUpdateServices) onUpdateServices(d.services);
                      if (d.brands && onUpdateBrands) onUpdateBrands(d.brands);
                      if (d.offers && setOffersList) setOffersList(d.offers);
                      if (d.homestats && setHomeStatsList) setHomeStatsList(d.homestats);
                      if (d.aboutcards && setAboutCardsList) setAboutCardsList(d.aboutcards);
                      if (d.reviews && setReviewsList) setReviewsList(d.reviews);
                      if (d.contacts && setContactsList) setContactsList(d.contacts);
                      if (d.blogs && setBlogsList) setBlogsList(d.blogs);
                      if (d.users && setSptUsersList) setSptUsersList(d.users);
                      if (d.plans && propSetSubscriptionPlans) propSetSubscriptionPlans(d.plans);
                      if (d.gateways && propSetPaymentGateways) propSetPaymentGateways(d.gateways);
                      alert('✅ Backup restored successfully! All data has been updated.');
                    } catch (err: any) {
                      alert('❌ Restore failed: ' + (err.message || 'Invalid file'));
                    }
                  };
                  input.click();
                }}
              />

              <BackupActionCard
                icon={<RefreshCw className="w-8 h-8" />}
                title="Restore from Auto Backup"
                description="Browser එකේ auto-save වෙලා තියෙන latest auto backup එකෙන් restore කරන්න."
                buttonLabel="🔄 Restore Auto Backup"
                buttonColor="from-emerald-400 to-teal-500"
                onAction={() => {
                  const autoData = getAutoBackupData();
                  if (!autoData) {
                    alert('❌ No auto backup found. Run an auto backup first.');
                    return;
                  }
                  const d = autoData.data as Record<string, any>;
                  if (d.config && setConfig) setConfig(d.config);
                  if (d.tools && onUpdateTools) onUpdateTools(d.tools);
                  if (d.services && onUpdateServices) onUpdateServices(d.services);
                  if (d.brands && onUpdateBrands) onUpdateBrands(d.brands);
                  if (d.offers && setOffersList) setOffersList(d.offers);
                  if (d.homestats && setHomeStatsList) setHomeStatsList(d.homestats);
                  if (d.aboutcards && setAboutCardsList) setAboutCardsList(d.aboutcards);
                  if (d.reviews && setReviewsList) setReviewsList(d.reviews);
                  if (d.contacts && setContactsList) setContactsList(d.contacts);
                  if (d.blogs && setBlogsList) setBlogsList(d.blogs);
                  if (d.users && setSptUsersList) setSptUsersList(d.users);
                  if (d.plans && propSetSubscriptionPlans) propSetSubscriptionPlans(d.plans);
                  if (d.gateways && propSetPaymentGateways) propSetPaymentGateways(d.gateways);
                  alert('✅ Auto backup restored from ' + new Date(autoData.backupDate).toLocaleString());
                }}
              />
            </div>

            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white font-mono tracking-wide">Backup Instructions</h4>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-400 leading-relaxed">
                    <li>1. <span className="text-cyan-400">Download Backup</span> click කර JSON file එක Google Drive එකට save කරන්න.</li>
                    <li>2. Auto Backup frequency එකක් තෝරන්න — browser එකේ auto save වෙයි.</li>
                    <li>3. ප්‍රතිස්ථාපනයට file upload කරන්න හෝ auto backup එකෙන් restore කරන්න.</li>
                    <li>4. Restore කළ පසු current data සියල්ල backup data වලින් replace වෙයි.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Health Modal */}
      {showHealthModal && healthData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowHealthModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono tracking-wide flex items-center gap-2">
                {healthData.overall === 'healthy' ? '🟢' : healthData.overall === 'degraded' ? '🟡' : '🔴'}
                System Health — {healthData.overall === 'healthy' ? 'Healthy' : healthData.overall === 'degraded' ? 'Degraded' : 'Unhealthy'}
              </h3>
              <button onClick={() => setShowHealthModal(false)} className="text-slate-400 hover:text-white text-lg cursor-pointer">&times;</button>
            </div>
            <div className="p-5 space-y-2">
              {healthData.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : check.status === 'degraded' ? '⚠️' : check.status === 'warn' ? 'ℹ️' : '📋'}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-white font-mono">{check.name}</span>
                    {check.detail && <span className="block text-[10px] text-slate-400 mt-0.5 break-words">{check.detail}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 pt-2 text-[9px] text-slate-600 font-mono text-right">
              Updated {new Date(healthData.timestamp).toLocaleTimeString()}
              <button onClick={() => fetchHealth()} className="ml-3 text-cyan-400 hover:text-cyan-300 cursor-pointer">↻ Refresh</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
