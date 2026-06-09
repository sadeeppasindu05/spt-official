import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Layers, Compass, Tv, Music, PenTool, Shirt, Shield, QrCode, 
  Link2, User, LayoutDashboard, Eye, Star, Check, Plus, Search, Share2, 
  LogOut, Heart, Settings, Upload, Activity, Code, Smartphone, Paintbrush, 
  CheckCircle, MessageSquare, Send, Copy, Lock, ChevronRight, Sparkle, ArrowRight, X, Info, Video, ExternalLink, BookOpen, Clock, RefreshCw, ShieldCheck
} from 'lucide-react';

import { SPACE_WALLPAPERS, INITIAL_SERVICES, ACCESSORY_BRANDS, INITIAL_REVIEWS, INITIAL_TOOLS } from './data';
import { SystemConfig, SptTool, ServiceItem, ReviewItem, AccessoryBrand, OfferItem, AboutCard, HomeStatCard, TelemetryEvent, ContactLinkItem, BlogPost, SptUser } from './types';
import AioLinkSandbox from './components/AioLinkSandbox';
import QrGeneratorSandbox from './components/QrGeneratorSandbox';
import AdminConsole from './components/AdminConsole';
import CustomerSupportChat from './components/CustomerSupportChat';
import SptUniverseGate from './components/SptUniverseGate';
import { supabase } from './supabaseClient';

export function getYouTubeEmbedId(url: string | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}



export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'offers' | 'plans' | 'tools' | 'reviews' | 'about' | 'contacts' | 'blogs' | 'admin'>('home');

  React.useEffect(() => {
    trackTelemetryEvent('pageview', activeTab);
  }, [activeTab]);

  // Live UTC Clock state
  const [utcTime, setUtcTime] = useState<string>('');
  // Live online visitor count
  const [liveOnlineCount, setLiveOnlineCount] = useState<number>(0);
  // Persistent marketing counters (start at base, increment on each new signup/subscription)
  const [displayRegisteredCount, setDisplayRegisteredCount] = useState<number>(592);
  const [displaySubscribedCount, setDisplaySubscribedCount] = useState<number>(370);
  
  // Real-time Database/Platform Status state
  const [platformStatus, setPlatformStatus] = useState<'online' | 'local mode' | 'checking' | 'error'>('checking');

  // Live UTC Clock run loop
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getUTCHours();
      const m = now.getUTCMinutes();
      const s = now.getUTCSeconds();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hours12 = h % 12 || 12;
      const pad = (num: number) => String(num).padStart(2, '0');
      setUtcTime(`${pad(hours12)}:${pad(m)}:${pad(s)} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live online visitor count (heartbeat + polling)
  React.useEffect(() => {
    const ping = async () => {
      try {
        await fetch('/api/online/heartbeat', { method: 'POST' }).catch(() => {});
        const res = await fetch('/api/online/count').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setLiveOnlineCount(data.count || 0);
        }
      } catch {}
    };
    ping();
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, []);

  // Periodic real-time DB status check
  React.useEffect(() => {
    const checkDbStatus = async () => {
      const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!isSupabaseReady) {
        setPlatformStatus('local mode');
        return;
      }
      try {
        const { error } = await supabase.from('system_config').select('key', { count: 'exact', head: true }).limit(1);
        if (error) {
          console.error("Database connection check failed:", error);
          setPlatformStatus('error');
        } else {
          setPlatformStatus('online');
        }
      } catch (err) {
        console.error("Database status check error:", err);
        setPlatformStatus('error');
      }
    };
    checkDbStatus();
    const interval = setInterval(checkDbStatus, 15000);
    return () => clearInterval(interval);
  }, []);


  // Language state (default to 'en' for English)
  const [language, setLanguage] = useState<'si' | 'en'>('en');

  // Simple, elegant bilingual translation helper
  const t = (siText: string, enText: string) => (language === 'si' ? siText : enText);

  // Globals live CMS configurations managed in React context/state synced to Supabase system_config
  const [config, setConfig] = useState<SystemConfig>(() => ({
      bgImage: SPACE_WALLPAPERS[0].url,
      glassOpacity: 0.18,
      glassBlur: 16,
      neonAccent: 'blue',
      siteTitle: 'SPT OFFICIAL',
      siteSubtitle: 'sadeep pasindu creative',
      siteMiddleTagline: 'THE CREATIVE UNIVERSE',
      siteCreatorSlogan: 'Beyond Solutions, Closer Than Your Breath.',
      aboutSinhalaStory: 'අති නවීන තාක්‍ෂණය සහ උසස් නිර්මාණාත්මක කලාවන්ගේ සුසංයෝගයෙන් බිහිවූ SPT OFFICIAL, පාරිභෝගිකයින්ගේ සිහින යථාර්ථයක් බවට පත් කරන ශ්‍රී ලංකාවේ ප්‍රමුඛතම ඩිජිටල් නිර්මාණ පද්ධතියකි. Sadeep Pasindu වන මා විසින් ආරම්භ කරන ලද "Sadeep Pasindu Creative Universe" (SPT OFFICIAL) යනු හුදෙක් සේවා සපයන ආයතනයක් පමණක් නොවේ. එය තාක්ෂණයේ සහ කලාවේ සංකලනයෙන් බිහිවූ සුවිශේෂී ඩිජිටල් තෝතැන්නකි.',
      aboutEnglishStory: 'SPT OFFICIAL originates from a deep conceptual design process designed to merge cutting-edge micro-systems, high-end visual art, and sound styling. It represents a galactic interface built for premium multi-media execution. Synthesizing solutions that bridge digital excellence and natural brand aesthetics.',
      brandGenesisStory: 'Sadeep Pasindu වන මා විසින් ආරම්භ කරන ලද "Sadeep Pasindu Creative Universe" (SPT OFFICIAL) යනු හුදෙක් සේවා සපයන ආයතනයක් පමණක් නොවේ. එය තාක්ෂණයේ සහ කලාවේ සංකලනයෙන් බිහිවූ සුවිශේෂී ඩිජිටල් තෝතැන්නකි. අප විසින් සපයනු ලබන සෑම සේවාවක් පිටුපසම ඇති විශිෂ්ටතම නිර්මාණශීලිත්වය සහ විශ්වසනීයත්වය ඔබගේ සන්නාමයේ වර්ධනයට මහෝපකාරී වනු නොඅනුමානය.',
      brandGenesisStoryEn: 'The "Sadeep Pasindu Creative Universe" (SPT OFFICIAL) founded by me is not just a service providing agency. It is a unique digital haven born from the fusion of technology and art. We guarantee that the supreme creativity and reliability behind every service we provide will be a great support for the growth of your brand.',
      blogSubtitle: 'SPT OFFICIAL වෙතින් පිරිනමන දිනපතා අලුත්ම තාක්ෂණික තොරතුරු, නිවේදන, සහ විශේෂ ලිපි පෙළ මෙතැනින් කියවන්න.',
      blogSubtitleEn: 'Read the latest technical information, announcements, and special articles offered daily by SPT OFFICIAL here.',
      reviewsTitle: 'පාරිභෝගික අදහස් (User Testimony)',
      reviewsTitleEn: 'User Testimony',
      reviewsSubtitle: 'CLIENT VOICE FEEDS',
      reviewsSubtitleEn: 'CLIENT VOICE FEEDS',
      submitReviewTitle: 'ඔබගේ අදහස අප වෙත එවන්න (Submit Testimony)',
      submitReviewTitleEn: 'Submit Testimony',
      submitReviewDesc: 'SPT OFFICIAL සේවාවන් පිළිබඳ ඔබගේ වටිනා අදහස පළමු ප්‍රතිචාර ලැයිස්තුවට එක් කරන්න.',
      submitReviewDescEn: 'Add your valuable feedback regarding SPT OFFICIAL services to our response list.',
      adminPassword: 'spt',
      showUniverseAnimation: true,
      universeGifUrl: undefined
  }));

  // Reference for the previous configuration state
  const prevConfigRef = React.useRef<SystemConfig>(config);

  React.useEffect(() => {
    // Upload to Supabase if any configuration key changed and Supabase is ready
    const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (isSupabaseReady) {
      const prev = prevConfigRef.current;
      const changedKeys = (Object.keys(config) as Array<keyof SystemConfig>).filter(
        key => config[key] !== prev[key]
      );

      if (changedKeys.length > 0) {
        const uploadChanges = async () => {
          for (const key of changedKeys) {
            const val = config[key];
            try {
              await supabase.from('system_config').upsert({
                key: key,
                value: val !== undefined ? String(val) : null
              });
            } catch (err) {
              console.error(`Failed to upload config key ${key} to Supabase:`, err);
            }
          }
          prevConfigRef.current = config;
        };
        uploadChanges();
      }
    }
  }, [config]);

  // Helper to check if string is a valid UUID
  const isUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Real-time live synchronization of Supabase table data
  React.useEffect(() => {
    const fetchSupabaseData = async () => {
      const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!isSupabaseReady) {
        console.log("Supabase is not configured yet. Using default lists.");
        return;
      }

      try {
        console.log("Fetching live database lists from Supabase...");

        // 1. Fetch Services
        const { data: servicesFetch, error: sErr } = await supabase.from('services').select('*').order('created_at', { ascending: false });
        if (!sErr && servicesFetch && servicesFetch.length > 0) {
          setServicesList(servicesFetch.map(item => ({
            id: item.id,
            title: item.title,
            titleEn: item.title_en,
            description: item.description,
            descriptionEn: item.description_en,
            category: item.category,
            highlight: item.highlight,
            imageUrl: item.image_url,
            showcaseFiles: item.showcase_files || []
          })));
        }

        // 2. Fetch Tools
        const { data: toolsFetch, error: tErr } = await supabase.from('tools').select('*').order('created_at', { ascending: true });
        if (!tErr && toolsFetch && toolsFetch.length > 0) {
          setToolsList(toolsFetch.map(item => ({
            id: item.id,
            name: item.name,
            nameEn: item.name_en,
            description: item.description,
            descriptionEn: item.description_en,
            icon: item.icon,
            category: item.category,
            imageUrl: item.image_url
          })));
        }

        // 3. Fetch Brands
        const { data: brandsFetch, error: bErr } = await supabase.from('brands').select('*').order('created_at', { ascending: true });
        if (!bErr && brandsFetch && brandsFetch.length > 0) {
          setBrandsList(brandsFetch.map(item => ({
            id: item.id,
            name: item.name,
            nameEn: item.name_en,
            subtitle: item.subtitle,
            subtitleEn: item.subtitle_en,
            description: item.description,
            descriptionEn: item.description_en,
            visualUrl: item.visual_url
          })));
        }

        // 4. Fetch Offers
        const { data: offersFetch, error: oErr } = await supabase.from('offers').select('*').order('created_at', { ascending: false });
        if (!oErr && offersFetch && offersFetch.length > 0) {
          setOffersList(offersFetch.map(item => ({
            id: item.id,
            title: item.title,
            titleEn: item.title_en,
            description: item.description,
            descriptionEn: item.description_en,
            discountBadge: item.discount_badge,
            discountBadgeEn: item.discount_badge_en,
            validUntil: item.valid_until,
            promoCode: item.promo_code,
            imageUrl: item.image_url
          })));
        }

        // 5. Fetch Homestats
        const { data: homestatsFetch, error: hsErr } = await supabase.from('homestats').select('*').order('created_at', { ascending: true });
        if (!hsErr && homestatsFetch && homestatsFetch.length > 0) {
          setHomeStatsList(homestatsFetch.map(item => ({
            id: item.id,
            badge: item.badge,
            badgeEn: item.badge_en,
            title: item.title,
            titleEn: item.title_en,
            description: item.description,
            descriptionEn: item.description_en,
            imageUrl: item.image_url
          })));
        }

        // 6. Fetch About Cards
        const { data: aboutcardsFetch, error: acErr } = await supabase.from('aboutcards').select('*').order('created_at', { ascending: true });
        if (!acErr && aboutcardsFetch && aboutcardsFetch.length > 0) {
          setAboutCardsList(aboutcardsFetch.map(item => ({
            id: item.id,
            title: item.title,
            titleEn: item.title_en,
            description: item.description,
            descriptionEn: item.description_en,
            icon: item.icon,
            imageUrl: item.image_url
          })));
        }

        // 7. Fetch Reviews
        const { data: reviewsFetch, error: revErr } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
        if (!revErr && reviewsFetch && reviewsFetch.length > 0) {
          setReviewsList(reviewsFetch.map(item => ({
            id: item.id,
            name: item.name,
            nameEn: item.name_en,
            role: item.role,
            roleEn: item.role_en,
            comment: item.comment,
            commentEn: item.comment_en,
            rating: item.rating,
            avatarSeed: item.avatar_seed,
            imageUrl: item.image_url,
            pinned: item.pinned,
            hidden: item.hidden
          })));
        }

        // 8. Fetch Blogs
        const { data: blogsFetch, error: blgErr } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
        if (!blgErr && blogsFetch && blogsFetch.length > 0) {
          setBlogsList(blogsFetch.map(item => ({
            id: item.id,
            title: item.title,
            titleEn: item.title_en,
            content: item.content,
            contentEn: item.content_en,
            mediaType: item.media_type,
            mediaUrl: item.media_url,
            author: item.author,
            createdAt: item.created_at
          })));
        }

        // 9. Fetch Contacts
        const { data: contactsFetch } = await supabase.from('contacts').select('*').order('created_at', { ascending: true });
        if (contactsFetch && contactsFetch.length > 0) {
          setContactsList(contactsFetch.map(item => ({
            id: item.id,
            title: item.title,
            titleEn: item.title_en,
            url: item.url,
            imageUrl: item.image_url
          })));
        }

        // 10. Fetch Subscription Plans
        const { data: plansFetch } = await supabase.from('plans').select('*').order('created_at', { ascending: true });
        if (plansFetch && plansFetch.length > 0) {
          setSubscriptionPlans(plansFetch.map(item => ({
            id: item.id,
            title: item.title,
            priceUsd: item.price_usd,
            originalPriceUsd: item.original_price_usd,
            discountTag: item.discount_tag,
            durationLabel: item.duration_label,
            isPopular: item.is_popular,
            isFree: item.is_free
          })));
        }

        // 11. Fetch Users (Profiles)
        const { data: profilesFetch } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (profilesFetch && profilesFetch.length > 0) {
          setSptUsersList(profilesFetch.map(item => ({
            id: item.id,
            name: item.name || 'Anonymous User',
            email: item.email || '',
            registeredAt: item.created_at || new Date().toISOString(),
            subscriptionStatus: item.subscription_status || 'trial',
            subscriptionPlan: item.subscription_plan || 'trial',
            subscriptionExpiresAt: item.subscription_expires_at
          })));
        }

        // 12. Fetch Payment Gateways
        try {
          const { data: gatewaysFetch } = await supabase.from('gateways').select('*').order('created_at', { ascending: true });
          if (gatewaysFetch && gatewaysFetch.length > 0) {
            setPaymentGatewaysList(gatewaysFetch.map(item => ({
              id: item.id,
              type: item.type,
              name: item.name,
              nameEn: item.name_en,
              details: item.details,
              detailsEn: item.details_en,
              isActive: item.is_active
            })));
          }
        } catch (gatewayFetchErr) {
          console.log("Gateways table not found or failed to load. Falling back to local/cached payment gateways.", gatewayFetchErr);
        }

        // 12b. Fetch Admins
        try {
          const { data: adminsFetch } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
          if (adminsFetch && adminsFetch.length > 0) {
            setAdminsList(adminsFetch.map((a: any) => ({
              id: a.id, name: a.name, email: a.email,
              role: a.role, isActive: a.is_active
            })));
          }
        } catch (adminsFetchErr) {
          console.log("Admins table not found or failed to load.", adminsFetchErr);
        }

        // 13. Fetch System Configuration (Logo, Wallpapers, custom texts)
        try {
          const { data: configFetch } = await supabase.from('system_config').select('*');
          if (configFetch && configFetch.length > 0) {
            setConfig(prev => {
              const updated = { ...prev };
              configFetch.forEach(row => {
                const k = row.key as keyof SystemConfig;
                const val = row.value;
                if (val === 'true') {
                  (updated as any)[k] = true;
                } else if (val === 'false') {
                  (updated as any)[k] = false;
                } else if (k === 'glassOpacity' || k === 'glassBlur') {
                  const num = Number(val);
                  (updated as any)[k] = isNaN(num) ? prev[k] : num;
                } else if (val === 'null' || val === null) {
                  (updated as any)[k] = undefined;
                } else {
                  (updated as any)[k] = val;
                }
              });
              prevConfigRef.current = updated;
              return updated;
            });
          }
        } catch (configFetchErr) {
          console.log("System config table failed to load or does not exist yet.", configFetchErr);
        }

        // Load marketing counters from Supabase
        try {
          const { data: counters } = await supabase.from('marketing_counters').select('*').eq('id', 'global').maybeSingle();
          if (counters) {
            if (counters.registered_count != null) setDisplayRegisteredCount(counters.registered_count);
            if (counters.subscribed_count != null) setDisplaySubscribedCount(counters.subscribed_count);
          }
        } catch (countersErr) {
          console.log("Failed to load marketing counters:", countersErr);
        }

      } catch (err) {
        console.error("Failed to load live data from Supabase:", err);
      }
    };

    fetchSupabaseData();

    // Listen for realtime auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowLoginWall(true);
        setRecoveryMode(true);
        return;
      }
      if (session?.user) {
        const email = session.user.email || '';
        const name = session.user.user_metadata?.full_name || email.split('@')[0];
        setCustomerSession({ name, email });

        if (email === 'sadeeppasindu0218@gmail.com') {
          setIsAdminUnlocked(true);
        } else {
          try {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            if (profile?.role === 'admin') {
              setIsAdminUnlocked(true);
            }
          } catch (err) {
            console.error("Profile check error:", err);
          }
        }

        setSptUsersList(prev => {
          const exists = prev.some(u => u.email.toLowerCase() === email.toLowerCase());
          if (exists) return prev;
          return [{
            id: `user_${Date.now()}`,
            name,
            email: email.toLowerCase(),
            registeredAt: new Date().toISOString(),
            subscriptionStatus: 'trial',
            subscriptionExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
          }, ...prev];
        });

        // Sync profile to Supabase (reliably via server endpoint using service_role)
        try {
          await fetch('/api/admin/sync-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.toLowerCase(),
              name,
              role: email === 'sadeeppasindu0218@gmail.com' ? 'admin' : 'user',
              subscription_status: 'trial',
              subscription_expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            }),
          });
        } catch (err) {
          console.error("Profile sync error (server):", err);
        }
      } else {
        setCustomerSession(null);
        setIsAdminUnlocked(false);
      }
    });

    // Subscribe to realtime changes on all content tables
    const contentTables = ['services','tools','brands','offers','reviews','blogs','homestats','aboutcards','gateways','contacts','plans','system_config','support_messages','telemetry'] as const;
    const realtimeChannel = supabase
      .channel('all-tables-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => refetchTable('services'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tools' }, () => refetchTable('tools'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brands' }, () => refetchTable('brands'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => refetchTable('offers'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => refetchTable('reviews'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blogs' }, () => refetchTable('blogs'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homestats' }, () => refetchTable('homestats'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aboutcards' }, () => refetchTable('aboutcards'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gateways' }, () => refetchTable('gateways'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => refetchTable('contacts'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => refetchTable('plans'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => refetchTable('system_config'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => refetchTable('support_messages'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telemetry' }, () => refetchTable('telemetry'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, () => refetchTable('admins'))
      .subscribe();

    return () => {
      subscription?.unsubscribe();
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  // Re-fetch a table from Supabase and update the corresponding state
  const refetchTable = React.useCallback(async (table: string) => {
    try {
      switch (table) {
        case 'services': {
          const { data } = await supabase.from('services').select('*').order('created_at', { ascending: false });
          if (data) setServicesList(data.map((item: any) => ({
            id: item.id, title: item.title, titleEn: item.title_en,
            description: item.description, descriptionEn: item.description_en,
            category: item.category, highlight: item.highlight,
            imageUrl: item.image_url, showcaseFiles: item.showcase_files || []
          })));
          break;
        }
        case 'tools': {
          const { data } = await supabase.from('tools').select('*').order('created_at', { ascending: true });
          if (data) setToolsList(data.map((item: any) => ({
            id: item.id, name: item.name, nameEn: item.name_en,
            description: item.description, descriptionEn: item.description_en,
            icon: item.icon, category: item.category, imageUrl: item.image_url
          })));
          break;
        }
        case 'brands': {
          const { data } = await supabase.from('brands').select('*').order('created_at', { ascending: true });
          if (data) setBrandsList(data.map((item: any) => ({
            id: item.id, name: item.name, nameEn: item.name_en,
            subtitle: item.subtitle, subtitleEn: item.subtitle_en,
            description: item.description, descriptionEn: item.description_en,
            visualUrl: item.visual_url
          })));
          break;
        }
        case 'offers': {
          const { data } = await supabase.from('offers').select('*').order('created_at', { ascending: false });
          if (data) setOffersList(data.map((item: any) => ({
            id: item.id, title: item.title, titleEn: item.title_en,
            description: item.description, descriptionEn: item.description_en,
            discountBadge: item.discount_badge, discountBadgeEn: item.discount_badge_en,
            validUntil: item.valid_until, promoCode: item.promo_code, imageUrl: item.image_url
          })));
          break;
        }
        case 'reviews': {
          const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
          if (data) setReviewsList(data.map((item: any) => ({
            id: item.id, userName: item.user_name, rating: item.rating,
            comment: item.comment, commentEn: item.comment_en, userAvatar: item.user_avatar
          })));
          break;
        }
        case 'blogs': {
          const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
          if (data) setBlogsList(data.map((item: any) => ({
            id: item.id, title: item.title, excerpt: item.excerpt,
            author: item.author, date: item.date, imageUrl: item.image_url, content: item.content
          })));
          break;
        }
        case 'homestats': {
          const { data } = await supabase.from('homestats').select('*').order('created_at', { ascending: true });
          if (data) setHomeStatsList(data.map((item: any) => ({
            id: item.id, icon: item.icon, label: item.label,
            labelEn: item.label_en, value: item.value
          })));
          break;
        }
        case 'aboutcards': {
          const { data } = await supabase.from('aboutcards').select('*').order('created_at', { ascending: true });
          if (data) setAboutCardsList(data.map((item: any) => ({
            id: item.id, icon: item.icon, title: item.title,
            titleEn: item.title_en, description: item.description, descriptionEn: item.description_en
          })));
          break;
        }
        case 'gateways': {
          const { data } = await supabase.from('gateways').select('*').order('created_at', { ascending: true });
          if (data) setPaymentGatewaysList(data);
          break;
        }
        case 'contacts': {
          const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: true });
          if (data) setContactsList(data.map((item: any) => ({
            id: item.id, label: item.label, labelEn: item.label_en,
            value: item.value, icon: item.icon, link: item.link
          })));
          break;
        }
        case 'plans': {
          const { data } = await supabase.from('plans').select('*').order('created_at', { ascending: true });
          if (data) setSubscriptionPlans(data.map((item: any) => ({
            id: item.id, title: item.title, priceUsd: item.price_usd,
            originalPriceUsd: item.original_price_usd, discountTag: item.discount_tag,
            durationLabel: item.duration_label, isPopular: item.is_popular, isFree: item.is_free
          })));
          break;
        }
        case 'system_config': {
          const { data } = await supabase.from('system_config').select('*');
          if (data) {
            setSystemConfigMap(Object.fromEntries(data.map((item: any) => [item.key, item.value])));
          }
          break;
        }
        case 'admins': {
          const { data: adminsData } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
          if (adminsData) setAdminsList(adminsData);
          break;
        }
        case 'support_messages': {
          const { data } = await supabase.from('support_messages').select('*').order('created_at', { ascending: false });
          if (data) setSupportMessagesList(data.map((item: any) => ({
            id: item.id, email: item.email, name: item.name,
            message: item.message, status: item.status,
            createdAt: item.created_at
          })));
          break;
        }
        case 'telemetry': {
          const { data } = await supabase.from('telemetry').select('*').order('created_at', { ascending: false });
          if (data) setTelemetryList(data.map((item: any) => ({
            id: item.id, type: item.type, path: item.path,
            elementName: item.element_name, timestamp: item.timestamp,
            sessionToken: item.session_token, ipLocation: item.ip_location
          })));
          break;
        }
      }
    } catch (err) {
      console.error(`Error refetching ${table}:`, err);
    }
  }, []);

  // 1. Services wrappers
  const handleAddNewService = async (newS: ServiceItem) => {
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      try {
        const { data, error } = await supabase.from('services').insert([{
          title: newS.title,
          title_en: newS.titleEn || newS.title,
          description: newS.description,
          description_en: newS.descriptionEn || newS.description,
          category: newS.category,
          highlight: newS.highlight,
          image_url: newS.imageUrl
        }]).select('*').single();
        if (!error && data) {
          const saved: ServiceItem = {
            id: data.id,
            title: data.title,
            titleEn: data.title_en,
            description: data.description,
            descriptionEn: data.description_en,
            category: data.category,
            highlight: data.highlight,
            imageUrl: data.image_url,
            showcaseFiles: []
          };
          setServicesList(prev => [saved, ...prev.filter(s => s.id !== newS.id)]);
          return;
        }
      } catch (err) {
        console.error("Supabase insert service error:", err);
      }
    }
    setServicesList(prev => [newS, ...prev]);
  };

  const handleDeleteService = async (id: string) => {
    setServicesList(prev => prev.filter(s => s.id !== id));
    if (import.meta.env.VITE_SUPABASE_URL && isUUID(id)) {
      await supabase.from('services').delete().eq('id', id);
    }
  };

  const handleUpdateServices = async (updater: React.SetStateAction<ServiceItem[]>) => {
    setServicesList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        updated.forEach(async (s) => {
          const p = prev.find(item => item.id === s.id);
          if (p && JSON.stringify(p) !== JSON.stringify(s)) {
            if (isUUID(s.id)) {
              await supabase.from('services').update({
                title: s.title,
                title_en: s.titleEn,
                description: s.description,
                description_en: s.descriptionEn,
                category: s.category,
                highlight: s.highlight,
                image_url: s.imageUrl
              }).eq('id', s.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 2. Tools wrappers
  const handleAddNewTool = async (newT: SptTool) => {
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      try {
        const { data, error } = await supabase.from('tools').insert([{
          name: newT.name,
          name_en: newT.nameEn || newT.name,
          description: newT.description,
          description_en: newT.descriptionEn || newT.description,
          icon: newT.icon,
          category: newT.category,
          image_url: newT.imageUrl
        }]).select('*').single();
        if (!error && data) {
          const saved: SptTool = {
            id: data.id,
            name: data.name,
            nameEn: data.name_en,
            description: data.description,
            descriptionEn: data.description_en,
            icon: data.icon,
            category: data.category,
            imageUrl: data.image_url
          };
          setToolsList(prev => [...prev.filter(t => t.id !== newT.id), saved]);
          return;
        }
      } catch (err) {
        console.error("Supabase insert tool error:", err);
      }
    }
    setToolsList(prev => [...prev, newT]);
  };

  const handleDeleteTool = async (id: string) => {
    setToolsList(prev => prev.filter(t => t.id !== id));
    if (import.meta.env.VITE_SUPABASE_URL && isUUID(id)) {
      await supabase.from('tools').delete().eq('id', id);
    }
  };

  const handleUpdateTools = async (updater: React.SetStateAction<SptTool[]>) => {
    setToolsList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        updated.forEach(async (t) => {
          const p = prev.find(item => item.id === t.id);
          if (p && JSON.stringify(p) !== JSON.stringify(t)) {
            if (isUUID(t.id)) {
              await supabase.from('tools').update({
                name: t.name,
                name_en: t.nameEn,
                description: t.description,
                description_en: t.descriptionEn,
                icon: t.icon,
                category: t.category,
                image_url: t.imageUrl
              }).eq('id', t.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 3. Brands wrappers
  const handleAddNewBrand = async (newB: AccessoryBrand) => {
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      try {
        const { data, error } = await supabase.from('brands').insert([{
          name: newB.name,
          name_en: newB.nameEn || newB.name,
          subtitle: newB.subtitle,
          subtitle_en: newB.subtitleEn || newB.subtitle,
          description: newB.description,
          description_en: newB.descriptionEn || newB.description,
          visual_url: newB.visualUrl
        }]).select('*').single();
        if (!error && data) {
          const saved: AccessoryBrand = {
            id: data.id,
            name: data.name,
            nameEn: data.name_en,
            subtitle: data.subtitle,
            subtitleEn: data.subtitle_en,
            description: data.description,
            descriptionEn: data.description_en,
            visualUrl: data.visual_url
          };
          setBrandsList(prev => [saved, ...prev.filter(b => b.id !== newB.id)]);
          return;
        }
      } catch (err) {
        console.error("Supabase insert brand error:", err);
      }
    }
    setBrandsList(prev => [newB, ...prev]);
  };

  const handleDeleteBrand = async (id: string) => {
    setBrandsList(prev => prev.filter(b => b.id !== id));
    if (import.meta.env.VITE_SUPABASE_URL && isUUID(id)) {
      await supabase.from('brands').delete().eq('id', id);
    }
  };

  const handleUpdateBrands = async (updater: React.SetStateAction<AccessoryBrand[]>) => {
    setBrandsList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        updated.forEach(async (b) => {
          const p = prev.find(item => item.id === b.id);
          if (p && JSON.stringify(p) !== JSON.stringify(b)) {
            if (isUUID(b.id)) {
              await supabase.from('brands').update({
                name: b.name,
                name_en: b.nameEn,
                subtitle: b.subtitle,
                subtitle_en: b.subtitleEn,
                description: b.description,
                description_en: b.descriptionEn,
                visual_url: b.visualUrl
              }).eq('id', b.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 4. Offers wrappers
  const handleSetOffersList = async (updater: React.SetStateAction<OfferItem[]>) => {
    setOffersList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            await supabase.from('offers').delete().eq('id', d.id);
          }
        });
        updated.forEach(async (o) => {
          const isNew = !isUUID(o.id);
          if (isNew) {
            const { data, error } = await supabase.from('offers').insert([{
              title: o.title,
              title_en: o.titleEn || o.title,
              description: o.description,
              description_en: o.descriptionEn || o.description,
              discount_badge: o.discountBadge,
              discount_badge_en: o.discountBadgeEn || o.discountBadge,
              valid_until: o.validUntil,
              promo_code: o.promoCode,
              image_url: o.imageUrl
            }]).select('*').single();
            if (!error && data) {
              setOffersList(curr => curr.map(item => item.id === o.id ? { ...item, id: data.id } : item));
            }
          } else {
            const p = prev.find(item => item.id === o.id);
            if (p && JSON.stringify(p) !== JSON.stringify(o)) {
              await supabase.from('offers').update({
                title: o.title,
                title_en: o.titleEn,
                description: o.description,
                description_en: o.descriptionEn,
                discount_badge: o.discountBadge,
                discount_badge_en: o.discountBadgeEn,
                valid_until: o.validUntil,
                promo_code: o.promoCode,
                image_url: o.imageUrl
              }).eq('id', o.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 5. Homestats wrappers
  const handleSetHomeStatsList = async (updater: React.SetStateAction<HomeStatCard[]>) => {
    setHomeStatsList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            await supabase.from('homestats').delete().eq('id', d.id);
          }
        });
        updated.forEach(async (hs) => {
          const isNew = !isUUID(hs.id);
          if (isNew) {
            const { data, error } = await supabase.from('homestats').insert([{
              badge: hs.badge,
              badge_en: hs.badgeEn || hs.badge,
              title: hs.title,
              title_en: hs.titleEn || hs.title,
              description: hs.description,
              description_en: hs.descriptionEn || hs.description,
              image_url: hs.imageUrl
            }]).select('*').single();
            if (!error && data) {
              setHomeStatsList(curr => curr.map(item => item.id === hs.id ? { ...item, id: data.id } : item));
            }
          } else {
            const p = prev.find(item => item.id === hs.id);
            if (p && JSON.stringify(p) !== JSON.stringify(hs)) {
              await supabase.from('homestats').update({
                badge: hs.badge,
                badge_en: hs.badgeEn,
                title: hs.title,
                title_en: hs.titleEn,
                description: hs.description,
                description_en: hs.descriptionEn,
                image_url: hs.imageUrl
              }).eq('id', hs.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 6. Aboutcards wrappers
  const handleSetAboutCardsList = async (updater: React.SetStateAction<AboutCard[]>) => {
    setAboutCardsList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            await supabase.from('aboutcards').delete().eq('id', d.id);
          }
        });
        updated.forEach(async (ac) => {
          const isNew = !isUUID(ac.id);
          if (isNew) {
            const { data, error } = await supabase.from('aboutcards').insert([{
              title: ac.title,
              title_en: ac.titleEn || ac.title,
              description: ac.description,
              description_en: ac.descriptionEn || ac.description,
              icon: ac.icon,
              image_url: ac.imageUrl
            }]).select('*').single();
            if (!error && data) {
              setAboutCardsList(curr => curr.map(item => item.id === ac.id ? { ...item, id: data.id } : item));
            }
          } else {
            const p = prev.find(item => item.id === ac.id);
            if (p && JSON.stringify(p) !== JSON.stringify(ac)) {
              await supabase.from('aboutcards').update({
                title: ac.title,
                title_en: ac.titleEn,
                description: ac.description,
                description_en: ac.descriptionEn,
                icon: ac.icon,
                image_url: ac.imageUrl
              }).eq('id', ac.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 7. Reviews wrappers
  const handleSetReviewsList = async (updater: React.SetStateAction<ReviewItem[]>) => {
    setReviewsList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            await supabase.from('reviews').delete().eq('id', d.id);
          }
        });
        updated.forEach(async (r) => {
          const isNew = !isUUID(r.id);
          if (isNew) {
            const { data, error } = await supabase.from('reviews').insert([{
              name: r.name,
              name_en: r.nameEn || r.name,
              role: r.role,
              role_en: r.roleEn || r.role,
              comment: r.comment,
              comment_en: r.commentEn || r.comment,
              rating: r.rating,
              avatar_seed: r.avatarSeed,
              image_url: r.imageUrl,
              pinned: r.pinned,
              hidden: r.hidden
            }]).select('*').single();
            if (!error && data) {
              setReviewsList(curr => curr.map(item => item.id === r.id ? { ...item, id: data.id } : item));
            }
          } else {
            const p = prev.find(item => item.id === r.id);
            if (p && JSON.stringify(p) !== JSON.stringify(r)) {
              await supabase.from('reviews').update({
                name: r.name,
                name_en: r.nameEn,
                role: r.role,
                role_en: r.roleEn,
                comment: r.comment,
                comment_en: r.commentEn,
                rating: r.rating,
                avatar_seed: r.avatarSeed,
                image_url: r.imageUrl,
                pinned: r.pinned,
                hidden: r.hidden
              }).eq('id', r.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 8. Blogs wrappers
  const handleSetBlogsList = async (updater: React.SetStateAction<BlogPost[]>) => {
    setBlogsList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            await supabase.from('blogs').delete().eq('id', d.id);
          }
        });
        updated.forEach(async (b) => {
          const isNew = !isUUID(b.id);
          if (isNew) {
            const { data, error } = await supabase.from('blogs').insert([{
              title: b.title,
              title_en: b.titleEn || b.title,
              content: b.content,
              content_en: b.contentEn || b.content,
              media_type: b.mediaType,
              media_url: b.mediaUrl,
              author: b.author
            }]).select('*').single();
            if (!error && data) {
              setBlogsList(curr => curr.map(item => item.id === b.id ? { ...item, id: data.id } : item));
            }
          } else {
            const p = prev.find(item => item.id === b.id);
            if (p && JSON.stringify(p) !== JSON.stringify(b)) {
              await supabase.from('blogs').update({
                title: b.title,
                title_en: b.titleEn,
                content: b.content,
                content_en: b.contentEn,
                media_type: b.mediaType,
                media_url: b.mediaUrl,
                author: b.author
              }).eq('id', b.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 9. Contacts wrappers
  const handleSetContactsList = async (updater: React.SetStateAction<ContactLinkItem[]>) => {
    setContactsList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            await supabase.from('contacts').delete().eq('id', d.id);
          }
        });
        updated.forEach(async (c) => {
          const isNew = !isUUID(c.id);
          if (isNew) {
            const { data, error } = await supabase.from('contacts').insert([{
              title: c.title,
              title_en: c.titleEn || c.title,
              url: c.url,
              image_url: c.imageUrl
            }]).select('*').single();
            if (!error && data) {
              setContactsList(curr => curr.map(item => item.id === c.id ? { ...item, id: data.id } : item));
            }
          } else {
            const p = prev.find(item => item.id === c.id);
            if (p && JSON.stringify(p) !== JSON.stringify(c)) {
              await supabase.from('contacts').update({
                title: c.title,
                title_en: c.titleEn,
                url: c.url,
                image_url: c.imageUrl
              }).eq('id', c.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 10. Subscription Plans wrappers
  const handleSetSubscriptionPlans = async (updater: React.SetStateAction<any[]>) => {
    setSubscriptionPlans(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            await supabase.from('plans').delete().eq('id', d.id);
          }
        });
        updated.forEach(async (plan) => {
          const isNew = !isUUID(plan.id);
          if (isNew) {
            const { data, error } = await supabase.from('plans').insert([{
              title: plan.title,
              price_usd: plan.priceUsd,
              original_price_usd: plan.originalPriceUsd,
              discount_tag: plan.discountTag,
              duration_label: plan.durationLabel,
              is_popular: plan.isPopular,
              is_free: plan.isFree
            }]).select('*').single();
            if (!error && data) {
              setSubscriptionPlans(curr => curr.map(item => item.id === plan.id ? { ...item, id: data.id } : item));
            }
          } else {
            const p = prev.find(item => item.id === plan.id);
            if (p && JSON.stringify(p) !== JSON.stringify(plan)) {
              await supabase.from('plans').update({
                title: plan.title,
                price_usd: plan.priceUsd,
                original_price_usd: plan.originalPriceUsd,
                discount_tag: plan.discountTag,
                duration_label: plan.durationLabel,
                is_popular: plan.isPopular,
                is_free: plan.isFree
              }).eq('id', plan.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 11. SPT Users wrappers
  const handleSetSptUsersList = async (updater: React.SetStateAction<SptUser[]>) => {
    setSptUsersList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            await supabase.from('profiles').delete().eq('id', d.id);
          }
        });
        updated.forEach(async (u) => {
          const isNew = !isUUID(u.id);
          if (isNew) {
            const { data, error } = await supabase.from('profiles').insert([{
              name: u.name,
              email: u.email,
              subscription_status: u.subscriptionStatus,
              subscription_plan: u.subscriptionPlan,
              subscription_expires_at: u.subscriptionExpiresAt
            }]).select('*').single();
            if (!error && data) {
              setSptUsersList(curr => curr.map(item => item.id === u.id ? { ...item, id: data.id } : item));
            }
          } else {
            const p = prev.find(item => item.id === u.id);
            if (p && JSON.stringify(p) !== JSON.stringify(u)) {
              await supabase.from('profiles').update({
                name: u.name,
                email: u.email,
                subscription_status: u.subscriptionStatus,
                subscription_plan: u.subscriptionPlan,
                subscription_expires_at: u.subscriptionExpiresAt
              }).eq('id', u.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 12a. Admins List wrappers
  const handleSetAdminsList = async (updater: React.SetStateAction<any[]>) => {
    setAdminsList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            await supabase.from('admins').delete().eq('id', d.id);
          }
        });
        updated.forEach(async (a) => {
          const isNew = !isUUID(a.id);
          if (isNew) {
            const { data, error } = await supabase.from('admins').insert([{
              name: a.name,
              email: a.email,
              role: a.role,
              is_active: a.isActive
            }]).select('*').single();
            if (!error && data) {
              setAdminsList(curr => curr.map(item => item.id === a.id ? { ...item, id: data.id } : item));
            }
          } else {
            const p = prev.find(item => item.id === a.id);
            if (p && JSON.stringify(p) !== JSON.stringify(a)) {
              await supabase.from('admins').update({
                name: a.name,
                email: a.email,
                role: a.role,
                is_active: a.isActive
              }).eq('id', a.id);
            }
          }
        });
      }
      return updated;
    });
  };

  // 12. Dynamic Payment Gateways live sync wrappers
  const handleSetPaymentGatewaysList = async (updater: React.SetStateAction<any[]>) => {
    setPaymentGatewaysList(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (import.meta.env.VITE_SUPABASE_URL) {
        const deleted = prev.filter(p => !updated.some(u => u.id === p.id));
        deleted.forEach(async (d) => {
          if (isUUID(d.id)) {
            try {
              await supabase.from('gateways').delete().eq('id', d.id);
            } catch (err) {
              console.log("Failed to delete gateway from Supabase:", err);
            }
          }
        });
        updated.forEach(async (gateway) => {
          const isNew = !isUUID(gateway.id);
          if (isNew) {
            try {
              const { data, error } = await supabase.from('gateways').insert([{
                type: gateway.type,
                name: gateway.name,
                name_en: gateway.nameEn || gateway.name,
                details: gateway.details,
                details_en: gateway.detailsEn || gateway.details,
                is_active: gateway.isActive
              }]).select('*').single();
              if (!error && data) {
                setPaymentGatewaysList(curr => curr.map(item => item.id === gateway.id ? { ...item, id: data.id } : item));
              }
            } catch (err) {
              console.log("Failed to insert gateway in Supabase:", err);
            }
          } else {
            const p = prev.find(item => item.id === gateway.id);
            if (p && JSON.stringify(p) !== JSON.stringify(gateway)) {
              try {
                await supabase.from('gateways').update({
                  type: gateway.type,
                  name: gateway.name,
                  name_en: gateway.nameEn,
                  details: gateway.details,
                  details_en: gateway.detailsEn,
                  is_active: gateway.isActive
                }).eq('id', gateway.id);
              } catch (err) {
                console.log("Failed to update gateway in Supabase:", err);
              }
            }
          }
        });
      }
      return updated;
    });
  };



  // Real-time Telemetry states for data analytics suite
  const [telemetryList, setTelemetryList] = useState<TelemetryEvent[]>([]);

  const trackTelemetryEvent = (type: 'pageview' | 'click' | 'signup' | 'contact', path: string, elementName?: string) => {
    let sessionToken = sessionStorage.getItem('spt_session_token');
    if (!sessionToken) {
      sessionToken = `sess_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('spt_session_token', sessionToken);
    }

    const locations = ['Colombo', 'Kandy', 'Galle', 'Gampaha', 'Negombo', 'Kurunegala', 'Kalutara', 'Matara'];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];

    const newEvent: TelemetryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      path,
      elementName,
      timestamp: new Date().toISOString(),
      sessionToken,
      ipLocation: randomLocation
    };

    setTelemetryList(prev => {
      const updated = [newEvent, ...prev].slice(0, 500);
      return updated;
    });

    const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (isSupabaseReady) {
      supabase.from('telemetry').insert([{
        id: newEvent.id, type: newEvent.type, path: newEvent.path,
        element_name: newEvent.elementName, timestamp: newEvent.timestamp,
        session_token: newEvent.sessionToken, ip_location: newEvent.ipLocation
      }]).then(({ error }) => { if (error) console.error('Telemetry insert error:', error); });
    }
  };

  const clearTelemetry = () => {
    setTelemetryList([]);
    const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (isSupabaseReady) {
      supabase.from('telemetry').delete().neq('id', 'none').then(({ error }) => { if (error) console.error('Telemetry delete error:', error); });
    }
  };

  // Dynamic lists capable of being updated by Admin
  const [toolsList, setToolsList] = useState<SptTool[]>(INITIAL_TOOLS);
  const [servicesList, setServicesList] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [brandsList, setBrandsList] = useState<AccessoryBrand[]>(ACCESSORY_BRANDS);
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(INITIAL_REVIEWS);

  // New Custom States requested by user
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([
      { id: 'plan_1', title: 'WEEKLY PACK', priceUsd: 1, originalPriceUsd: 10, discountTag: '90% OFF', durationLabel: 'සතියක් වලංගු සම්පූර්ණ ප්‍රවේශය', isPopular: false, isFree: false },
      { id: 'plan_2', title: 'MONTHLY PACK', priceUsd: 3, originalPriceUsd: 30, discountTag: '90% OFF', durationLabel: 'මසක් වලංගු සම්පූර්ණ ප්‍රවේශය', isPopular: false, isFree: false },
      { id: 'plan_3', title: '6 MO PACK', priceUsd: 15, originalPriceUsd: 150, discountTag: '90% OFF', durationLabel: 'මාස 6ක කාලයක් සඳහා වරප්‍රසාද', isPopular: false, isFree: false },
      { id: 'plan_4', title: 'YEARLY PACK', priceUsd: 20, originalPriceUsd: 200, discountTag: '90% OFF', durationLabel: 'මුළු වසරක් සඳහා වලංගු SPT මෙවලම්', isPopular: false, isFree: false },
      { id: 'plan_5', title: 'LIFETIME PACK', priceUsd: 100, originalPriceUsd: 1000, discountTag: '90% OFF', durationLabel: 'ජීවිත කාලයටම SPT සාමාජිකත්වය', isPopular: false, isFree: false },
      { id: 'plan_6', title: '7-DAY FREE TRIAL', priceUsd: 0, durationLabel: 'නොමිලේ අත්හදා බැලීම (Free Trial)', isPopular: false, isFree: true }
  ]);

  const [supportMessagesList, setSupportMessagesList] = useState<any[]>([]);
  const [systemConfigMap, setSystemConfigMap] = useState<Record<string,string>>({});

  const [offersList, setOffersList] = useState<OfferItem[]>([
      {
        id: 'o1',
        title: 'AI Commercial Launch Offer',
        description: 'Get a full digital commercial ad campaign with cinematic 4K assets & professional sound syncing for your business brand at a highly premium discount.',
        discountBadge: '30% OFF',
        validUntil: 'July 31, 2026',
        promoCode: 'SPTAI30'
      },
      {
        id: 'o2',
        title: 'Free Custom Styled QR Builder',
        description: 'Generate high-resolution custom style QRs with tailored branding logo offsets absolutely free with any custom design or music service purchase.',
        discountBadge: 'FREE',
        validUntil: 'Permanent Offer',
        promoCode: 'SPTQR2026'
      }
  ]);

  const [homeStatsList, setHomeStatsList] = useState<HomeStatCard[]>([
      { id: 'hs1', badge: 'AI Production', title: '100% Real-time APIs', description: 'SaaS Microservices' },
      { id: 'hs2', badge: 'Original Music', title: '50+ Tracks compiled', description: 'Bespoke Melodies' },
      { id: 'hs3', badge: 'Aura Styling', title: 'Modular theme controls', description: 'Dynamic Opacities' },
      { id: 'hs4', badge: 'Eco Apparel', title: 'Streetwear & Artworks', description: 'KBERA Printing' }
  ]);

  const [aboutCardsList, setAboutCardsList] = useState<AboutCard[]>([
      { id: 'a1', title: 'පරමාර්ථය (Our Vision)', description: 'සෑම ව්‍යාපාරයකටම සහ පුද්ගලයෙකුටම අවශ්‍ය උසස්ම මට්ටමේ ඩිජිටල්, වීඩියෝ සහ සංගීතමය සහාය සදහා නිරන්තරයෙන්ම නව්‍ය නිර්මාණ සැපයීම.', icon: 'Sparkles' },
      { id: 'a2', title: 'තාක්ෂණික පද්ධතිය (Tech Matrix)', description: 'අති නවීන AI ඇල්ගොරිතම සහ ක්ලවුඩ් පද්ධති භාවිතයෙන් සියලුම සේවා සහ මෙවලම් (SPT Tools Center) ක්‍රියාත්මක කිරීම.', icon: 'Layers' },
      { id: 'a3', title: 'විශ්වසනීයත්වය (Absolute Trust)', description: 'ඔබගේ තොරතුරු වල සුරක්ෂිතභාවය සහ ආයතනික රහස්‍යභාවය 100%ක් ඉහළින්ම සුරකින සුවිශේෂී ආරක්ෂක පද්ධතිය.', icon: 'Shield' }
  ]);

  const [contactsList, setContactsList] = useState<ContactLinkItem[]>([
      { id: 'c1', title: 'WhatsApp Helpline', url: 'https://wa.me/94770000000', imageUrl: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=200&auto=format&fit=crop' },
      { id: 'c2', title: 'Official Email Support', url: 'mailto:sadeeppasindu0218@gmail.com', imageUrl: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?q=80&w=200&auto=format&fit=crop' },
      { id: 'c3', title: 'Founder Facebook Profile', url: 'https://facebook.com', imageUrl: 'https://images.unsplash.com/photo-1627843563095-f6e94e7afee5?q=80&w=200&auto=format&fit=crop' }
  ]);

  const [sptUsersList, setSptUsersList] = useState<SptUser[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);

  // Fetch profiles from Supabase on mount + subscribe to realtime
  React.useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          const mapped = data.map((p: any): SptUser => ({
            id: p.id || `profile_${Date.now()}`,
            name: p.name || p.email?.split('@')[0] || 'User',
            email: p.email?.toLowerCase() || '',
            registeredAt: p.created_at || new Date().toISOString(),
            subscriptionStatus: p.subscription_status || 'trial',
            subscriptionPlan: p.subscription_plan || undefined,
            subscriptionExpiresAt: p.subscription_expires_at || undefined,
            receiptUrl: p.receipt_url || undefined,
            paymentReference: p.payment_reference || undefined,
            paymentSubmittedAt: p.payment_submitted_at || undefined,
            profilePictureUrl: p.profile_picture_url || undefined,
          }));
          setSptUsersList(prev => {
            // Merge: Supabase profiles override existing state
            const merged = [...mapped];
            for (const local of prev) {
              if (!merged.some(m => m.email.toLowerCase() === local.email.toLowerCase())) {
                merged.push(local);
              }
            }
            return merged;
          });
        }
      } catch (err) {
        console.error('Error fetching profiles:', err);
      }
    }
    fetchProfiles();
    // Real-time subscription
    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
        if (payload.new?.email) {
          const p = payload.new;
          const mapped: SptUser = {
            id: p.id || `profile_${Date.now()}`,
            name: p.name || p.email?.split('@')[0] || 'User',
            email: p.email?.toLowerCase() || '',
            registeredAt: p.created_at || new Date().toISOString(),
            subscriptionStatus: p.subscription_status || 'trial',
            subscriptionPlan: p.subscription_plan || undefined,
            subscriptionExpiresAt: p.subscription_expires_at || undefined,
            receiptUrl: p.receipt_url || undefined,
            paymentReference: p.payment_reference || undefined,
            paymentSubmittedAt: p.payment_submitted_at || undefined,
            profilePictureUrl: p.profile_picture_url || undefined,
          };
          setSptUsersList(prev => {
            const idx = prev.findIndex(u => u.email.toLowerCase() === mapped.email.toLowerCase());
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...mapped };
              return updated;
            }
            return [mapped, ...prev];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const [blogsList, setBlogsList] = useState<BlogPost[]>([
      {
        id: 'b1',
        title: 'Technology & High-End Art Fusion (තාක්ෂණය සහ කලා සුසංයෝගය)',
        content: 'SPT OFFICIAL incorporates high-level scientific and aesthetic processes designed to bridge engineering with natural human art forms. In this cosmic era, design is not merely pixel management; it is a galactic system designed to match high-end soundscapes and visual alignment.',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        author: 'Sadeep Pasindu'
      },
      {
        id: 'b2',
        title: 'Designing Interactive Tools for Next-Gen Creative Workspaces',
        content: 'Our micro-systems such as QR styling and premium binary compositions allow digital designers to execute top-tier commercial marketing assets efficiently. This blog post explores how we leverage custom color matrices to produce robust graphic standards.',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        author: 'SPT Core System'
      }
  ]);

  // Centralized Dynamic Payment Gateways
  const [paymentGatewaysList, setPaymentGatewaysList] = useState<any[]>([
      { id: 'pay_bank', type: 'bank', name: 'Bank Transfer (BOC, Commercial)', nameEn: 'Bank Transfer (BOC, Commercial)', details: 'Account number: 80249204021\nBank Name: Commercial Bank of Ceylon (ComBank)\nBranch: Gampaha Main City Office\nAccount Name: Sadeep Pasindu Creative Hub', detailsEn: 'Account number: 80249204021\nBank Name: Commercial Bank of Ceylon (ComBank)\nBranch: Gampaha Main City Office\nAccount Name: Sadeep Pasindu Creative Hub', isActive: true },
      { id: 'pay_gpay', type: 'googlepay', name: 'Google Pay', nameEn: 'Google Pay', details: 'GPAY: sptofficial@gmail.com\nSend funds safely to our Google Pay address.', detailsEn: 'GPAY: sptofficial@gmail.com\nSend funds safely to our Google Pay address.', isActive: false },
      { id: 'pay_paypal', type: 'paypal', name: 'PayPal', nameEn: 'PayPal', details: 'Paypal: sptofficial@paypal.com\nSend global payments securely to our business PayPal.', detailsEn: 'Paypal: sptofficial@paypal.com\nSend global payments securely to our business PayPal.', isActive: false }
  ]);


  React.useEffect(() => {
    const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (isSupabaseReady) {
      supabase.from('marketing_counters').upsert({ id: 'global', registered_count: displayRegisteredCount, updated_at: new Date().toISOString() }, { onConflict: 'id' }).then(({ error }) => { if (error) console.error('Counter sync error:', error); });
    }
  }, [displayRegisteredCount]);
  React.useEffect(() => {
    const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (isSupabaseReady) {
      supabase.from('marketing_counters').upsert({ id: 'global', subscribed_count: displaySubscribedCount, updated_at: new Date().toISOString() }, { onConflict: 'id' }).then(({ error }) => { if (error) console.error('Counter sync error:', error); });
    }
  }, [displaySubscribedCount]);

  // Subscription Payment flow states
  const [showLkrPrices, setShowLkrPrices] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<'weekly' | 'monthly' | '6months' | 'yearly' | 'lifetime' | null>(null);
  const [selectedPlanIdInPlans, setSelectedPlanIdInPlans] = useState<string>('plan_1');
  const [liveLkrRate, setLiveLkrRate] = useState<number>(303.45);
  const [isFetchingLkr, setIsFetchingLkr] = useState<boolean>(false);
  const [hasCheckedLkr, setHasCheckedLkr] = useState<boolean>(false);
  const [uploadedReceiptB64, setUploadedReceiptB64] = useState<string>('');
  const [generatedRefCode, setGeneratedRefCode] = useState<string>('');
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('');
  const [showPlansPaymentGateArea, setShowPlansPaymentGateArea] = useState<boolean>(false);
  const [showPaymentCheckout, setShowPaymentCheckout] = useState<boolean>(false);
  const [pendingPlanCheckoutAfterLogin, setPendingPlanCheckoutAfterLogin] = useState<string | null>(null);

  // Profile modal password and avatar change state controls
  const [profileOldPass, setProfileOldPass] = useState<string>('');
  const [profileNewPass, setProfileNewPass] = useState<string>('');
  const [profileConfirmPass, setProfileConfirmPass] = useState<string>('');
  const [isUpdatingProfilePass, setIsUpdatingProfilePass] = useState<boolean>(false);


  // Auto fetch live exchange rate on load
  React.useEffect(() => {
    handleFetchLiveLkr();
  }, []);

  // Sync user profile fields to Supabase profiles table
  const syncProfileToSupabase = async (email: string, updates: Record<string, any>) => {
    try {
      await fetch('/api/admin/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), ...updates }),
      });
    } catch (err) {
      console.error("Profile sync error:", err);
    }
  };

  const handleFetchLiveLkr = async () => {
    setIsFetchingLkr(true);
    setHasCheckedLkr(true);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (response.ok) {
        const data = await response.json();
        if (data && data.rates && data.rates.LKR) {
          const rate = Number(data.rates.LKR);
          setLiveLkrRate(rate || 303.45);
        }
      }
    } catch (err) {
      console.error('Error fetching live LKR rate:', err);
      // Fallback is 303.45
    } finally {
      setIsFetchingLkr(false);
    }
  };

  const handleSelectPlanAction = (plan: any) => {
    setSelectedPlanIdInPlans(plan.id);
    setShowPlansPaymentGateArea(false);

    if (plan.priceUsd === 0) {
      if (!customerSession) {
        setShowLoginWall(true);
        alert(t('නොමිලේ අත්හදා බැලීම සක්‍රීය කිරීමට කරුණාකර පළමුව ලොග් වන්න.', 'Please login/sign up first to activate the free trial!'));
        return;
      }
      
      const userEmail = customerSession.email;
      const currentUser = sptUsersList.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
      
      // Check if user has active paid plan - prevent switching to trial
      const hasActivePaidPlan = currentUser && 
        currentUser.subscriptionStatus === 'active' && 
        currentUser.subscriptionPlan && 
        currentUser.subscriptionPlan !== 'trial' &&
        currentUser.subscriptionExpiresAt &&
        new Date(currentUser.subscriptionExpiresAt).getTime() > Date.now();
      
      if (hasActivePaidPlan) {
        alert(t('ඔබට සාර්ථක සක්‍රීය වී ඇති ගෙවීම් පැකේජයක් ඇත. එය අවසන් වීමෙන් පස්සේ පමණක් නොමිලේ කාලය ලබා ගත හැක.', 'You have an active paid plan. Free trial can only be activated after it expires.'));
        return;
      }
      
      setDisplaySubscribedCount(prev => prev + 1);
      setSptUsersList((prev: SptUser[]) => {
        const exists = prev.some(u => u.email.toLowerCase() === userEmail.toLowerCase());
        const expDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        if (exists) {
          return prev.map(u => {
            if (u.email.toLowerCase() === userEmail.toLowerCase()) {
              return {
                ...u,
                subscriptionStatus: 'trial',
                subscriptionPlan: undefined,
                subscriptionExpiresAt: expDate
              };
            }
            return u;
          });
        } else {
          return [{
            id: `usr_${Date.now()}`,
            name: customerSession.name || 'User',
            email: userEmail,
            registeredAt: new Date().toISOString(),
            subscriptionStatus: 'trial',
            subscriptionExpiresAt: expDate
          }, ...prev];
        }
      });
      // Sync free trial to Supabase profiles
      syncProfileToSupabase(userEmail, { subscription_status: 'trial', subscription_expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() });
      
      alert(t('දින 7ක නොමිලේ කාලය සාර්ථකව සක්‍රීය කරන ලදි! ඔබව මෙවලම් පිටුවට යොමු කෙරේ.', '7-Day Trial Activated successfully! Directing you to tools...'));
      setActiveTab('tools');
    } else {
      let key: 'weekly' | 'monthly' | '6months' | 'yearly' | 'lifetime' = 'weekly';
      if (plan.title.toLowerCase().includes('weekly')) key = 'weekly';
      else if (plan.title.toLowerCase().includes('monthly')) key = 'monthly';
      else if (plan.title.toLowerCase().includes('6 mo') || plan.title.toLowerCase().includes('6months') || plan.title.toLowerCase().includes('6mo')) key = '6months';
      else if (plan.title.toLowerCase().includes('yearly')) key = 'yearly';
      else if (plan.title.toLowerCase().includes('lifetime')) key = 'lifetime';

      setSelectedPlanForPayment(key);
      
      const username = customerSession?.name || 'USER';
      const cleanName = username.toUpperCase().split(' ')[0].replace(/[^A-Z]/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setGeneratedRefCode(`SPT-${cleanName}-${randomSuffix}`);
      
      const activeGateways = paymentGatewaysList.filter(g => g.isActive);
      if (activeGateways.length > 0 && !selectedGatewayId) {
        setSelectedGatewayId(activeGateways[0].id);
      }
    }
  };

  const getUserSubscriptionStatus = (email?: string) => {
    if (!email) return { status: 'expired', daysLeft: 0, reason: 'No session' };
    if (newlyRegisteredUserEmail && email.toLowerCase() === newlyRegisteredUserEmail.toLowerCase()) {
      return { status: 'expired', daysLeft: 0, reason: 'New Registration Pricing Screen Mandatory' };
    }
    const user = sptUsersList.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { status: 'trial', daysLeft: 7, reason: 'Trial' };
    }

    if (user.subscriptionStatus === 'active') {
      if (user.subscriptionExpiresAt) {
        const diff = new Date(user.subscriptionExpiresAt).getTime() - Date.now();
        if (diff <= 0) {
          return { status: 'expired', daysLeft: 0, reason: 'Expired' };
        }
        const daysLeft = Math.ceil(diff / (24 * 3600 * 1000));
        return { status: 'active', daysLeft, reason: 'Subscriber' };
      }
      return { status: 'active', daysLeft: 9999, reason: 'Lifetime' };
    }

    if (user.subscriptionStatus === 'pending') {
      return { status: 'pending', daysLeft: 0, reason: 'Pending verification' };
    }

    if (user.subscriptionStatus === 'trial') {
      if (user.subscriptionExpiresAt) {
        const diff = new Date(user.subscriptionExpiresAt).getTime() - Date.now();
        if (diff <= 0) {
          return { status: 'expired', daysLeft: 0, reason: 'Expired' };
        }
        const daysLeft = Math.ceil(diff / (24 * 3600 * 1000));
        return { status: 'trial', daysLeft, reason: 'Trial active' };
      }
      const regTime = new Date(user.registeredAt).getTime();
      const diff = (regTime + 7 * 24 * 3600 * 1000) - Date.now();
      if (diff <= 0) {
        return { status: 'expired', daysLeft: 0, reason: 'Expired' };
      }
      const daysLeft = Math.ceil(diff / (24 * 3600 * 1000));
      return { status: 'trial', daysLeft, reason: 'Trial active' };
    }

    return { status: 'expired', daysLeft: 0, reason: 'Expired' };
  };

  // Signup with Verification states
  const [confirmPass, setConfirmPass] = useState('');
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCodeSent, setVerificationCodeSent] = useState('');
  const [userInputCode, setUserInputCode] = useState('');


  // Subsidiary showcase modal
  const [activeBrandModal, setActiveBrandModal] = useState<AccessoryBrand | null>(null);
  const [activeBlogDetail, setActiveBlogDetail] = useState<BlogPost | null>(null);

  // Active service detail showcase modal
  const [activeServiceModal, setActiveServiceModal] = useState<ServiceItem | null>(null);

  // Home Shortcut PWA installer triggers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallShortcut = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  // Customer authentication session
  const [customerSession, setCustomerSession] = useState<{ name: string; email: string } | null>(null);
  const [newlyRegisteredUserEmail, setNewlyRegisteredUserEmail] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showActivatePlanBanner, setShowActivatePlanBanner] = useState(false);

  // Auto-check and update expired paid plans to expired/trial status
  const checkAndUpdateExpiredPlans = React.useCallback(() => {
    setSptUsersList((prev: SptUser[]) => {
      let updated = false;
      const newList = prev.map(u => {
        if (u.subscriptionStatus === 'active' && u.subscriptionExpiresAt) {
          const expTime = new Date(u.subscriptionExpiresAt).getTime();
          if (expTime <= Date.now()) {
            updated = true;
            return {
              ...u,
              subscriptionStatus: 'expired',
              subscriptionPlan: undefined
            };
          }
        }
        return u;
      });
      return updated ? newList : prev;
    });
  }, []);

  // Run expiry check on mount and every 30 seconds
  React.useEffect(() => {
    checkAndUpdateExpiredPlans();
    const interval = setInterval(checkAndUpdateExpiredPlans, 30000);
    return () => clearInterval(interval);
  }, [checkAndUpdateExpiredPlans]);

  // Check plan status on login and show activate banner if expired
  React.useEffect(() => {
    if (customerSession) {
      const user = sptUsersList.find(u => u.email.toLowerCase() === customerSession.email.toLowerCase());
      if (user) {
        const status = getUserSubscriptionStatus(customerSession.email);
        if (status.status === 'expired') {
          setShowActivatePlanBanner(true);
        } else {
          setShowActivatePlanBanner(false);
        }
      }
    } else {
      setShowActivatePlanBanner(false);
    }
  }, [customerSession, sptUsersList]);
  const [timeTicker, setTimeTicker] = useState(Date.now());
  const countdownDisplay = React.useMemo(() => {
    if (!customerSession) return '';
    const u = sptUsersList.find(x => x.email.toLowerCase() === customerSession.email.toLowerCase());
    if (!u) return '';
    const { subscriptionStatus: st, subscriptionPlan: sp, subscriptionExpiresAt: se } = u;
    const isTrial = st === 'trial';
    if (!isTrial && st !== 'active') return '';
    if (sp === 'lifetime') return 'LIFETIME PACK ACTIVE';
    if (!se) {
      if (isTrial && u.registeredAt) {
        const fallbackExp = new Date(u.registeredAt).getTime() + 7 * 24 * 3600 * 1000;
        const fallbackDiff = fallbackExp - Date.now();
        if (fallbackDiff > 0) {
          const d2 = Math.floor(fallbackDiff / 86400000);
          const hr2 = Math.floor((fallbackDiff % 86400000) / 3600000);
          const mi2 = Math.floor((fallbackDiff % 3600000) / 60000);
          const sec2 = Math.floor((fallbackDiff % 60000) / 1000);
          const fmt2 = d2 > 0 ? `${d2}D ${hr2}H ${mi2}M` : (hr2 > 0 ? `${hr2}H ${mi2}M ${sec2}S` : `${mi2}M ${sec2}S`);
          return `FREE TRIAL ACTIVE | ${fmt2}`;
        }
      }
      return '';
    }
    const rawDiff = new Date(se).getTime();
    if (isNaN(rawDiff)) return '';
    const diff = rawDiff - Date.now();
    if (diff <= 0) return 'Expired';
    const d = Math.floor(diff / 86400000);
    const hr = Math.floor((diff % 86400000) / 3600000);
    const mi = Math.floor((diff % 3600000) / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    const label = isTrial ? 'FREE TRIAL' : (sp ? sp.toUpperCase() + ' PACK' : 'ACTIVE');
    const fmt = d > 0 ? `${d}D ${hr}H ${mi}M` : (hr > 0 ? `${hr}H ${mi}M ${sec}S` : `${mi}M ${sec}S`);
    return `${label} ACTIVE | ${fmt}`;
  }, [customerSession, sptUsersList, timeTicker]);

  // Admin Security 6-Digit PIN States
  const [adminPin, setAdminPinState] = useState<string>('000000');
  const setAdminPin = (newPin: string) => {
    setAdminPinState(newPin);
  };
  const [isAdminPinVerified, setIsAdminPinVerified] = useState(false);
  const [showAdminPinPrompt, setShowAdminPinPrompt] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeTicker(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize plans selection dynamically to user subscription status
  React.useEffect(() => {
    if (customerSession && activeTab === 'plans') {
      const currentUserConfig = sptUsersList.find(u => u.email.toLowerCase() === customerSession.email.toLowerCase());
      if (currentUserConfig && currentUserConfig.subscriptionPlan) {
        const planCode = currentUserConfig.subscriptionPlan; // 'weekly', 'monthly', '6months', 'yearly', 'lifetime'
        let planId = 'plan_1';
        if (planCode === 'weekly') planId = 'plan_1';
        else if (planCode === 'monthly') planId = 'plan_2';
        else if (planCode === '6months') planId = 'plan_3';
        else if (planCode === 'yearly') planId = 'plan_4';
        else if (planCode === 'lifetime') planId = 'plan_5';
        
        setSelectedPlanIdInPlans(planId);
      }
    }
  }, [activeTab, customerSession, sptUsersList]);

  const [showLoginWall, setShowLoginWall] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginName, setLoginName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  React.useEffect(() => {
    if (!customerSession) {
      setIsAdminPinVerified(false);
      setShowAdminPinPrompt(false);
      setAdminPinInput('');
      setAdminPinError('');
    }
  }, [customerSession]);

  React.useEffect(() => {
    if (activeTab === 'tools') {
      if (!customerSession) {
        setShowLoginWall(true);
      } else {
        const status = getUserSubscriptionStatus(customerSession.email);
        if (status.status !== 'active' && status.status !== 'trial') {
          setShowLoginWall(true);
        }
      }
    }
  }, [activeTab, customerSession, sptUsersList]);

  // Open Tools inside Drawer state
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  // New review form
  const [revName, setRevName] = useState('');
  const [revRole, setRevRole] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revImageUrl, setRevImageUrl] = useState('');

  // Admin lock states
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Service list filter categories
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('all');

  // Helper mapping accent colors to CSS classes
  const getAccentColorHex = () => {
    switch (config.neonAccent) {
      case 'blue': return '#00f0ff';
      case 'green': return '#39ff14';
      case 'purple': return '#bd00ff';
      case 'gold': return '#fcd34d';
    }
  };

  const getAccentColorText = () => {
    switch (config.neonAccent) {
      case 'blue': return 'text-neon-blue';
      case 'green': return 'text-neon-green';
      case 'purple': return 'text-neon-purple';
      case 'gold': return 'text-amber-300';
    }
  };

  const getAccentColorBorder = () => {
    switch (config.neonAccent) {
      case 'blue': return 'border-neon-blue/30 focus:border-neon-blue';
      case 'green': return 'border-neon-green/30 focus:border-neon-green';
      case 'purple': return 'border-neon-purple/30 focus:border-neon-purple';
      case 'gold': return 'border-amber-400/30 focus:border-amber-400';
    }
  };

  const getAccentColorBg = () => {
    switch (config.neonAccent) {
      case 'blue': return 'bg-neon-blue';
      case 'green': return 'bg-neon-green';
      case 'purple': return 'bg-neon-purple';
      case 'gold': return 'bg-amber-400';
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) return;
    const resolvedName = loginName || loginEmail.split('@')[0];
    const emailLower = loginEmail.toLowerCase().trim();
    const nameLower = resolvedName.toLowerCase().trim();
    const passLower = loginPass.toLowerCase().trim();
    
    // Attempt Supabase Auth sign-in if credentials available
    const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (isSupabaseReady && loginPass) {
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailLower,
          password: loginPass,
        });
        if (signInError && signInError.message.includes('Invalid login credentials')) {
          // Try sign up instead
          await supabase.auth.signUp({
            email: emailLower,
            password: loginPass,
            options: { data: { full_name: resolvedName } }
          });
        }
      } catch (_) {}
    }

    const isMasterAdmin = 
      emailLower === 'sadeeppasindu0218@gmail.com' || 
      emailLower === 'support@spt.com' || 
      emailLower === (config.adminRecoveryEmail || '').toLowerCase().trim();

    trackTelemetryEvent('signup', activeTab, 'Join Spt Official Portal');

    const displayName = resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1);
    setCustomerSession({
      name: displayName,
      email: emailLower
    });

    setSptUsersList(prev => {
      const exists = prev.some(u => u.email.toLowerCase() === emailLower);
      if (exists) return prev;
      return [{
        id: `user_${Date.now()}`,
        name: displayName,
        email: emailLower,
        registeredAt: new Date().toISOString(),
        subscriptionStatus: 'trial',
        subscriptionExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      }, ...prev];
    });

    if (isMasterAdmin) {
      setIsAdminUnlocked(true);
    }

    const existingUser = sptUsersList.find(u => u.email.toLowerCase() === emailLower);
    let resolvedStatus = 'trial';
    if (existingUser) {
      if (existingUser.subscriptionStatus === 'active') {
        if (existingUser.subscriptionExpiresAt) {
          const diff = new Date(existingUser.subscriptionExpiresAt).getTime() - Date.now();
          resolvedStatus = diff <= 0 ? 'expired' : 'active';
        } else {
          resolvedStatus = 'active';
        }
      } else if (existingUser.subscriptionStatus === 'pending') {
        resolvedStatus = 'pending';
      } else if (existingUser.subscriptionStatus === 'trial') {
        if (existingUser.subscriptionExpiresAt) {
          const diff = new Date(existingUser.subscriptionExpiresAt).getTime() - Date.now();
          resolvedStatus = diff <= 0 ? 'expired' : 'trial';
        } else {
          resolvedStatus = 'trial';
        }
      } else {
        resolvedStatus = existingUser.subscriptionStatus || 'trial';
      }
    }

    const hasActivePlan = resolvedStatus === 'active' || resolvedStatus === 'trial';

    setLoginEmail('');
    setLoginPass('');
    setLoginName('');
    setConfirmPass('');
    setVerificationStep(false);
    setShowLoginWall(false);

    if (hasActivePlan) {
      setActiveTab('home');
    } else {
      if (pendingPlanCheckoutAfterLogin) {
        setSelectedPlanForPayment(pendingPlanCheckoutAfterLogin as any);
        const username = displayName;
        const cleanName = username.toUpperCase().split(' ')[0].replace(/[^A-Z]/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        setGeneratedRefCode(`SPT-${cleanName}-${randomSuffix}`);
        setShowPaymentCheckout(true);
        setPendingPlanCheckoutAfterLogin(null);
      }
      setActiveTab('plans');
    }
  };

  const [verificationError, setVerificationError] = useState('');

  // Step 1: Check matches and generate verification code
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginName || !loginPass || !confirmPass) {
      alert('කරුණාකර සියලුම විස්තර ඇතුලත් කරන්න. (Please fill all fields)');
      return;
    }
    if (loginPass !== confirmPass) {
      alert('මුරපද දෙක එකිනෙකට නොගැලපේ! (Passwords do not match!)');
      return;
    }

    // Generate random 6 Digit PIN code to request
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCodeSent(generatedPin);
    setVerificationStep(true);
    setVerificationError('');
    
    alert(`[Simulated Security Server] \n\nTo: ${loginEmail}\nVerification Code: ${generatedPin}\n\nEnter this 6-digit security code on the next screen to activate your account.`);
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userInputCode.trim() === verificationCodeSent) {
      const finalName = loginName.trim();
      const displayName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
      const emailLower = loginEmail.trim().toLowerCase();

      // Create Supabase Auth account on successful verification
      const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (isSupabaseReady && loginPass) {
        try {
          const { error: signUpError } = await supabase.auth.signUp({
            email: emailLower,
            password: loginPass,
            options: { data: { full_name: displayName } }
          });
          if (signUpError && !signUpError.message.includes('already')) {
            console.warn('Supabase signup note:', signUpError.message);
          }
        } catch (_) {}
      }

      setCustomerSession({
        name: displayName,
        email: emailLower
      });

      setSptUsersList(prev => {
        const exists = prev.some(u => u.email.toLowerCase() === emailLower);
        if (exists) return prev;
        return [{
          id: `user_${Date.now()}`,
          name: displayName,
          email: emailLower,
          registeredAt: new Date().toISOString(),
          subscriptionStatus: 'trial',
          subscriptionExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
        }, ...prev];
      });
      
      const isMasterAdmin = 
        emailLower === 'sadeeppasindu0218@gmail.com' || 
        emailLower === 'support@spt.com' || 
        emailLower === (config.adminRecoveryEmail || '').toLowerCase().trim();

      if (isMasterAdmin) {
        setIsAdminUnlocked(true);
      }

      const existingUser = sptUsersList.find(u => u.email.toLowerCase() === emailLower);
      let resolvedStatus = 'trial';
      if (existingUser) {
        if (existingUser.subscriptionStatus === 'active') {
          if (existingUser.subscriptionExpiresAt) {
            const diff = new Date(existingUser.subscriptionExpiresAt).getTime() - Date.now();
            resolvedStatus = diff <= 0 ? 'expired' : 'active';
          } else {
            resolvedStatus = 'active';
          }
        } else if (existingUser.subscriptionStatus === 'pending') {
          resolvedStatus = 'pending';
        } else if (existingUser.subscriptionStatus === 'trial') {
          if (existingUser.subscriptionExpiresAt) {
            const diff = new Date(existingUser.subscriptionExpiresAt).getTime() - Date.now();
            resolvedStatus = diff <= 0 ? 'expired' : 'trial';
          } else {
            resolvedStatus = 'trial';
          }
        } else {
          resolvedStatus = existingUser.subscriptionStatus || 'trial';
        }
      }

      const hasActivePlan = resolvedStatus === 'active' || resolvedStatus === 'trial';

      setLoginEmail('');
      setLoginPass('');
      setLoginName('');
      setConfirmPass('');
      setUserInputCode('');
      setVerificationStep(false);
      setIsRegisterMode(false);
      setShowLoginWall(false);

      if (hasActivePlan) {
        setActiveTab('home');
      } else {
        setActiveTab('plans');
      }
    } else {
      setVerificationError('වැරදි සංඥා කේතයකි! කරුණාකර නැවත උත්සාහ කරන්න. (Incorrect code!)');
    }
  };

  const handleGoogleDirectLogin = async () => {
    const googleEmail = 'spt.googleuser@gmail.com';
    setCustomerSession({
      name: 'Google User',
      email: googleEmail
    });

    setSptUsersList(prev => {
      const exists = prev.some(u => u.email.toLowerCase() === googleEmail);
      if (exists) return prev;
      return [{
        id: `user_${Date.now()}`,
        name: 'Google User',
        email: googleEmail,
        registeredAt: new Date().toISOString(),
        subscriptionStatus: 'trial',
        subscriptionExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      }, ...prev];
    });

    setLoginEmail('');
    setLoginPass('');
    setLoginName('');
    setConfirmPass('');
    setVerificationStep(false);
    setIsRegisterMode(false);
    setShowLoginWall(false);

    const existingUser = sptUsersList.find(u => u.email.toLowerCase() === googleEmail.toLowerCase());
    let resolvedStatus = 'trial'; // default
    if (existingUser) {
      if (existingUser.subscriptionStatus === 'active') {
        if (existingUser.subscriptionExpiresAt) {
          const diff = new Date(existingUser.subscriptionExpiresAt).getTime() - Date.now();
          resolvedStatus = diff <= 0 ? 'expired' : 'active';
        } else {
          resolvedStatus = 'active';
        }
      } else if (existingUser.subscriptionStatus === 'pending') {
        resolvedStatus = 'pending';
      } else if (existingUser.subscriptionStatus === 'trial') {
        if (existingUser.subscriptionExpiresAt) {
          const diff = new Date(existingUser.subscriptionExpiresAt).getTime() - Date.now();
          resolvedStatus = diff <= 0 ? 'expired' : 'trial';
        } else {
          resolvedStatus = 'trial';
        }
      } else {
        resolvedStatus = existingUser.subscriptionStatus || 'trial';
      }
    }

    const hasActivePlan = resolvedStatus === 'active' || resolvedStatus === 'trial';

    if (hasActivePlan) {
      setActiveTab('tools');
    } else {
      if (pendingPlanCheckoutAfterLogin) {
        setSelectedPlanForPayment(pendingPlanCheckoutAfterLogin as any);
        const username = 'Google User';
        const cleanName = username.toUpperCase().split(' ')[0].replace(/[^A-Z]/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        setGeneratedRefCode(`SPT-${cleanName}-${randomSuffix}`);
        setShowPaymentCheckout(true);
        setPendingPlanCheckoutAfterLogin(null);
      }
      setActiveTab('plans');
    }
    // Sync guest profile to Supabase
    try {
      await fetch('/api/admin/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleEmail,
          name: 'Google User',
          role: 'user',
          subscription_status: 'trial',
          subscription_expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        }),
      });
    } catch (err) {
      console.error("Profile sync error (server):", err);
    }
    alert('Google සෘජු පිවිසුම සාර්ථකයි! (Google login successful)');
  };


  const handleNewReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName || !revComment) return;

    const localId = `r_${Date.now()}`;
    const item: ReviewItem = {
      id: localId,
      name: revName,
      role: revRole || 'SPT Supporter',
      comment: revComment,
      rating: revRating,
      avatarSeed: revName.toLowerCase().replace(/\s+/g, ''),
      imageUrl: revImageUrl ? revImageUrl.trim() : undefined,
      pinned: false
    };

    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      try {
        const { data, error } = await supabase.from('reviews').insert([{
          name: revName,
          name_en: revName,
          role: revRole || 'SPT Supporter',
          role_en: revRole || 'SPT Supporter',
          comment: revComment,
          comment_en: revComment,
          rating: revRating,
          avatar_seed: revName.toLowerCase().replace(/\s+/g, ''),
          image_url: revImageUrl ? revImageUrl.trim() : undefined,
          pinned: false
        }]).select('*').single();

        if (!error && data) {
          const dbItem: ReviewItem = {
            id: data.id,
            name: data.name,
            nameEn: data.name_en,
            role: data.role,
            roleEn: data.role_en,
            comment: data.comment,
            commentEn: data.comment_en,
            rating: data.rating,
            avatarSeed: data.avatar_seed,
            imageUrl: data.image_url,
            pinned: data.pinned,
            hidden: data.hidden
          };
          setReviewsList(prev => [dbItem, ...prev.filter(r => r.id !== localId)]);
        } else {
          setReviewsList(prev => [item, ...prev]);
        }
      } catch (err) {
        console.error("Failed to insert review into Supabase:", err);
        setReviewsList(prev => [item, ...prev]);
      }
    } else {
      setReviewsList(prev => [item, ...prev]);
    }

    setRevName('');
    setRevRole('');
    setRevComment('');
    setRevRating(5);
    setRevImageUrl('');
    alert('කරුණාකර රැඳී සිටින්න: ඔබගේ වටිනා අදහස සාර්ථකව පද්ධතියට එක් කරන ලදී! ස්තූතියි.');
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden font-sans transition-colors duration-1000 select-none flex flex-col justify-between"
      style={{
        backgroundImage: `url(${config.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        '--glass-opacity': config.glassOpacity,
        '--glass-blur': `${config.glassBlur}px`
      } as React.CSSProperties}
    >
      {/* Absolute floating glowing overlay dots to represent requested colors blending beautifully */}
      <div className="absolute top-10 left-12 w-[350px] h-[350px] rounded-full bg-neon-blue/20 blur-[130px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[400px] h-[400px] rounded-full bg-neon-purple/20 blur-[140px] animate-pulse pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-neon-green/15 blur-[120px] pointer-events-none" />

      {/* Global Theme Overlay */}
      <div className="absolute inset-0 bg-slate-950/65 pointer-events-none z-0" />

      {/* Frosted Glass Cosmic Background Backdrop layer */}
      <div className="cosmic-bg" />

      {/* Background Universe Animation (Technology & Art merging galaxy) */}
      {config.showUniverseAnimation !== false && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          {config.universeGifUrl ? (
            <img 
              src={config.universeGifUrl} 
              alt="Universe Animation" 
              className="w-full h-full object-cover opacity-50 mix-blend-screen"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 animate-pulse duration-[8000ms] opacity-50">
              {/* Complex technological galaxy effect: rotating grid circles, pulse points */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-purple-500/5" />
              
              {/* Tech circles representing technology and art cosmos merging */}
              <div className="absolute top-[25%] left-[15%] w-[450px] h-[450px] rounded-full border border-dashed border-cyan-400/20 animate-spin" style={{ animationDuration: '60s' }} />
              <div className="absolute top-[20%] left-[20%] w-[380px] h-[380px] rounded-full border border-purple-500/10 animate-spin" style={{ animationDuration: '40s', animationDirection: 'reverse' }} />
              
              {/* Constant blinking laser stars representing scientific execution */}
              <div className="absolute top-[40%] left-[10%] w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute top-[65%] left-[80%] w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_#bd00ff] animate-ping" style={{ animationDuration: '5s' }} />
              <div className="absolute top-[15%] left-[75%] w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#eab308] animate-ping" style={{ animationDuration: '4s' }} />
              <div className="absolute top-[80%] left-[25%] w-1 h-1 rounded-full bg-cyan-300 animate-pulse" />
              
              {/* Dynamic slow moving grid lines */}
              <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
                <radialGradient id="meshGrad" cx="50%" cy="50%" r="40%">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#bd00ff" stopOpacity="0" />
                </radialGradient>
                <circle cx="50%" cy="50%" r="35%" fill="none" stroke="url(#meshGrad)" strokeWidth="1" strokeDasharray="5,15" className="animate-spin" style={{ animationDuration: '100s' }} />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* 1. Header/Navigation Brand bar */}
      <header className="relative z-10 p-4 max-w-6xl mx-auto w-full transition-all space-y-3">
        <nav className="glass-panel rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Segment */}
          <button 
            type="button" 
            onClick={() => setActiveTab('home')} 
            className="flex items-center gap-3.5 group relative cursor-pointer text-left"
          >
            <div className="relative w-20 h-20 min-w-[5rem] min-h-[5rem] max-w-[5rem] max-h-[5rem] shrink-0 rounded-full bg-transparent border-2 border-amber-400/50 flex flex-col items-center justify-center shadow-lg transform group-hover:scale-105 group-hover:border-amber-400 transition duration-300 overflow-hidden shadow-amber-500/20">
              {config.logoUrl ? (
                <img 
                  src={config.logoUrl} 
                  alt="Site Logo" 
                  className="w-full h-full object-cover rounded-full" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <>
                  {/* Gold Shimmer effect */}
                  <div className="absolute inset-x-0 h-1/2 top-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className="text-sm font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-yellow-500 font-display">SPT</span>
                    <span className="text-[8px] text-amber-400 font-extrabold uppercase tracking-widest leading-none mt-1">OFFICIAL</span>
                  </div>
                  <Sparkle className="w-3.5 h-3.5 text-amber-300 absolute top-1 right-1 animate-pulse" />
                </>
              )}
              <div className="absolute -bottom-1 inset-x-4 h-[2px] bg-[#00f0ff] blur-[2px]" />
            </div>
            <div>
              <div className="font-display font-black text-xl tracking-wider text-white leading-none">
                {config.siteTitle}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-mono tracking-widest text-[#00f0ff] uppercase font-semibold">{config.siteSubtitle}</span>
                <span className="text-[8px] font-bold bg-amber-400/25 text-yellow-300 px-1.5 py-0.5 rounded uppercase font-mono tracking-widest animate-pulse border border-amber-500/20">universe</span>
              </div>
            </div>
          </button>

          {/* Navigation Links layout */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-3">
            {[
              { id: 'home', label: t('මුල් පිටුව', 'Home'), icon: Compass },
              { id: 'services', label: t('සේවාවන්', 'Services'), icon: Layers },
              { id: 'offers', label: t('දීමනා', 'Offers'), icon: Sparkles },
              { id: 'tools', label: t('SPT මෙවලම්', 'SPT Tools'), icon: Smartphone },
              { id: 'blogs', label: t('බ්ලොග්', 'Blogs'), icon: BookOpen },
              { id: 'reviews', label: t('ප්‍රතිචාර', 'Reviews'), icon: Star },
              { id: 'about', label: t('අපි ගැන', 'About Us'), icon: Info },
              { id: 'contacts', label: t('සම්බන්ධතා', 'Contacts'), icon: Send },
              ...(customerSession?.email === 'sadeeppasindu0218@gmail.com'
                ? [{ id: 'admin', label: t('පරිපාලනය', 'Admin'), icon: LayoutDashboard }]
                : [])
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'admin' && !isAdminPinVerified) {
                      setShowAdminPinPrompt(true);
                      setAdminPinInput('');
                      setAdminPinError('');
                      return;
                    }
                    setActiveTab(tab.id as any);
                    setActiveToolId(null); // Reset active tool viewport on tab switch
                    if (tab.id === 'tools' && !customerSession) {
                      setShowLoginWall(true);
                    }
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all duration-300 flex items-center gap-1.5 cursor-pointer relative ${
                    isSelected 
                      ? tab.id === 'home' ? 'glass-btn-3d glass-btn-3d-active text-white font-bold'
                        : tab.id === 'services' ? 'glass-btn-3d glass-btn-3d-amber text-yellow-300 font-bold'
                        : tab.id === 'offers' ? 'glass-btn-3d glass-btn-3d-amber text-[#00f0ff] font-bold border-[#00f0ff]/30 shadow-[0_0_15px_rgba(0,240,255,0.15)] bg-cyan-500/5'
                        : tab.id === 'tools' ? 'glass-btn-3d glass-btn-3d-green text-green-300 font-bold'
                        : tab.id === 'blogs' ? 'glass-btn-3d glass-btn-3d-amber text-yellow-300 font-bold'
                        : tab.id === 'reviews' ? 'glass-btn-3d glass-btn-3d-amber text-yellow-300 font-bold'
                        : tab.id === 'about' ? 'glass-btn-3d glass-btn-3d-purple text-purple-300 font-bold'
                        : tab.id === 'contacts' ? 'glass-btn-3d glass-btn-3d-active text-cyan-300 font-bold border-[#00f0ff]/20 bg-slate-900 shadow-md'
                        : tab.id === 'admin' ? 'glass-btn-3d glass-btn-3d-purple text-purple-300 font-bold'
                        : 'glass-btn-3d glass-btn-3d-active text-white'
                      : 'glass-btn-3d text-slate-400 hover:text-white'
                  }`}

                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? getAccentColorText() : 'text-slate-400'}`} />
                  {tab.label}
                  {isSelected && (
                    <motion.div 
                      layoutId="activeTabIndicator"
                      className={`absolute bottom-0 inset-x-4 h-[1.5px] rounded ${getAccentColorBg()}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Client Account Area */}
          <div className="flex items-center gap-3">
            {/* Bilingual Language Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <button
                type="button"
                onClick={() => setLanguage('si')}
                className={`px-2 py-1 rounded-lg transition-all text-[10px] font-bold cursor-pointer ${
                  language === 'si'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 shadow-sm'
                    : 'text-slate-450 hover:text-white border border-transparent'
                }`}
                title="සිංහල භාෂාව තෝරන්න"
              >
                සිංහල
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-lg transition-all text-[10px] font-bold cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 shadow-sm'
                    : 'text-slate-450 hover:text-white border border-transparent'
                }`}
                title="Select English language"
              >
                EN
              </button>
            </div>

            {customerSession ? (
              <div className="flex items-center gap-2.5 p-1 rounded-xl bg-white/5 border border-white/5 pl-3">
                {(() => {
                  const currentUserConfig = sptUsersList.find(u => u.email.toLowerCase() === customerSession.email.toLowerCase());
                  const userAvatar = currentUserConfig?.profilePictureUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(customerSession.email)}`;
                  return (
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="relative shrink-0 cursor-pointer group"
                      title={t('පැතිකඩ සංස්කාරකය (Open Profile Settings)', 'Open Profile Settings')}
                    >
                      <img
                        src={userAvatar}
                        alt="User Profile"
                        className="w-8 h-8 rounded-full border-2 border-[#00f0ff] object-cover shadow-[0_0_8px_rgba(0,240,255,0.35)] group-hover:scale-105 group-hover:border-yellow-400 transition"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  );
                })()}

                <button
                  onClick={() => setShowProfileModal(true)}
                  className="text-xs font-mono font-medium text-slate-300 hidden md:inline text-left cursor-pointer hover:text-white hover:underline transition-colors"
                  title={t('පැතිකඩ සංස්කාරකය (Open Profile Settings)', 'Open Profile Settings')}
                >
                  {t('ආයුබෝවන්', 'Hi')}, {customerSession.name}
                </button>

                <button
                  onClick={async () => {
                    try { await supabase.auth.signOut(); } catch (_) {}
                    setCustomerSession(null);
                    setIsAdminUnlocked(false);
                    setIsAdminPinVerified(false);
                    setActiveToolId(null);
                  }}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer transition"
                  title="Logout session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginWall(true)}
                className="glass-btn-3d px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest font-bold text-white hover:text-cyan-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> {t('පිවිසෙන්න', 'Unlock portal')}
              </button>
            )}
          </div>
        </nav>

        {/* Activate Plan Banner - shows when user logged in but plan expired */}
        {showActivatePlanBanner && (
          <div className="flex items-center justify-center px-4 py-3 bg-rose-500/15 border border-rose-500/30 mx-4 -mt-2 rounded-xl animate-slideIn">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/20">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-300">{t('ඔබගේ පැකේජය කාලාවාව අවසන් වී ඇත', 'Your plan has expired')}</p>
                <p className="text-xs text-slate-400">{t('ප්‍රවේශය ලබා ගන්න නව පැකේජයක් සක්‍රීය කරන්න', 'Activate a new plan to regain access')}</p>
              </div>
              <button
                onClick={() => { setActiveTab('plans'); setShowActivatePlanBanner(false); }}
                className="ml-4 px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-rose-400 transition-all flex items-center gap-1"
              >
                {t('පැකේජය සක්‍රීය කරන්න', 'Activate Plan')} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowActivatePlanBanner(false)}
                className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats bar: persistent marketing counters + real-time online */}
        <div className="flex flex-wrap items-center justify-center gap-2 px-2">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <User className="w-3 h-3 text-cyan-400" />
              <span>{t('ලියාපදිංචි', 'Registered')}:</span>
              <span className="text-cyan-300 font-bold">{displayRegisteredCount}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>{t('සාමාජික', 'Subscribed')}:</span>
              <span className="text-emerald-300 font-bold">{displaySubscribedCount}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Activity className="w-3 h-3 text-amber-400" />
              <span>{t('මාර්ගගත', 'Online')}:</span>
              <span className="text-amber-300 font-bold">{14 - 1 + liveOnlineCount}</span>
            </div>
          </div>
          {countdownDisplay && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold shadow-[0_0_12px_rgba(0,240,255,0.1)] select-none shrink-0 ${
              countdownDisplay === 'Expired'
                ? 'bg-rose-950/40 border border-rose-800/40 text-rose-300'
                : 'bg-cyan-950/40 border border-cyan-800/40 text-cyan-300'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  countdownDisplay === 'Expired' ? 'bg-rose-400' : 'bg-[#00f0ff]'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  countdownDisplay === 'Expired' ? 'bg-rose-400' : 'bg-[#00f0ff]'
                }`}></span>
              </span>
              <span className="font-bold">{countdownDisplay}</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Page Content Orchestration with framer-motion transitions */}
      <main className="relative z-10 flex-grow p-4 max-w-6xl mx-auto w-full flex items-center">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full text-center space-y-8 py-8"
            >
              <div className="space-y-4 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-300 text-[11px] font-mono uppercase tracking-widest mb-2 animate-bounce">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" /> the ultimate multi-media saas
                </div>

                {/* Primary Gold Title */}
                <h1 className="text-6xl md:text-9xl font-serif font-extrabold tracking-tighter leading-[0.9] relative mb-4 py-4 select-none">
                  <span className="text-3d-gold inline-block hover:scale-105 hover:rotate-1 transition-transform duration-300 cursor-pointer">
                    {config.siteTitle}
                  </span>
                </h1>

                {/* Subtitle */}
                <h2 className="text-lg md:text-2xl font-display uppercase tracking-[0.4em] font-bold text-slate-300 mb-6 py-2 select-none">
                  <span className="text-3d-universe inline-block hover:scale-110 hover:-rotate-1 transition-transform duration-300 cursor-pointer text-yellow-100 italic">
                    {config.siteMiddleTagline}
                  </span>
                </h2>

                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent mx-auto my-6" />

                {/* Beautiful custom motto Sinhala styled */}
                <p className="text-lg md:text-2xl font-light italic bg-gradient-to-r from-[#00f0ff] to-fuchsia-300 bg-clip-text text-transparent leading-relaxed px-4 font-mono font-bold">
                  &ldquo;{config.siteCreatorSlogan}&rdquo;
                </p>

                <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  සෑම සීමාවකින්ම ඔබ්බට ගිය, අති නවීන AI තාක්ෂණය, දිව්‍යමය සංගීත නිර්මාණ, සහ උසස්තම වෙළඳ නාමකරණ විසඳුම් එකම වහලක් යටින් ලබා ගන්න. ඔබේ හුස්ම තරම්ම සමීප විශ්වසනීයත්වය.
                </p>
              </div>

              {/* Glowing Call to Actions */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className="glass-btn-3d glass-btn-3d-amber px-6 py-3.5 rounded-xl text-xs font-mono uppercase font-bold tracking-widest text-[#0a0a16] bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 hover:opacity-90 transform active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  Explore Services <ArrowRight className="w-4 h-4 text-slate-900" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tools');
                    if (!customerSession) setShowLoginWall(true);
                  }}
                  className="glass-btn-3d glass-btn-3d-green px-6 py-3.5 rounded-xl text-xs font-mono uppercase font-bold tracking-widest text-emerald-200 transition-all cursor-pointer flex items-center gap-2"
                >
                  Launch App drawer <Smartphone className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              {/* Achievements Showcase Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10">
                {homeStatsList.map((item) => (
                  <div key={item.id} className="p-5 rounded-2xl glass-panel text-center flex flex-col justify-between relative group hover:border-amber-400/30 transition duration-300">
                    <div>
                      {item.imageUrl && (
                        <div className="w-10 h-10 rounded-xl overflow-hidden mx-auto mb-3 border border-white/15 shadow-md flex-shrink-0">
                          <img src={item.imageUrl} alt={t(item.title, item.titleEn || item.title)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <span className="text-xs font-mono font-bold text-amber-200 block mb-1">{t(item.badge, item.badgeEn || item.badge)}</span>
                      <p className="text-xl font-display font-medium text-white tracking-tight leading-tight">{t(item.title, item.titleEn || item.title)}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-2 block">{t(item.description, item.descriptionEn || item.description)}</span>
                  </div>
                ))}
              </div>

              {/* Add SPT Shortcut Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mx-auto max-w-lg rounded-2xl bg-white/5 border border-cyan-400/25 relative overflow-hidden text-left shadow-lg shadow-cyan-500/5 mt-8 group hover:border-cyan-400/50 transition">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-400/5 blur-xl rounded-full" />
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-transparent border border-amber-400 flex flex-col items-center justify-center text-[10px] font-black leading-none text-amber-300 shadow-md overflow-hidden flex-shrink-0">
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <>
                        <span>SPT</span>
                        <span className="text-[5px] text-amber-400 font-bold mt-0.5 tracking-wider">OFFICIAL</span>
                      </>
                    )}
                  </div>
                  <div>
                    <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 leading-none">{t('මුල් තිරයට එක් කරන්න', 'Add to Home Screen')}</span>
                    <span className="block text-[9px] text-slate-300 leading-tight mt-1">{t('පද්ධතිය උපාංගයේ Shortcut එකක් ලෙස එක් කරන්න. (iOS/Android/PC)', 'Add this system as a shortcut on your device. (iOS/Android/PC)')}</span>
                  </div>
                </div>
                <button
                  onClick={handleInstallShortcut}
                  className="relative z-10 px-3.5 py-2 rounded-xl bg-[#00f0ff]/10 hover:bg-[#00f0ff]/30 text-cyan-200 text-xs font-mono font-bold uppercase transition flex items-center gap-1 cursor-pointer border border-[#00f0ff]/20 hover:border-[#00f0ff]/50"
                >
                  Add Shortcut 📲
                </button>
              </div>
            </motion.div>
          )}

          {/* 3. Services / Portfolio Screen */}
          {activeTab === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full space-y-10 py-6"
            >
              {/* Heading */}
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-yellow-300">{t('අපගේ සේවා නාමාවලිය', 'Our digital catalog')}</span>
                <h2 className="text-3xl md:text-4xl font-display font-medium text-white tracking-tight">{t('සේවා සහ නිර්මාණ Portfolio', 'Services & Design Portfolio')}</h2>
                <div className="h-[1.5px] w-12 bg-neon-blue mx-auto mt-2" />
              </div>

              {/* Filter badging row */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { id: 'all', label: t('සියලුම සේවාවන්', 'All Categories') },
                  { id: 'web_dev', label: 'Web Design & Dev 💻' },
                  { id: 'ai_design', label: 'AI & Digital Design 🌌' },
                  { id: 'music_writing', label: 'Music & Song Writing 🎵' },
                  { id: 'video_content', label: 'Video Production 🎥' },
                  { id: 'apparel_art', label: 'Apparel & Paintings 👕' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedServiceCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                      selectedServiceCategory === cat.id
                        ? 'glass-btn-3d glass-btn-3d-active text-white font-bold'
                        : 'glass-btn-3d text-slate-300 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid of Portfolio Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servicesList
                  .filter(item => selectedServiceCategory === 'all' || item.category === selectedServiceCategory)
                  .map(serv => (
                    <div 
                      key={serv.id} 
                      className={`p-6 rounded-2xl glass-panel relative overflow-hidden flex flex-col justify-between group transition duration-300 transform hover:-translate-y-1 ${
                        serv.highlight ? 'border border-[#00f0ff]/30 relativeScale' : 'border border-white/5'
                      }`}
                    >
                      {serv.highlight && (
                        <div className="absolute top-0 right-0 px-2.5 py-0.5 text-[9px] uppercase font-mono font-bold bg-[#00f0ff]/20 text-[#00f0ff] rounded-bl-lg z-10">
                          Highlight
                        </div>
                      )}

                      {serv.imageUrl && (
                        <div className="h-36 -mx-6 -mt-6 mb-4 overflow-hidden relative border-b border-white/10 group-hover:opacity-90 transition">
                          <img 
                            src={serv.imageUrl} 
                            alt={t(serv.title, serv.titleEn || serv.title)} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {!serv.imageUrl && (
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-amber-200">
                            {serv.category === 'web_dev' && <Code className="w-5 h-5" />}
                            {serv.category === 'ai_design' && <Sparkle className="w-5 h-5" />}
                            {serv.category === 'music_writing' && <Music className="w-5 h-5 text-purple-400" />}
                            {serv.category === 'video_content' && <Tv className="w-5 h-5 text-emerald-400" />}
                            {serv.category === 'apparel_art' && <Shirt className="w-5 h-5 text-amber-400" />}
                          </div>
                        )}
                        <h4 className="text-lg font-bold font-display text-white group-hover:text-amber-350 transition duration-200">{t(serv.title, serv.titleEn || serv.title)}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{t(serv.description, serv.descriptionEn || serv.description)}</p>
                      </div>

                      <div className="border-t border-white/5 pt-4 mt-5 flex justify-between items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          {serv.category.replace('_', ' ')}
                        </span>
                        
                        <div className="flex gap-1.5">
                          {((serv.showcaseFiles && serv.showcaseFiles.length > 0) || serv.youtubeUrl) && (
                            <button
                              onClick={() => setActiveServiceModal(serv)}
                              className="px-2 py-1 rounded bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 text-cyan-200 text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer border border-[#00f0ff]/30"
                            >
                              <Eye className="w-3.5 h-3.5" /> Showcase
                            </button>
                          )}
                          <button
                            onClick={() => alert(`Spt Portfolio: ${t(`කරුණාකර අපගේ පරිපාලක 'Sadeep' සමග සෘජුව සම්බන්ධ වී '${t(serv.title, serv.titleEn || serv.title)}' සේවාව ලබා ගන්න.`, `Please contact admin 'Sadeep' directly to acquire the '${t(serv.title, serv.titleEn || serv.title)}' service.`)}`)}
                            className="px-2 py-1 rounded bg-amber-450 text-[#0a0a16] text-[10px] font-mono font-bold transition flex items-center gap-0.5 cursor-pointer"
                          >
                            Book <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Subsidiary brand alliance segment */}
              <div className="pt-8 border-t border-white/5">
                <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#00f0ff] flex items-center justify-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> {t('අපගේ ප්‍රමුඛ අනුබද්ධිත සන්ධාන', 'our premium subsidiary alliances')}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-display font-medium text-white tracking-tight">{t('අනුබද්ධිත සන්නාම', 'Subsidiaries')}</h3>
                  <p className="text-xs text-slate-400">{t('අනුබද්ධිත සන්නාමයන්හි අතිවිශිෂ්ට නිෂ්පාදන ගුණාංග සජීවීව නරඹන්න.', 'Explore the outstanding product features of our affiliated brands live.')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {brandsList.map(brand => (
                    <div key={brand.id} className="rounded-2xl overflow-hidden glass-panel relative group">
                      <div className="h-44 relative">
                        <img 
                          src={brand.visualUrl} 
                          alt={t(brand.name, brand.nameEn || brand.name)} 
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-950/60" />
                        <div className="absolute bottom-4 left-4">
                          <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">{t(brand.subtitle, brand.subtitleEn || brand.subtitle)}</span>
                          <h4 className="text-lg font-bold font-display text-white mt-0.5">{t(brand.name, brand.nameEn || brand.name)}</h4>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <p className="text-xs text-slate-300 leading-relaxed">{t(brand.description, brand.descriptionEn || brand.description)}</p>
                        <button
                          type="button"
                          onClick={() => setActiveBrandModal(brand)}
                          className={`w-full py-2.5 text-center text-xs font-mono uppercase tracking-wider bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5`}
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" /> View Collections
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Special Offers Section */}
          {activeTab === 'offers' && (
            <motion.div
              key="offers"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full space-y-10 py-6 text-center"
            >
              <div className="max-w-xl mx-auto space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#00f0ff] flex items-center justify-center gap-1 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" /> {t('විශේෂ ප්‍රවර්ධන', 'SPECIAL PROMOTIONS')}
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-medium text-white tracking-tight">{t('විශේෂ දීමනා සහ ප්‍රවර්ධන', 'Special Offers & Promos')}</h2>
                <div className="h-[1.5px] w-12 bg-neon-blue mx-auto mt-2" />
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-2 font-sans">
                  {t('Sadeep Pasindu සමඟ එක්වී සීමිත කාලයක් සදහා වලංගු මෙම විශේෂිත මිල අඩු කිරීම් සහ වරප්‍රසාද ලබා ගන්න.', 'Claim these active discounts and multimedia perks curated especially by Sadeep Pasindu for a limited duration.')}
                </p>
              </div>

              {offersList.length === 0 ? (
                <div className="p-12 rounded-3xl glass-panel max-w-lg mx-auto border border-dashed border-white/10 space-y-3">
                  <span className="text-3xl">🏜️</span>
                  <p className="text-slate-400 text-sm font-sans font-medium">දැනට කිසිදු විශේෂ දීමනාවක් නොමැත.</p>
                  <p className="text-slate-500 text-xs font-sans">No active offers declared at this moment. Stay tuned!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left px-2">
                  {offersList.map(offer => (
                    <div 
                      key={offer.id} 
                      className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-[#00f0ff]/30 transition-all duration-350 shadow-lg hover:shadow-[#00f0ff]/5"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-400/10 to-transparent blur-xl pointer-events-none" />
                      
                      <div className="space-y-3 relative z-10">
                        {offer.imageUrl && (
                          <div className="w-full h-40 rounded-2xl overflow-hidden border border-white/10 mb-3 relative shadow-md">
                            <img 
                              src={offer.imageUrl} 
                              alt={t(offer.title, offer.titleEn || offer.title)} 
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        )}
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            {offer.discountBadge && (
                              <span className="inline-block px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider bg-cyan-400/15 text-[#00f0ff] rounded-lg border border-cyan-400/20 mb-2 shadow-[0_0_10px_rgba(0,180,255,0.1)]">
                                {offer.discountBadge ? t(offer.discountBadge, offer.discountBadgeEn || offer.discountBadge) : null}
                              </span>
                            )}
                            <h3 className="text-lg font-bold text-white tracking-tight leading-snug font-sans group-hover:text-cyan-200 transition">
                              {t(offer.title, offer.titleEn || offer.title)}
                            </h3>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans font-light mt-2">
                          {t(offer.description, offer.descriptionEn || offer.description)}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/5 space-y-4 relative z-10 text-xs mt-auto">
                        {offer.validUntil && (
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>VALID UNTIL (කාලසීමාව):</span>
                            <span className="text-amber-300 font-bold uppercase">{offer.validUntil}</span>
                          </div>
                        )}

                        {offer.promoCode && (
                          <div className="p-2.5 rounded-2xl bg-black/50 border border-white/5 flex items-center justify-between gap-3 font-mono">
                            <div className="space-y-0.5 pl-1">
                              <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none">PROMO CODE</span>
                              <span className="text-xs font-bold text-slate-200">{offer.promoCode}</span>
                            </div>
                            <button
                              onClick={() => {
                                if (offer.promoCode) {
                                  navigator.clipboard.writeText(offer.promoCode);
                                  alert(`Promo Code '${offer.promoCode}' copied to clipboard! (පිටපත් කරගන්නා ලදි)`);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] text-[10px] font-bold uppercase tracking-wider border border-[#00f0ff]/15 transition active:scale-95 cursor-pointer flex items-center gap-1"
                              title="Copy promo code"
                            >
                              <Copy className="w-3 h-3" /> COPY Code
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Subscription Plans Screen */}
          {activeTab === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full space-y-10 py-6 text-center"
            >
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-cyan-700/20 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                  <Lock className="w-6 h-6 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-display font-medium text-white tracking-tight leading-snug">
                  {t('පැකේජයක් තෝරා SPT Tools සක්‍රීය කර ගන්න', 'Choose a package and activate SPT Tools')}
                </h2>
                <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed font-sans">
                  {t(
                    'ඔබගේ නොමිලේ ලැබුණු දින 7ක අත්හදා බැලීමේ කාලය (Free Trial) අවසන් වී ඇත. SPT මෙවලම් මධ්‍යස්ථානයේ සේවා දිගටම භාවිත කිරීමට පහත සදහන් විශේෂ 90% වට්ටම් සහිත පැකේජයක් සමගින් පිවිසෙන්න.',
                    'Your 7-day free trial has expired. To continue using the SPT Tools platform services, activate one of the special 90% discounted packages below.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-6xl mx-auto text-left px-2">
                  {subscriptionPlans
                    .filter((plan: any) => {
                      const isTrialOrFree = plan.isFree || plan.id === 'plan_6' || plan.priceUsd === 0;
                      if (isTrialOrFree && customerSession) {
                        const uStatus = getUserSubscriptionStatus(customerSession.email);
                        if (uStatus.status === 'expired') {
                          return false;
                        }
                        const userObj = sptUsersList.find(u => u.email.toLowerCase() === customerSession.email.toLowerCase());
                        if (userObj) {
                          if (userObj.subscriptionStatus === 'expired') {
                            return false;
                          }
                          if (userObj.subscriptionStatus === 'trial' && userObj.subscriptionExpiresAt) {
                            const expTime = new Date(userObj.subscriptionExpiresAt).getTime();
                            if (expTime <= Date.now()) {
                              return false;
                            }
                          }
                          // Hide free trial if user has active paid plan
                          const hasActivePaidPlan = userObj.subscriptionStatus === 'active' &&
                            userObj.subscriptionPlan &&
                            userObj.subscriptionPlan !== 'trial' &&
                            userObj.subscriptionExpiresAt &&
                            new Date(userObj.subscriptionExpiresAt).getTime() > Date.now();
                          if (hasActivePaidPlan) {
                            return false;
                          }
                        }
                      }
                      return true;
                    })
                  .map((plan: any) => (
                  <div key={plan.id} className="relative pt-6">
                    {(() => {
                      const cu = customerSession ? sptUsersList.find(u => u.email.toLowerCase() === customerSession.email.toLowerCase()) : null;
                      let isCurrentPlan = false;
                      if (cu && (cu.subscriptionStatus === 'trial' || cu.subscriptionStatus === 'active')) {
                        const hasRealPlan = cu.subscriptionPlan && cu.subscriptionPlan !== 'trial';
                        if (hasRealPlan) {
                          const planCodeMap: Record<string, string> = { weekly: 'plan_1', monthly: 'plan_2', '6months': 'plan_3', yearly: 'plan_4', lifetime: 'plan_5' };
                          isCurrentPlan = plan.id === planCodeMap[cu.subscriptionPlan!];
                        } else {
                          isCurrentPlan = plan.priceUsd === 0;
                        }
                      }
                      return isCurrentPlan ? (
                        <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 rounded-full text-[9px] font-bold tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)] z-30 whitespace-nowrap">
                          {t('ඔබේ වත්මන් පැකේජය', 'YOUR CURRENT PLAN')}
                        </div>
                      ) : null;
                    })()}
                    <div 
                      onClick={() => handleSelectPlanAction(plan)}
                      className={`glass-panel p-6 rounded-3xl flex flex-col items-center justify-between space-y-6 transition-all duration-500 text-center relative group hover:-translate-y-4 hover:scale-105 ${
                        selectedPlanIdInPlans === plan.id 
                          ? 'border-[#00f0ff] bg-cyan-950/25 shadow-[0_0_25px_rgba(0,240,255,0.25)]'
                          : 'border-white/10 hover:border-cyan-400/50 hover:shadow-[0_20px_50px_-10px_rgba(34,211,238,0.4)]'
                      } shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] cursor-pointer transform-gpu bg-gradient-to-b from-slate-800/80 to-[#0a0a16]`}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-transparent blur-2xl pointer-events-none group-hover:from-cyan-400/20 transition-all duration-500" />
                      
                      <div className="space-y-4 relative z-10 w-full text-center">
                        <div className="relative">
                          <h3 className="text-[12px] font-mono font-black uppercase text-cyan-400 tracking-widest drop-shadow-sm group-hover:text-cyan-300 transition-colors">
                            {plan.title.replace(' PACK', '')} {t('පැකේජය', 'PACK')}
                          </h3>
                          {plan.discountTag && (
                            <div className="absolute -top-3 -right-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse">
                              {plan.discountTag ? t(plan.discountTag, plan.discountTagEn || plan.discountTag) : null}
                            </div>
                          )}
                        </div>
                        <div className="relative inline-block w-full text-center py-4">
                          {plan.priceUsd > 0 && plan.originalPriceUsd && plan.originalPriceUsd > plan.priceUsd && (
                            <span className="absolute -top-2 md:-top-0 right-10 md:right-2 text-base text-rose-500 font-mono font-bold opacity-90 flex items-center justify-center">
                              <span className="relative inline-block">
                                <span className="absolute top-1/2 left-0 w-full h-[3px] bg-rose-500 transform -translate-y-1/2 -rotate-12 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                                ${plan.originalPriceUsd}
                              </span>
                            </span>
                          )}
                          <h4 className="text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tighter w-full relative z-10 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_5px_15px_rgba(255,255,255,0.4)] transition-all">
                            {plan.priceUsd === 0 ? t('FREE', 'FREE') : `$${plan.priceUsd}`}
                          </h4>
                          {hasCheckedLkr && plan.priceUsd > 0 && (
                            <div className="text-xs font-mono font-bold text-amber-300 mt-2.5 animate-pulse relative z-10">
                              ~ Rs. {(plan.priceUsd * liveLkrRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LKR
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-400/90 leading-relaxed font-sans mt-2 min-h-[40px] px-2 w-full flex items-center justify-center font-medium group-hover:text-slate-300 transition-colors">
                          {t(plan.durationLabel, plan.durationLabel)}
                        </p>
                      </div>

                      <div className="w-full mt-auto relative z-10">
                        <button
                          onClick={(e) => {
                             e.stopPropagation();
                             handleSelectPlanAction(plan);
                          }}
                          className={`w-full py-3.5 rounded-2xl text-[11px] font-mono font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${
                            selectedPlanIdInPlans === plan.id 
                              ? 'bg-[#00f0ff] text-slate-950 border-cyan-400 font-black shadow-[#00f0ff]/20'
                              : 'bg-white/5 border border-white/20 text-slate-200 group-hover:bg-cyan-500/20 group-hover:text-cyan-100 group-hover:border-cyan-400/50'
                          }`}
                        >
                           {selectedPlanIdInPlans === plan.id ? t('SELECTED PLAN', 'SELECTED PLAN') : t('SELECT PLAN', 'SELECT PLAN')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8">
                 <button
                    onClick={handleFetchLiveLkr}
                    className="inline-flex rounded-full bg-cyan-950/40 border border-cyan-800/50 py-3.5 px-8 cursor-pointer items-center justify-center gap-3 shadow-[0_0_25px_rgba(8,145,178,0.3)] hover:bg-cyan-900/60 hover:shadow-[0_0_35px_rgba(8,145,178,0.5)] hover:-translate-y-1 transition-all duration-300"
                    disabled={isFetchingLkr}
                 >
                    <RefreshCw className={`w-5 h-5 text-cyan-400 ${isFetchingLkr ? 'animate-spin' : 'animate-spin-slow'}`} />
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest pl-1">
                      {isFetchingLkr 
                        ? t('සජීවී මිල ගණන් පරීක්ෂා කරමින්...', 'Checking Live Rates...') 
                        : t('ශ්‍රී ලංකා රුපියල් (LKR) වලින් සජීවී මිල ගණන් පරීක්ෂා කරන්න', 'Check live prices in Sri Lankan Rupees (LKR)')
                      }
                    </span>
                 </button>
              </div>

              {hasCheckedLkr && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto glass rounded-3xl p-6 text-left border border-[#00f0ff]/30 mt-8 relative overflow-hidden shadow-2xl bg-gradient-to-br from-slate-950/90 to-slate-900/90"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-2xl rounded-full" />
                  
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
                      <RefreshCw className={`w-5 h-5 ${isFetchingLkr ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">Today's Live Exchange Portal</span>
                      <h3 className="text-lg font-bold text-white leading-tight uppercase font-display">LKR Conversion Dashboard</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-white/5">
                    {(() => {
                      const selectedPlan = subscriptionPlans.find((p: any) => p.id === selectedPlanIdInPlans) || subscriptionPlans[0];
                      if (!selectedPlan) return null;
                      
                      const computedLkrPrice = (selectedPlan.priceUsd * liveLkrRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const computedLkrOriginal = selectedPlan.originalPriceUsd ? (selectedPlan.originalPriceUsd * liveLkrRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
                      const computedSaved = selectedPlan.originalPriceUsd ? ((selectedPlan.originalPriceUsd - selectedPlan.priceUsd) * liveLkrRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

                      return (
                        <>
                          <div className="space-y-2 bg-black/40 p-4 rounded-2xl border border-white/5">
                            <span className="text-[9px] font-mono leading-none text-slate-500 uppercase tracking-widest block">Selected Plan</span>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-white uppercase font-display">{t(selectedPlan.title, selectedPlan.title)}</span>
                              <span className="text-xs bg-emerald-500/15 text-emerald-400 font-mono px-2 py-0.5 rounded font-black">{selectedPlan.discountTag || 'ACTIVE'}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-normal">{t(selectedPlan.durationLabel, selectedPlan.durationLabel)}</p>
                            <div className="pt-2 flex justify-between items-end border-t border-white/5">
                              <span className="text-[10px] font-mono text-slate-500">Plan Cost (USD):</span>
                              <span className="text-lg font-bold text-white font-mono">${selectedPlan.priceUsd} USD</span>
                            </div>
                          </div>

                          <div className="space-y-2 bg-cyan-950/20 p-4 rounded-2xl border border-cyan-500/10 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-mono leading-none text-[#00f0ff] uppercase tracking-widest block font-bold">LKR Live Price (ලංකා රුපියල් මිල)</span>
                              <div className="flex items-baseline gap-1 mt-1.5 font-sans">
                                <span className="text-[10px] text-cyan-400 font-mono font-bold">Rs.</span>
                                <span className="text-3xl font-extrabold font-display text-amber-300 tracking-tight">{computedLkrPrice}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-sans mt-1">
                                {isFetchingLkr ? (
                                  <span className="text-cyan-400 font-mono font-bold animate-pulse">Fetching live daily rate...</span>
                                ) : (
                                  <span>මුදල් ගෙවීමේදී මෙම LKR අගය අදාළ වේ. (Exchange rate: 1 USD = Rs. {liveLkrRate.toFixed(2)})</span>
                                )}
                              </p>

                            </div>
                            
                            {selectedPlan.priceUsd > 0 && selectedPlan.originalPriceUsd && (
                              <div className="pt-2 border-t border-white/5 text-[10px] font-mono space-y-1">
                                <div className="flex justify-between text-slate-500">
                                  <span>Original LKR:</span>
                                  <span className="line-through">Rs. {computedLkrOriginal}</span>
                                </div>
                                <div className="flex justify-between text-emerald-400 font-bold">
                                  <span>Total Saved:</span>
                                  <span>Rs. {computedSaved} (90% Slashed)</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-400 font-sans leading-relaxed">
                      💡 <b>How to pay?</b> Select this plan and go to the <b>SPT Tools</b> tab. When prompted, submit your receipt reference using one of our bank gateways.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const selectedPlan = subscriptionPlans.find((p: any) => p.id === selectedPlanIdInPlans) || subscriptionPlans[0];
                        if (selectedPlan) {
                          let key: 'weekly' | 'monthly' | '6months' | 'yearly' | 'lifetime' = 'weekly';
                          if (selectedPlan.title.toLowerCase().includes('weekly')) key = 'weekly';
                          else if (selectedPlan.title.toLowerCase().includes('monthly')) key = 'monthly';
                          else if (selectedPlan.title.toLowerCase().includes('6 mo') || selectedPlan.title.toLowerCase().includes('6months') || selectedPlan.title.toLowerCase().includes('6mo')) key = '6months';
                          else if (selectedPlan.title.toLowerCase().includes('yearly')) key = 'yearly';
                          else if (selectedPlan.title.toLowerCase().includes('lifetime')) key = 'lifetime';

                          setSelectedPlanForPayment(key);
                          
                          if (!customerSession) {
                            setPendingPlanCheckoutAfterLogin(key);
                            setShowLoginWall(true);
                            alert(t('ගෙවීම සිදු කිරීමට පෙර කරුණාකර පළමුව SPT ගිණුමට පිවිසෙන්න හෝ ලියාපදිංචි වන්න.', 'Please sign up or log in first to continue with your chosen package.'));
                            return;
                          }

                          const username = customerSession?.name || 'USER';
                          const cleanName = username.toUpperCase().split(' ')[0].replace(/[^A-Z]/g, '');
                          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                          setGeneratedRefCode(`SPT-${cleanName}-${randomSuffix}`);

                          setShowPaymentCheckout(true);
                        }
                      }}
                      className="whitespace-nowrap px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold font-mono text-[10px] uppercase tracking-widest shadow-lg shadow-yellow-500/10 cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5"
                    >
                      PROCEED TO PAYMENT <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* 4. SPT Tools Screen (Icon Drawer and Sandboxes) */}
          {activeTab === 'tools' && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full space-y-6 py-6"
            >
              {/* Guarded Gate if user not logged in */}
              {!customerSession ? (
                <div className="max-w-lg mx-auto p-12 rounded-3xl bg-[#03020b]/80 border-2 border-cyan-500/20 shadow-[0_0_50px_rgba(0,240,255,0.07)] text-center relative overflow-hidden my-12 backdrop-blur-xl">
                  {/* Space Ambient Background Accents */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-cyan-500/25 to-blue-600/5 blur-3xl rounded-full -translate-y-12 translate-x-12" />
                  <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-fuchsia-500/10 blur-3xl rounded-full" />
                  
                  {/* Custom animated security gateway frame */}
                  <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center font-sans">
                    <div className="absolute inset-0 rounded-full bg-cyan-400/10 border-2 border-[#00f0ff]/30 animate-pulse" />
                    <div className="absolute inset-2 rounded-full border border-dashed border-[#00f0ff]/40 animate-spin" style={{ animationDuration: '15s', transformOrigin: 'center' }} />
                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-b from-[#0e0c21] to-[#04030a] border border-[#00f0ff]/50 flex items-center justify-center shadow-lg shadow-cyan-500/25 z-10">
                      <Lock className="w-6 h-6 text-[#00f0ff]" />
                    </div>
                  </div>
                  
                  {/* Glowing custom label */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[10px] uppercase tracking-widest text-[#00f0ff] font-mono font-bold mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
                    {t('ප්‍රවේශය සීමා කර ඇත', 'Access Restricted')}
                  </div>

                  {/* Title and subtitle matches the beautiful request screenshot */}
                  <h3 className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white mb-3 tracking-wide">
                    {t('creator පද්ධතිය අගුළු හරින්න', 'Unlock Creator Platform')} <span className="text-[#00f0ff]">🔒</span>
                  </h3>
                  
                  <p className="text-sm text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed font-sans">
                    {t(
                      'ඔබගේ නිර්මාණාත්මක ලෝකයේ අසීමිත විශේෂාංග සහ සියලු සැඟවුණු මෙවලම් වෙත ප්‍රවේශ වන්න.',
                      'Access the unlimited features of your creative universe.'
                    )}
                  </p>

                  {/* Beautiful high quality call-to-action button */}
                  <div className="space-y-4 max-w-sm mx-auto">
                    <button
                      onClick={() => setShowLoginWall(true)}
                      className="w-full relative group overflow-hidden py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-[#120e36] text-white font-mono uppercase tracking-widest text-xs font-black transition-all duration-300 transform active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] border border-cyan-400"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#00f0ff] to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {t('ප්‍රවේශය තහවුරු කර ඉදිරියට යන්න', 'VERIFY ACCESS & CONTINUE')} <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>

                    <div className="relative flex items-center justify-center py-2">
                      <span className="absolute inset-x-0 h-[1px] bg-white/5" />
                      <span className="relative z-10 px-3 text-[10px] uppercase font-mono text-slate-500 bg-[#03020b]/90">{t('ක්‍ෂණික සක්‍රීය කිරීම', 'Instant Activation')}</span>
                    </div>

                    <p className="text-[10px] text-slate-500 text-center">
                      {t('මෙවලම් භාවිත කිරීමට ලියාපදිංචි වෙන්න හෝ පිවිසෙන්න.', 'Please sign up or log in to access tools.')}
                    </p>
                  </div>
                </div>
              ) : getUserSubscriptionStatus(customerSession?.email).status === 'pending' ? (
                /* Payment is pending admin confirmation */
                <div className="max-w-md mx-auto p-8 rounded-2xl glass-panel text-center relative overflow-hidden my-6 border border-yellow-500/20">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 blur-xl rounded-full" />
                  <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-400/20 flex items-center justify-center mx-auto mb-6 text-yellow-400">
                    <Clock className="w-6 h-6 animate-spin" />
                  </div>
                  
                  <h3 className="text-xl font-display font-medium text-white mb-2">{t('ගෙවීම් තහවුරු වෙමින් පවතී', 'Payment is being verified')}</h3>
                  <h4 className="text-xs text-amber-300 font-mono mb-4 uppercase tracking-wider">{t('පරිපාලක තහවුරු කිරීම අපේක්ෂිතයි', 'Pending Admin Verification')}</h4>
                  
                  <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                    {t(
                      'ඔබගේ ගෙවීම් රිසිට්පත සහ තොරතුරු පද්ධති පරිපාලක (Super Admin) වෙත සාර්ථකව යොමු කර ඇත. Sadeep Pasindu විසින් එය පරීක්ෂා කර තහවුරු කළ වහාම ඔබට SPT මෙවලම් සියල්ල ස්වයංක්‍රීයව ක්‍රියාත්මක වනු ඇත. සාමාන්‍යයෙන් මේ සදහා විනාඩි 10-30ත් අතර සුළු කාලයක් ගතවේ.',
                      'Your payment receipt and details have been forwarded to the Super Admin successfully. Once Sadeep Pasindu verifies it, your SPT tools will automatically be activated. This usually takes 10-30 minutes.'
                    )}
                  </p>

                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-left text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Your Email:</span>
                      <span className="text-white">{customerSession?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reference Key:</span>
                      <span className="text-yellow-400 font-bold">
                        {sptUsersList.find(u => u.email.toLowerCase() === customerSession?.email?.toLowerCase())?.paymentReference || 'Generating...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Package Selected:</span>
                      <span className="text-cyan-400 uppercase font-bold">
                        {sptUsersList.find(u => u.email.toLowerCase() === customerSession?.email?.toLowerCase())?.subscriptionPlan || 'N/A'} Pack
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-6 italic">
                    විමසීම් සදහා අපගේ නිල සේවා අංකය හෝ Facebook පිටුව හරහා සම්බන්ධ විය හැක. ඔබට ස්තූතියි!
                  </p>
                </div>
              ) : getUserSubscriptionStatus(customerSession?.email).status === 'expired' ? (
                /* Trial/Sub has expired - show payment tiers & deposit form */
                <div className="max-w-4xl mx-auto space-y-8 py-4 px-2">
                  <div className="text-center space-y-2 max-w-xl mx-auto">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-2 text-cyan-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-display font-medium text-white">{t('පැකේජයක් තෝරා SPT Tools සක්‍රිය කර ගන්න', 'Choose a package and activate SPT Tools')}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {t(
                        'ඔබගේ නොමිලේ ලැබුණු දින 7ක අත්හදා බැලීමේ කාලය (Free Trial) අවසන් වී ඇත. SPT මෙවලම් මධ්‍යස්ථානයේ සේවා දිගටම භාවිත කිරීමට පහත සඳහන් විශේෂ 90% වට්ටම් සහිත පැකේජයක් සක්‍රීය කර ගන්න.',
                        'Your 7-day free trial has expired. To continue using the SPT Tools platform services, activate one of the special 90% discounted packages below.'
                      )}
                    </p>
                  </div>

                  {/* Pricing Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[
                      { key: 'weekly', title: 'Weekly Pack', usd: 1, originalUsd: 10, discountTag: '90% OFF', desc: 'සතියක් වලංගු සම්පූර්ණ ප්‍රවේශය' },
                      { key: 'monthly', title: 'Monthly Pack', usd: 3, originalUsd: 30, discountTag: '90% OFF', desc: 'මසක් වලංගු සම්පූර්ණ ප්‍රවේශය' },
                      { key: '6months', title: '6 Mo Pack', usd: 15, originalUsd: 150, discountTag: '90% OFF', desc: 'මාස 6ක කාලයක් සදහා වරප්‍රසාද' },
                      { key: 'yearly', title: 'Yearly Pack', usd: 20, originalUsd: 200, discountTag: '90% OFF', desc: 'මුළු වසරක් සදහා වලංගු SPT මෙවලම්' },
                      { key: 'lifetime', title: 'Lifetime Pack', usd: 100, originalUsd: 1000, discountTag: '90% OFF', desc: 'ජීවිත කාලයටම SPT සාමාජිකත්වය' }
                    ].map(pack => {
                      const computedLkr = (pack.usd * 303.45).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      return (
                        <div 
                          key={pack.key} 
                          className={`p-4 rounded-3xl glass-panel text-center flex flex-col justify-between border transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden group ${
                            selectedPlanForPayment === pack.key 
                              ? 'border-[#00f0ff] bg-cyan-500/10 shadow-[0_10px_20px_rgba(0,180,255,0.2)]' 
                              : 'border-white/10 hover:border-cyan-500/30'
                          }`}
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-400/10 to-transparent blur-xl pointer-events-none group-hover:from-cyan-400/20 transition-all duration-500" />
                          <div className="space-y-4 relative z-10 w-full pt-2">
                            <div className="relative">
                               <span className="block text-[11px] font-mono font-black text-cyan-400 uppercase tracking-widest">{pack.title}</span>
                               {pack.discountTag && (
                                 <div className="absolute -top-6 -right-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest animate-pulse">
                                   {pack.discountTag}
                                 </div>
                               )}
                            </div>
                            
                            <div className="space-y-1 relative inline-block w-full">
                              <span className="absolute -top-3 right-6 md:-top-4 md:right-0 text-sm text-slate-500 font-mono opacity-90 flex items-center justify-center">
                                <span className="relative inline-block">
                                  <span className="absolute top-1/2 left-0 w-full h-[3px] bg-rose-500 transform -translate-y-1/2 -rotate-12 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                                  ${pack.originalUsd}
                                </span>
                              </span>
                              <span className="block text-4xl lg:text-5xl font-extrabold font-display text-white relative z-10 drop-shadow-sm mt-4">${pack.usd}</span>
                            </div>
                            
                            {showLkrPrices && (
                              <div className="text-[10px] font-mono font-bold text-yellow-300 py-1 bg-yellow-500/10 rounded-lg border border-yellow-500/20 mt-2">
                                Rs. {computedLkr}
                              </div>
                            )}

                            <p className="text-[10px] text-slate-400 leading-normal min-h-[40px] pt-2 font-medium">
                              {t(pack.desc, pack.desc)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanForPayment(pack.key as any);
                              // Generate reference key code
                              const username = customerSession?.name || 'USER';
                              const cleanName = username.toUpperCase().split(' ')[0].replace(/[^A-Z]/g, '');
                              const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                              setGeneratedRefCode(`SPT-${cleanName}-${randomSuffix}`);
                            }}
                            className={`w-full py-1.5 mt-4 rounded-xl text-[10px] font-bold tracking-wider font-mono uppercase transition cursor-pointer ${
                              selectedPlanForPayment === pack.key 
                                ? 'bg-[#00f0ff] text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.3)]' 
                                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {selectedPlanForPayment === pack.key ? 'Selected' : 'Select Plan'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rupees equivalent quick check button */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowLkrPrices(!showLkrPrices)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs font-mono font-bold tracking-wider hover:bg-yellow-400/20 transition cursor-pointer"
                    >
                      <span>🔄 ශ්‍රී ලංකා රුපියල් (LKR) වලින් සජීවී මිල ගණන් පරීක්ෂා කරන්න (LKR converter)</span>
                    </button>
                  </div>

                  {/* Payment deposit / slip portal expanded */}
                  {selectedPlanForPayment && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-2xl glass-panel border border-[#00f0ff]/20 max-w-lg mx-auto text-left space-y-4"
                    >
                      <div className="border-b border-white/10 pb-3">
                        <span className="text-[10px] font-mono text-[#00f0ff] uppercase tracking-widest block">STEP 2: PAYMENT INSTRUCTIONS (ගෙවීම් ද්වාරය)</span>
                        <h4 className="text-lg font-bold text-white mt-1">ඔබ තෝරාගත් පැකේජය: <span className="text-yellow-300 uppercase underline font-display">{selectedPlanForPayment}</span></h4>
                      </div>

                      {/* Dynamic payment options guidelines */}
                      {(() => {
                        const activeGateways = paymentGatewaysList.filter(g => g.isActive);
                        const currentGateway = activeGateways.find(g => g.id === selectedGatewayId) || activeGateways[0];
                        return (
                          <>
                            {/* Gateway selection tabs */}
                            {activeGateways.length > 0 && (
                              <div className="space-y-1.5">
                                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">ගෙවීම් ක්‍රමය තෝරන්න (Select Payment gateway)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                                  {activeGateways.map(g => (
                                    <button
                                      key={g.id}
                                      type="button"
                                      onClick={() => setSelectedGatewayId(g.id)}
                                      className={`px-3 py-2 rounded-xl border text-[10px] font-mono uppercase tracking-tight transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                        (currentGateway?.id === g.id)
                                          ? 'bg-cyan-500/20 text-[#00f0ff] border-[#00f0ff]/50 shadow-[0_0_8px_rgba(0,240,255,0.15)] font-bold'
                                          : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'
                                      }`}
                                    >
                                      <span>💳</span> {t(g.name, g.nameEn || g.name)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Dynamic deposit / payment details guidelines */}
                            {currentGateway ? (
                              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2.5 text-xs font-sans text-slate-300 leading-relaxed">
                                <p className="font-bold text-white uppercase tracking-wider text-[10px] text-[#00f0ff] flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                  {t(`${currentGateway.name} ගෙවීම් උපදෙස්`, `${currentGateway.nameEn || currentGateway.name} Instructions`)}:
                                </p>
                                <div className="p-3.5 rounded-lg bg-black/60 border border-white/5 font-mono text-white whitespace-pre-wrap leading-relaxed text-[11px]">
                                  {t(currentGateway.details, currentGateway.detailsEn || currentGateway.details)}
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 text-center">
                                {t('පද්ධතියේ ගෙවීම් ද්වාර කිසිවක් සක්‍රීය කර නැත. කරුණාකර පරිපාලක අමතන්න.', 'No active payment gateways found. Please contact support.')}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* Unique Generated Reference */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                        <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider">CRITICAL: YOUR UNIQUE PAYMENT REFERENCE CODE (යොමු අංකය)</span>
                        <p className="text-slate-400 text-xs">ඔබගේ බැංකු තැන්පතු රිසිට්පතෙහි හෝ Online Deposit එකෙහි <b>Remark/Reference</b> සදහා පහත සඳහන් ඔබගේ පුද්ගලික කේතය අනිවාර්යයෙන්ම ඇතුලත් කරන්න:</p>
                        <div className="p-2 bg-black rounded border border-white/5 font-mono text-center text-sm tracking-wider font-extrabold text-[#00f0ff]">
                          {generatedRefCode}
                        </div>
                      </div>

                      {/* File Uploader for Slip Receipt */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">ගෙවීම් රිසිට්පතෙහ් පැහැදිලි ඡායාරූපයක් උඩුගත කරන්න (Upload Deposit Receipt image)</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Base64 or image url..."
                            value={uploadedReceiptB64}
                            onChange={e => setUploadedReceiptB64(e.target.value)}
                            className="flex-grow px-3 py-1.5 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                            required
                          />
                          <button
                            type="button"
                            className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-white"
                          >
                            <label className="cursor-pointer">
                              Upload Slip
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setUploadedReceiptB64(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                          </button>
                        </div>
                        {uploadedReceiptB64 && (
                          <div className="pt-2 animate-fadeIn">
                            <span className="block text-[9px] text-slate-400 font-mono mb-1">Receipt Preview (රිසිට්පත් පෙරදසුන):</span>
                            <img 
                              src={uploadedReceiptB64} 
                              alt="slip preview" 
                              className="max-h-52 max-w-full object-contain rounded-xl border border-white/10" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>

                      {/* Confirm button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!uploadedReceiptB64) {
                            alert('කරුණාකර පළමුව ඔබගේ තැන්පත් රිසිට්පතෙහි ඡායාරූපය උඩුගත කරන්න.');
                            return;
                          }
                          
                          setDisplaySubscribedCount(prev => prev + 1);
                          // update user
                          setSptUsersList(prev => {
                            const exists = prev.some(u => u.email.toLowerCase() === customerSession.email.toLowerCase());
                            if (exists) {
                              return prev.map(u => {
                                if (u.email.toLowerCase() === customerSession.email.toLowerCase()) {
                                  return {
                                    ...u,
                                    subscriptionStatus: 'pending',
                                    subscriptionPlan: selectedPlanForPayment,
                                    paymentReference: generatedRefCode,
                                    receiptUrl: uploadedReceiptB64,
                                    paymentSubmittedAt: new Date().toISOString()
                                  };
                                }
                                return u;
                              });
                            } else {
                              const newUserObj: SptUser = {
                                id: `usr_${Date.now()}`,
                                name: customerSession.name || 'User',
                                email: customerSession.email,
                                registeredAt: new Date().toISOString(),
                                subscriptionStatus: 'pending',
                                subscriptionPlan: selectedPlanForPayment,
                                paymentReference: generatedRefCode,
                                receiptUrl: uploadedReceiptB64,
                                paymentSubmittedAt: new Date().toISOString()
                              };
                              return [...prev, newUserObj];
                            }
                          });
                          syncProfileToSupabase(customerSession.email, {
                            subscription_status: 'pending',
                            subscription_plan: selectedPlanForPayment,
                            payment_reference: generatedRefCode,
                            receipt_url: uploadedReceiptB64,
                            payment_submitted_at: new Date().toISOString()
                          });

                          alert('ඔබගේ ගෙවීම් වාර්තාව සාර්ථකව Super Admin වෙත යොමු කරන ලදී!');
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:opacity-95 text-xs font-bold font-mono tracking-widest uppercase transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
                      >
                        <CheckCircle className="w-4 h-4" /> Confirm & Send Slip
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* Unlocked App Drawer View */
                <div className="space-y-6">
                  {/* Tool Active Detail Viewport */}
                  <AnimatePresence mode="wait">
                    {activeToolId && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-6 rounded-2xl glass-panel relative overflow-hidden"
                      >
                        <button
                          onClick={() => setActiveToolId(null)}
                          className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer transition"
                          title="Minimize tool view"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                          <div className="p-2.5 rounded-xl bg-cyan-400/10 text-cyan-400">
                            {activeToolId === 'tool_aio' ? <Link2 className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                          </div>
                          <div>
                            <span className="text-[9px] font-mono uppercase text-cyan-400 tracking-wider">Active Workspace View</span>
                            <h3 className="text-xl font-display font-bold text-white">
                              {activeToolId === 'tool_aio' ? 'AIO Link Hub (Profile Builder)' : 'Cosmic QR Generator'}
                            </h3>
                          </div>
                        </div>

                        {/* Sandbox viewport renderer */}
                        {activeToolId === 'tool_aio' && <AioLinkSandbox accentColorClass={getAccentColorText()} />}
                        {activeToolId === 'tool_qr' && <QrGeneratorSandbox accentColorClass={getAccentColorText()} />}

                        {/* Custom sub-service items */}
                        {!['tool_aio', 'tool_qr'].includes(activeToolId) && (
                          <div className="text-center py-10 space-y-4 max-w-md mx-auto">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto text-amber-300 animate-pulse">
                              <Code className="w-6 h-6" />
                            </div>
                            <h4 className="text-md font-bold text-white">Custom Tool Simulated Sandbox</h4>
                            <p className="text-xs text-slate-400">
                              This tool was custom created dynamically via Super Admin CMS panels! It runs on a cloud-authoritative worker simulation. Fully synchronized!
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Android Phone Mock App Drawer Grid */}
                  <div className="glass-panel p-6 rounded-2xl max-w-lg mx-auto">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-sm font-mono uppercase tracking-widest text-white font-bold">SPT Mini Drawer (Android Style)</h3>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase animate-pulse">unlocked drawer</span>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-3 gap-6">
                      {toolsList.map(tool => {
                        const isCurrentlyActive = activeToolId === tool.id;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => setActiveToolId(isCurrentlyActive ? null : tool.id)}
                            className="flex flex-col items-center text-center group cursor-pointer transition"
                          >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative shadow-lg transform group-hover:scale-105 active:scale-95 duration-200 overflow-hidden ${
                              isCurrentlyActive 
                                ? 'bg-[#00f0ff] text-slate-950 border-2 border-[#00f0ff]' 
                                : 'bg-slate-900 border border-white/10 text-cyan-400 group-hover:border-[#00f0ff]/40 group-hover:bg-slate-800'
                            }`}>
                              {tool.imageUrl ? (
                                <img src={tool.imageUrl} alt={t(tool.name, tool.nameEn || tool.name)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <>
                                  {tool.icon === 'Link2' && <Link2 className="w-6 h-6" />}
                                  {tool.icon === 'QrCode' && <QrCode className="w-6 h-6" />}
                                  {!['Link2', 'QrCode'].includes(tool.icon) && <Code className="w-6 h-6 text-amber-300" />}
                                </>
                              )}
                              
                              {/* Notification badge mockup */}
                              {tool.id === 'tool_aio' && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse border border-slate-950" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-slate-300 group-hover:text-white mt-2 max-w-[90px] truncate block leading-none">{t(tool.name, tool.nameEn || tool.name)}</span>
                            <span className="text-[9px] font-mono text-slate-500 uppercase mt-0.5 tracking-tight">{tool.category}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-slate-500 text-center font-mono mt-8 border-t border-white/5 pt-4 uppercase tracking-wider">
                      © SPT OFFICIAL 2026. CLICK ON ICONS TO LAUNCH CUSTOM WRAP
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 5. Reviews & About Pages */}
          {activeTab === 'reviews' && (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full space-y-12 py-6"
            >
              {/* About story component details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white/5 border border-white/5 p-8 rounded-3xl glass-panel relative overflow-hidden">
                <div className="absolute top-10 right-10 w-24 h-24 bg-[#00f0ff]/5 blur-xl pointer-events-none" />

                <div className="md:col-span-4 flex justify-center">
                  <div className="relative p-2 rounded-2xl border border-white/10 bg-slate-950/45 w-48 h-48 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-cyan-500/25 to-transparent z-10 pointer-events-none" />
                    {/* Glowing mock initials or high-contrast graphics avatar */}
                    <div className="w-32 h-32 rounded-full bg-[#1e1e40] border-2 border-yellow-300 flex items-center justify-center relative shadow-2xl overflow-hidden">
                      {config.reviewsStoryImageUrl ? (
                        <img 
                          src={config.reviewsStoryImageUrl} 
                          alt="Story graphic" 
                          className="w-full h-full object-cover rounded-full" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Sparkles className="w-14 h-14 text-yellow-300 animate-spin-slow" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-8 space-y-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#00f0ff]">brand genesis saga</span>
                  <h3 className="text-3xl font-display font-medium text-white tracking-tight">Sadeep Pasindu & SPT OFFICIAL</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t(config.brandGenesisStory || 'Sadeep Pasindu වන මා විසින් ආරම්භ කරන ලද "Sadeep Pasindu Creative Universe" (SPT OFFICIAL) යනු හුදෙක් සේවා සපයන ආයතනයක් පමණක් නොවේ. එය තාක්ෂණයේ සහ කලාවේ සංකලනයෙන් බිහිවූ සුවිශේෂී ඩිජිටල් තෝතැන්නකි. අප විසින් සපයනු ලබන සෑම සේවාවක් පිටුපසම ඇති විශිෂ්ටතම නිර්මාණශීලිත්වය සහ විශ්වසනීයත්වය ඔබගේ සන්නාමයේ වර්ධනයට මහෝපකාරී වනු නොඅනුමානය.', config.brandGenesisStoryEn || 'The "Sadeep Pasindu Creative Universe" (SPT OFFICIAL) founded by me is not just a service providing agency. It is a unique digital haven born from the fusion of technology and art. We guarantee that the supreme creativity and reliability behind every service we provide will be a great support for the growth of your brand.')}
                  </p>
                  
                  <div className="flex gap-4">
                    <div className="text-center p-2 rounded bg-white/5 w-24 border border-white/5">
                      <span className="block text-md font-bold text-white">2026</span>
                      <span className="text-[8px] font-mono text-slate-400 uppercase">founded</span>
                    </div>
                    <div className="text-center p-2 rounded bg-white/5 w-24 border border-white/5">
                      <span className="block text-md font-bold text-white">AI Built</span>
                      <span className="text-[8px] font-mono text-slate-400 uppercase">framework</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live user ratings & review slider section */}
              <div className="space-y-6">
                <div className="text-center max-w-md mx-auto space-y-1">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-yellow-400">{t(config.reviewsSubtitle || 'CLIENT VOICE FEEDS', config.reviewsSubtitleEn || 'CLIENT VOICE FEEDS')}</span>
                  <h3 className="text-2xl font-display font-medium text-white tracking-tight">{t(config.reviewsTitle || 'පාරිභෝගික අදහස් (User Testimony)', config.reviewsTitleEn || 'User Testimony')}</h3>
                  <div className="h-[1px] w-12 bg-yellow-300 mx-auto mt-2" />
                </div>

                {/* Testimony lists slider layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...reviewsList]
                    .filter(review => !review.hidden)
                    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
                    .map(review => (
                      <div key={review.id} className="p-6 rounded-2xl glass-panel relative flex flex-col justify-between border border-white/5">
                        
                        {/* Pinned Badge */}
                        {review.pinned && (
                          <div className="absolute top-3 right-3 px-2 py-0.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                            <Sparkle className="w-2.5 h-2.5" /> Featured
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex gap-1">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-light italic">
                            &ldquo;{t(review.comment, review.commentEn || review.comment)}&rdquo;
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 mt-5 border-t border-white/5 pt-3">
                          {review.imageUrl ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                              <img src={review.imageUrl} alt={t(review.name, review.nameEn || review.name)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-display font-bold text-xs uppercase text-slate-300 flex-shrink-0">
                              {review.name[0]}
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-bold text-white leading-none">{t(review.name, review.nameEn || review.name)}</h4>
                            <span className="text-[10px] font-mono text-slate-500">{t(review.role, review.roleEn || review.role)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Review Submittal Form */}
                <div className="max-w-xl mx-auto p-6 rounded-2xl bg-white/5 border border-white/5 glass-panel">
                  <h4 className="text-md font-bold text-white mb-2 flex items-center gap-1.5 justify-center">
                    <MessageSquare className="w-4 h-4 text-[#00f0ff]" /> {t(config.submitReviewTitle || 'ඔබගේ අදහස අප වෙත එවන්න (Submit Testimony)', config.submitReviewTitleEn || 'Submit Testimony')}
                  </h4>
                  <p className="text-[11px] text-slate-400 text-center mb-5">
                    {t(config.submitReviewDesc || 'SPT OFFICIAL සේවාවන් පිළිබඳ ඔබගේ වටිනා අදහස පළමු ප්‍රතිචාර ලැයිස්තුවට එක් කරන්න.', config.submitReviewDescEn || 'Add your valuable feedback regarding SPT OFFICIAL services to our response list.')}
                  </p>

                  <form onSubmit={handleNewReview} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder={t('ඔබේ නම (Name)', 'Your Name')}
                        value={revName}
                        onChange={e => setRevName(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none"
                        required
                      />
                      <input
                        type="text"
                        placeholder={t('තනතුර හෝ වෘත්තිය (Role/Designation)', 'Role/Designation')}
                        value={revRole}
                        onChange={e => setRevRole(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>

                    <textarea
                      placeholder={t('අදහස ඇතුළත් කරන්න (Write comments or user summary here...)', 'Submit your review logic...')}
                      value={revComment}
                      onChange={e => setRevComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                      required
                    />

                    <div>
                      <input
                        type="url"
                        placeholder={t('ප්‍රොෆයිල් පින්තූරයේ URL එක (Optional Profile Photo URL - e.g. https://...)', 'Profile Image URL (Optional)')}
                        value={revImageUrl}
                        onChange={e => setRevImageUrl(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{t('ගුණාත්මක අගය Rating:', 'Rating:')}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setRevRating(val)}
                              className="focus:outline-none cursor-pointer"
                            >
                              <Star className={`w-4 h-4 ${val <= revRating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="glass-btn-3d glass-btn-3d-amber px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-amber-200 cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" /> {t('Publish review', 'Publish review')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* Blogs Screen */}
          {activeTab === 'blogs' && (
            <motion.div
              key="blogs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full space-y-10 py-6 font-sans text-center"
            >
              <div className="max-w-xl mx-auto space-y-2 mb-4">
                <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 flex items-center justify-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Official Publications
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-medium text-white tracking-tight">{t('SPT නිල බ්ලොග් අඩවිය', 'SPT Official Blog')}</h2>
                <div className="h-[1.5px] w-12 bg-[#00f0ff] mx-auto mt-2" />
                <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-sm mx-auto pt-2">{t(config.blogSubtitle || 'SPT OFFICIAL වෙතින් පිරිනමන දිනපතා අලුත්ම තාක්ෂණික තොරතුරු, නිවේදන, සහ විශේෂ ලිපි පෙළ මෙතැනින් කියවන්න.', config.blogSubtitleEn || 'Read the latest technical information, announcements, and special articles offered daily by SPT OFFICIAL here.')}</p>
              </div>

              {/* Blogs Card Grid */}
              {blogsList.length === 0 ? (
                <div className="text-center py-16 rounded-3xl border border-white/5 bg-slate-950/40 max-w-md mx-auto">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <p className="text-slate-400 text-sm">තවමත් බ්ලොග් ලිපි කිසිවක් පළ කර නොමැත.</p>
                  <p className="text-xs text-slate-500 mt-1">කරුණාකර පසුව නැවත පරීක්ෂා කරන්න.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                  {blogsList.map(post => (
                    <motion.article
                      key={post.id}
                      whileHover={{ y: -4 }}
                      className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden flex flex-col justify-between hover:border-cyan-500/35 transition-all duration-300 shadow-xl"
                    >
                      <div>
                        {/* Media Display */}
                        {post.mediaUrl && (
                          <div className="relative aspect-video bg-black/40 overflow-hidden border-b border-white/5 flex items-center justify-center">
                            {post.mediaType === 'image' && (
                              <img 
                                src={post.mediaUrl} 
                                alt={t(post.title, post.titleEn || post.title)} 
                                className="w-full h-full object-cover select-none"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {post.mediaType === 'video' && (
                              <video 
                                src={post.mediaUrl} 
                                controls 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {post.mediaType === 'audio' && (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 to-slate-900">
                                <Music className="w-8 h-8 text-cyan-400 mb-2 animate-pulse" />
                                <audio src={post.mediaUrl} controls className="w-full max-w-[200px] h-8 text-xs scale-90" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[9px] font-mono text-cyan-400 uppercase border border-white/10">
                              {post.mediaType || 'Image'}
                            </div>
                          </div>
                        )}

                        {/* Text Contents */}
                        <div className="p-5 space-y-3">
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>By: {post.author || 'Admin'}</span>
                            <span>•</span>
                            <span>{new Date(post.createdAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>

                          <h3 className="text-base font-display font-medium text-white line-clamp-2 leading-snug hover:text-cyan-300 transition duration-150">
                            {t(post.title, post.titleEn || post.title)}
                          </h3>

                          <p className="text-xs text-slate-400 leading-relaxed font-sans line-clamp-3">
                            {t(post.content, post.contentEn || post.content)}
                          </p>
                        </div>
                      </div>

                      {/* Modal trigger button */}
                      <div className="p-5 pt-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBlogDetail(post);
                          }}
                          className="w-full py-2 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 hover:bg-cyan-400/20 font-bold font-mono text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          Read Full Article <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* About Us Screen */}
          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full space-y-10 py-6 font-sans text-center"
            >
              <div className="max-w-xl mx-auto space-y-2 mb-4">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#00f0ff] flex items-center justify-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Who We Are
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-medium text-white tracking-tight">{t('අපි ගැන', 'About SPT OFFICIAL')}</h2>
                <div className="h-[1.5px] w-12 bg-[#00f0ff] mx-auto mt-2" />
              </div>

              {/* Bento styled story grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto">
                
                {/* 1. Main visual block */}
                <div className="md:col-span-12 lg:col-span-7 glass rounded-3xl p-8 text-left space-y-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-2xl rounded-full" />
                  <div className="space-y-4">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#00f0ff]">The Genesis</span>
                    <h3 className="text-3xl font-serif font-black gold-text leading-tight">{config.siteTitle} Creative Universe</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans mt-4">
                      {t(config.aboutSinhalaStory, config.aboutEnglishStory)}
                    </p>
                  </div>
                  
                  {/* Subtle decorative items */}
                  <div className="flex gap-4 flex-wrap pb-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <CheckCircle className="w-4 h-4 text-[#00f0ff]" /> 100% Elite Integrity
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <CheckCircle className="w-4 h-4 text-emerald-400" /> Real-time Execution
                    </div>
                  </div>
                </div>

                {/* 2. Custom designer detail profile with 3D elements */}
                <div className="md:col-span-12 lg:col-span-5 glass rounded-3xl p-8 text-left space-y-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-2xl rounded-full" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-2">
                      {config.aboutOwnerPhotoUrl ? (
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-amber-300/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex-shrink-0">
                          <img 
                            src={config.aboutOwnerPhotoUrl} 
                            alt="Sadeep Pasindu" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-bold text-lg font-display flex-shrink-0 shadow-[0_0_15px_rgba(242,152,11,0.3)]">
                          SP
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#00f0ff] block leading-none mb-1">Chief Creator</span>
                        <h3 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight leading-none">Sadeep Pasindu</h3>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      Founder, developer, and chief media architect of {config.siteTitle}. Synthesizing solutions that bridge digital excellence and natural brand aesthetics.
                    </p>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                       <span className="block text-[9px] font-mono uppercase text-[#00f0ff] leading-none">Core Creative Slogan:</span>
                       <p className="text-[11px] font-mono italic text-amber-300 leading-tight">
                         &ldquo;{config.siteCreatorSlogan}&rdquo;
                       </p>
                    </div>
                  </div>

                  <button
                    onClick={() => alert("Sadeep: ස්තූතියි! ඔබට අප හා සම්බන්ධ වීමට ඕනෑම වේලාවක support@spt.com හෝ Telegram හරහා හැකිය.")}
                    className="glass-btn-3d glass-btn-3d-amber w-full py-3 rounded-xl text-xs font-mono font-bold tracking-widest text-amber-200 mt-2 cursor-pointer text-center"
                  >
                    Direct Message Sadeep
                  </button>
                </div>

              </div>

              {/* General Inquiry card */}
              <div className="max-w-2xl mx-auto glass rounded-3xl p-6 text-left border border-white/5 mt-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-2xl rounded-full" />
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="text-yellow-300 w-4 h-4 animate-pulse" /> Sadeep Creative Assistance
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  For tailored premium micro-systems, music compositions, or apparel art production inquiries, join our verification portal by clicking &ldquo;Unlock portal&rdquo; in the brand bar above to activate premium developer controls.
                </p>
              </div>

              {/* Decorative particle/hologram simulation */}
              <div className="max-w-xl mx-auto p-4 rounded-full border border-cyan-500/15 bg-cyan-500/5 inline-flex items-center gap-3 justify-center text-xs text-cyan-400 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span>SPT Universe status: Synchronized with Sadeep&apos;s master workspace</span>
              </div>
            </motion.div>
          )}

          {/* Contacts & Socials Screen */}
          {activeTab === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full space-y-10 py-6 font-sans text-center"
            >
              <div className="max-w-xl mx-auto space-y-2 mb-4">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#00f0ff] flex items-center justify-center gap-1">
                  <Send className="w-3.5 h-3.5" /> Reach Sadeep Pasindu Creative
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-medium text-white tracking-tight">{t('සම්බන්ධතා සහ සමාජ මාධ්‍ය', 'Contacts & Socials')}</h2>
                <div className="h-[1.5px] w-12 bg-[#00f0ff] mx-auto mt-2" />
                <p className="text-xs text-slate-400 mt-2">
                  Get in touch with SPT OFFICIAL for high-end digital services, commercial media production or support.
                </p>
              </div>

              {/* Grid of contact links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
                {contactsList.map((contact) => {
                  const handleCopy = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(contact.url);
                    alert(`ලින්ක් එක සාර්ථකව කොපි කරන ලදී! Copied link: ${contact.url}`);
                    trackTelemetryEvent('click', 'contacts', `Copy Link: ${t(contact.title, contact.titleEn || contact.title)}`);
                  };

                  const handleVisit = () => {
                    trackTelemetryEvent('contact', 'contacts', contact.title);
                    window.open(contact.url, '_blank', 'noopener,noreferrer');
                  };

                  return (
                    <div 
                      key={contact.id} 
                      className="glass rounded-3xl p-6 text-left relative overflow-hidden flex flex-col justify-between hover:border-[#00f0ff]/30 transition duration-300 group shadow-lg min-h-[220px]"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-2xl rounded-full" />
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          {contact.imageUrl ? (
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-slate-900">
                              <img 
                                src={contact.imageUrl} 
                                alt={t(contact.title, contact.titleEn || contact.title)} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                              <Send className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <span className="text-[9px] font-mono uppercase tracking-widest text-[#00f0ff] block mb-0.5">Verified Link</span>
                            <h4 className="text-sm font-bold text-white tracking-tight leading-snug uppercase">{t(contact.title, contact.titleEn || contact.title)}</h4>
                          </div>
                        </div>
                      </div>

                      {/* Button + Copy button side-by-side */}
                      <div className="mt-6 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleVisit}
                          className="flex-grow py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-200 text-[10px] font-mono font-bold tracking-widest uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Visit / Message
                        </button>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                          title="Copy Link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* General Inquiry card */}
              <div className="max-w-2xl mx-auto glass rounded-3xl p-6 text-left border border-white/5 mt-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-2xl rounded-full" />
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="text-yellow-300 w-4 h-4 animate-pulse" /> Sadeep Creative Assistance
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  For tailored premium micro-systems, music compositions, or apparel art production inquiries, join our verification portal by clicking &ldquo;Unlock portal&rdquo; in the brand bar above to activate premium developer controls.
                </p>
              </div>
            </motion.div>
          )}

          {/* 6. Super Admin Protected Dashboard Console */}
          {activeTab === 'admin' && (
            (customerSession?.email === 'sadeeppasindu0218@gmail.com') ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="w-full space-y-6 py-6 font-sans"
              >
                <div className="text-center max-w-xl mx-auto space-y-1 mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#00f0ff] flex items-center justify-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-[#00f0ff]" /> Sadeep Pasindu Elite Console
                  </span>
                  <h2 className="text-3xl font-display font-medium text-white tracking-tight">Super Admin Dashboard</h2>
                  <div className="h-[1.5px] w-12 bg-[#bd00ff] mx-auto mt-2" />
                </div>

                <AdminConsole
                  config={config}
                  setConfig={setConfig}
                  tools={toolsList}
                  onAddNewTool={handleAddNewTool}
                  onDeleteTool={handleDeleteTool}
                  onUpdateTools={handleUpdateTools}
                  services={servicesList}
                  onAddNewService={handleAddNewService}
                  onDeleteService={handleDeleteService}
                  onUpdateServices={handleUpdateServices}
                  brands={brandsList}
                  onAddNewBrand={handleAddNewBrand}
                  onDeleteBrand={handleDeleteBrand}
                  onUpdateBrands={handleUpdateBrands}
                  isUnlocked={isAdminUnlocked}
                  onSetUnlockStatus={setIsAdminUnlocked}
                  offersList={offersList}
                  setOffersList={handleSetOffersList}
                  homeStatsList={homeStatsList}
                  setHomeStatsList={handleSetHomeStatsList}
                  aboutCardsList={aboutCardsList}
                  setAboutCardsList={handleSetAboutCardsList}
                  reviewsList={reviewsList}
                  setReviewsList={handleSetReviewsList}
                  telemetryList={telemetryList}
                  onClearTelemetry={clearTelemetry}
                  onTrackTelemetryEvent={trackTelemetryEvent}
                  contactsList={contactsList}
                  setContactsList={handleSetContactsList}
                  blogsList={blogsList}
                  setBlogsList={handleSetBlogsList}
                  adminsList={adminsList}
                  setAdminsList={handleSetAdminsList}
                  sptUsersList={sptUsersList}
                  setSptUsersList={handleSetSptUsersList}
                  subscriptionPlans={subscriptionPlans}
                  setSubscriptionPlans={handleSetSubscriptionPlans}
                  paymentGateways={paymentGatewaysList}
                  setPaymentGateways={handleSetPaymentGatewaysList}
                  adminPin={adminPin}
                  setAdminPin={setAdminPin}
                  onIncorrectPinLogout={() => {
                    setCustomerSession(null);
                    setActiveToolId(null);
                    setIsAdminPinVerified(false);
                    setShowAdminPinPrompt(false);
                    setAdminPinInput('');
                    setActiveTab('home');
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="admin-denied"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full text-center py-16 space-y-6 max-w-md mx-auto glass rounded-3xl p-8 border border-rose-500/10 shadow-xl shadow-rose-500/5"
              >
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                  <Lock className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight font-display">ප්‍රවේශය අත්හිටුවා ඇත (Access Denied)</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  මෙම පරිපාලක පුවරුවට පිවිසීමට අවසර ඇත්තේ Sadeep Pasindu පරිපාලකවරයාට පමණි. කරුණාකර නිවැරදි පරිපාලක ගිණුමකින් ලොග් වන්න.
                </p>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full flex flex-col md:flex-row items-center justify-between border-t border-white/5 bg-transparent max-w-6xl mx-auto px-8 py-8 gap-4 text-center md:text-left text-xs text-slate-500 font-sans relative z-10">
        <div className="flex flex-col items-center md:items-start gap-1">
          <p className="text-[11px] font-mono tracking-widest text-[#8a99ad] font-bold">
            Â© 2026 SPT OFFICIAL. ALL RIGHTS RESERVED.
          </p>
          <p className="text-[9px] font-mono text-[#4e5e78] tracking-widest font-normal">
            engineered & synchronized for platform preview
          </p>
        </div>
        <div className="flex items-center gap-2.5 text-[10px] font-mono bg-white/5 border border-white/10 py-1.5 px-4 rounded-xl text-slate-450">
          <Activity className={`w-3.5 h-3.5 ${
            platformStatus === 'online' ? 'text-emerald-400 animate-pulse' :
            platformStatus === 'checking' ? 'text-yellow-400 animate-spin' :
            'text-rose-500'
          }`} />
          <span className="text-slate-350">
            {platformStatus === 'online' && 'platform: online'}
            {platformStatus === 'local mode' && 'platform: local mode'}
            {platformStatus === 'checking' && 'platform: checking...'}
            {platformStatus === 'error' && 'platform: connection issues'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400 uppercase font-bold">{utcTime ? `UTC: ${utcTime}` : 'UTC: --:--:--'}</span>
        </div>
      </footer>

      {/* 4. Overlay Popups - Subsidiary Brand Detail Modal */}
      <AnimatePresence>
        {activeBrandModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden relative border border-white/10"
            >
              <button
                onClick={() => setActiveBrandModal(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-black/60 text-white hover:bg-black/90 cursor-pointer transition"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="h-56 md:h-full relative font-sans">
                  <img 
                    src={activeBrandModal.visualUrl} 
                    alt={activeBrandModal.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex flex-col justify-end p-6">
                    <span className="text-[10px] font-mono uppercase bg-cyan-400 text-slate-950 font-bold px-2.5 py-0.5 rounded-full w-max mb-1">active showroom</span>
                    <h3 className="text-2xl font-display font-black text-rose-50 mt-1">{activeBrandModal.name}</h3>
                  </div>
                </div>

                <div className="p-6 space-y-5 flex flex-col justify-between bg-slate-950/90 md:bg-transparent">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">official brand alliance</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{activeBrandModal.description}</p>
                    
                    <div className="pt-2">
                      <span className="block text-[10px] font-mono uppercase text-[#00f0ff] mb-2 font-bold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> mock showroom catalog lines:
                      </span>
                      <ul className="space-y-1.5">
                        {activeBrandModal.id === 'brand_kbera' && [
                          'Cyberpunk Graphic t-shirts',
                          'Stellar Black winter hoods',
                          'Neon-dyed organic stickers packs'
                        ].map((txt,i)=>(
                          <li key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> {txt}
                          </li>
                        ))}
                        {activeBrandModal.id === 'brand_miniature' && [
                          'Microscopic traditional Sinhala houses',
                          'Personalized photo transparent cubes',
                          'Cybernetic wood sculpture logs'
                        ].map((txt,i)=>(
                          <li key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {txt}
                          </li>
                        ))}
                        {activeBrandModal.id === 'brand_phoenix' && [
                          'Abstract Acrylic Canvas Boards',
                          'Bespoke fluid room partition art',
                          'Modern graphic poster collections'
                        ].map((txt,i)=>(
                          <li key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> {txt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => { alert('අනුබද්ධිත වෙබ් අඩවියට පිවිසීම දැනට සීමා කර ඇත. Direct orders strictly processed through SPT OFFICIAL.'); }}
                    className="w-full py-2.5 rounded-xl bg-white text-slate-950 font-bold font-mono uppercase tracking-wider text-xs hover:bg-slate-200 transition-colors cursor-pointer text-center"
                  >
                    Direct order inquiry
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Portal Unlock / Sign In & Sign Up Modal Gate */}
      <AnimatePresence>
        {showLoginWall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
          >
            <div className="relative w-full max-w-md">
              <button
                onClick={() => {
                  setShowLoginWall(false);
                }}
                className="absolute top-6 right-6 z-50 p-2 rounded-xl bg-white/5 text-slate-450 hover:text-white cursor-pointer transition-colors"
                title="Close login portal"
              >
                <X className="w-4 h-4" />
              </button>
              <SptUniverseGate
                language={language}
                recoveryMode={recoveryMode}
                onClose={() => {
                  setShowLoginWall(false);
                  setRecoveryMode(false);
                }}
                onSuccess={async (userData) => {
                  setRecoveryMode(false);
                  const resolvedEmail = userData.email.toLowerCase().trim();
                  const displayName = userData.name || resolvedEmail.split('@')[0];
                  
                  setCustomerSession({
                    name: displayName,
                    email: resolvedEmail
                  });

                  // userData.password present = login flow, absent = signup flow (OTP)
                  const isLoginFlow = !!userData.password;
                  console.log('[onSuccess] isLoginFlow:', isLoginFlow, 'password present:', !!userData.password, 'userData keys:', Object.keys(userData));

                  // Increment display counters for marketing
                  setDisplayRegisteredCount(prev => prev + 1);
                  setDisplaySubscribedCount(prev => prev + 1);
                  // Ensure user is registered in the subscription base
                  setSptUsersList(prev => {
                    const exists = prev.some(u => u.email.toLowerCase() === resolvedEmail);
                    if (exists) return prev;
                    return [{
                      id: `user_${Date.now()}`,
                      name: displayName,
                      email: resolvedEmail,
                      registeredAt: new Date().toISOString(),
                      subscriptionStatus: 'trial',
                      subscriptionExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
                    }, ...prev];
                  });

                  const isMasterAdmin = resolvedEmail === 'sadeeppasindu0218@gmail.com';

                  if (isMasterAdmin) {
                    setIsAdminUnlocked(true);
                    alert('Sadeep Pasindu Elite Console Unlocked! Admin tab is now visible in your navigation links bar.');
                  }

                  // Fire-and-forget profile sync (non-blocking, never delays redirect)
                  fetch('/api/admin/sync-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: resolvedEmail,
                      name: displayName,
                      role: isMasterAdmin ? 'admin' : 'user',
                      subscription_status: 'trial',
                      subscription_expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
                    }),
                  }).catch(err => console.error("Profile sync error (server):", err));

                  setShowLoginWall(false);
                  
                  const existingUser = sptUsersList.find(u => u.email.toLowerCase() === resolvedEmail);
                  let resolvedStatus = 'trial'; // default
                  if (existingUser) {
                    if (existingUser.subscriptionStatus === 'active') {
                      if (existingUser.subscriptionExpiresAt) {
                        const diff = new Date(existingUser.subscriptionExpiresAt).getTime() - Date.now();
                        resolvedStatus = diff <= 0 ? 'expired' : 'active';
                      } else {
                        resolvedStatus = 'active';
                      }
                    } else if (existingUser.subscriptionStatus === 'pending') {
                      resolvedStatus = 'pending';
                    } else if (existingUser.subscriptionStatus === 'trial') {
                      if (existingUser.subscriptionExpiresAt) {
                        const diff = new Date(existingUser.subscriptionExpiresAt).getTime() - Date.now();
                        resolvedStatus = diff <= 0 ? 'expired' : 'trial';
                      } else {
                        resolvedStatus = 'trial';
                      }
                    } else {
                      resolvedStatus = existingUser.subscriptionStatus || 'trial';
                    }
                  }

                  const hasActivePlan = resolvedStatus === 'active' || resolvedStatus === 'trial';

                  if (!hasActivePlan && pendingPlanCheckoutAfterLogin) {
                    setSelectedPlanForPayment(pendingPlanCheckoutAfterLogin as any);
                    const username = displayName || 'USER';
                    const cleanName = username.toUpperCase().split(' ')[0].replace(/[^A-Z]/g, '');
                    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                    setGeneratedRefCode("SPT-" + cleanName + "-" + randomSuffix);
                    setShowPaymentCheckout(true);
                    setPendingPlanCheckoutAfterLogin(null);
                  }

                  // Auto-select free plan for signup
                  if (!isLoginFlow) {
                    const fp = subscriptionPlans.find((p: any) => p.priceUsd === 0);
                    if (fp) setSelectedPlanIdInPlans(fp.id);
                    // Signup -> Plans page (free trial active, countdown shows)
                    setActiveTab('plans');
                  } else {
                    // Login -> Home page
                    setActiveTab('home');
                  }
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Secure Checkout & Slip Receipt Upload Modal */}
      <AnimatePresence>
        {showPaymentCheckout && selectedPlanForPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-xl rounded-3xl relative border border-[#00f0ff]/30 shadow-[0_0_50px_rgba(3,180,250,0.15)] max-h-[90vh] flex flex-col overflow-hidden bg-[#0d0a1b]/98"
            >
              <button
                onClick={() => {
                  setShowPaymentCheckout(false);
                }}
                className="absolute top-5 right-5 z-20 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white cursor-pointer transition"
                title="Cancel Checkout"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Secure Checkout Header */}
              <div className="p-6 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-transparent">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-[#00f0ff] shrink-0">
                  <ShieldCheck className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-[#00f0ff] uppercase tracking-widest font-black block">SECURE PORTAL CHECKOUT</span>
                  <h3 className="text-lg font-bold text-white uppercase font-display leading-tight">{t('ගෙවීම් සහ සක්‍රීය කිරීම් ද්වාරය', 'Payment & Activation Gateway')}</h3>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-5 flex-grow font-sans text-left">
                
                {/* Selected Plan Details & Converted LKR value */}
                {(() => {
                  const activePlanDetails = {
                    weekly: { usd: 1, name: 'Weekly Pack', desc: 'සතියක් වලංගු සම්පූර්ණ ප්‍රවේශය' },
                    monthly: { usd: 3, name: 'Monthly Pack', desc: 'මසක් වලංගු සම්පූර්ණ ප්‍රවේශය' },
                    '6months': { usd: 15, name: '6 Mo Pack', desc: 'මාස 6ක කාලයක් සදහා වරප්‍රසාද' },
                    yearly: { usd: 20, name: 'Yearly Pack', desc: 'මුළු වසරක් සදහා වලංගු SPT මෙවලම්' },
                    lifetime: { usd: 100, name: 'Lifetime Pack', desc: 'ජීවිත කාලයටම SPT සාමාජිකත්වය' }
                  }[selectedPlanForPayment] || { usd: 1, name: 'Weekly Pack', desc: 'සතියක් වලංගු සම්පූර්ණ ප්‍රවේශය' };

                  const computedLkr = (activePlanDetails.usd * liveLkrRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                  return (
                    <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-400/5 blur-xl rounded-full" />
                      <div className="space-y-1 relative z-10">
                        <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">{activePlanDetails.name}</span>
                        <h4 className="text-xs text-slate-300">{t(activePlanDetails.desc, activePlanDetails.desc)}</h4>
                        <p className="text-[10px] text-slate-500 font-sans">
                          Exchange rate: Rs. {liveLkrRate.toFixed(2)} LKR = $1.00 USD
                        </p>
                      </div>
                      <div className="bg-black/60 px-4 py-2.5 rounded-xl border border-white/5 text-right font-sans shrink-0">
                        <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">LKR Live Price (ලංකා රුපියල්)</span>
                        <div className="text-xl font-black text-amber-300 mt-0.5 tracking-tight">
                          Rs. {computedLkr}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono italic">${activePlanDetails.usd}.00 USD</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Gateway Selector Row */}
                {(() => {
                  const activeGateways = paymentGatewaysList.filter(g => g.isActive);
                  const currentGateway = activeGateways.find(g => g.id === selectedGatewayId) || activeGateways[0];
                  
                  // Initialize selection
                  if (activeGateways.length > 0 && !selectedGatewayId) {
                    setSelectedGatewayId(activeGateways[0].id);
                  }

                  return (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black mb-1.5">
                          {t('1. ගෙවීම් ක්‍රමය තෝරන්න (Select Payment Gateway)', '1. Select Payment Method')}
                        </label>
                        {activeGateways.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {activeGateways.map(g => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => setSelectedGatewayId(g.id)}
                                className={`px-3 py-2.5 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                  (currentGateway?.id === g.id)
                                    ? 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.2)] font-extrabold'
                                    : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'
                                }`}
                              >
                                {g.type === 'bank' ? '🏦' : g.type === 'googlepay' ? '📱' : '💳'} {t(g.name, g.nameEn || g.name)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-rose-300">No active payment gateway configured by Admin.</p>
                        )}
                      </div>

                      {/* Display Selected Gateway Instructions */}
                      {currentGateway && (
                        <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                          <span className="block text-[10px] font-mono text-[#00f0ff] tracking-widest uppercase font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            {t(`${currentGateway.name} ගෙවීම් උපදෙස්`, `${currentGateway.nameEn || currentGateway.name} Instructions`)}:
                          </span>
                          <div className="p-3 bg-black/70 rounded-lg border border-white/5 font-mono text-white text-[11px] whitespace-pre-wrap leading-relaxed select-all">
                            {t(currentGateway.details, currentGateway.detailsEn || currentGateway.details)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Unique Ref Card block */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#bd00ff]/2 opacity-[0.03] pointer-events-none" />
                  <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest font-black">
                    CRITICAL: PAY remark/reference code (බැංකු විස්තර යොමු අංකය)
                  </span>
                  <p className="text-slate-400 text-xs leading-relaxed font-sans">
                    {t(
                      'ඔබගේ බැංකු තැන්පතු හෝ online transaction Remark/Reference සදහා පහත සඳහන් කේතය අනිවාර්යයෙන්ම ඇතුලත් කරන්න. මෙමගින් ගෙවීම් තහවුරු කිරීම කඩිනම් වේ:',
                      'Make sure to input your unique code in the bank transaction Remark/Reference field to speed up confirmation:'
                    )}
                  </p>
                  <div className="p-2.5 bg-black rounded border border-white/10 font-mono text-center text-sm font-black text-[#00f0ff] tracking-widest selection:bg-cyan-500/30">
                    {generatedRefCode}
                  </div>
                </div>

                {/* File Receipt upload block */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">
                    {t('2. තැන්පත් රිසිට්පතෙහි ඡායාරූපය උඩුගත කරන්න (Upload receipt image)', '2. Upload Transaction / Deposit receipt slip')}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Base64 encoded payload or image url..."
                      value={uploadedReceiptB64}
                      onChange={e => setUploadedReceiptB64(e.target.value)}
                      className="flex-grow px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      className="whitespace-nowrap px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs hover:text-white cursor-pointer transition font-mono uppercase text-slate-300 font-bold"
                    >
                      <label className="cursor-pointer">
                        Select File
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setUploadedReceiptB64(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                      </label>
                    </button>
                  </div>

                  {uploadedReceiptB64 && (
                    <div className="pt-2 border border-white/5 p-2 bg-black/20 rounded-xl">
                      <span className="block text-[9px] text-slate-400 font-mono mb-1">Receipt Preview (රිසිට්පත් පෙරදසුන):</span>
                      <img 
                        src={uploadedReceiptB64} 
                        alt="slip preview" 
                        className="max-h-40 max-w-full object-contain rounded-lg border border-white/10 mx-auto" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* Confirm submit actions bottom bar */}
              <div className="p-4 bg-black/45 border-t border-white/15">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!uploadedReceiptB64) {
                      alert('කරුණාකර පළමුව ඔබගේ බැංකු තැන්පත් රිසිට්පතෙහි ඡායාරූපය උඩුගත කරන්න. (Please upload receipt image first!)');
                      return;
                    }
                    
                    if (customerSession?.email) {
                      const emailLower = customerSession.email.toLowerCase().trim();
                      setDisplaySubscribedCount(prev => prev + 1);
                      setSptUsersList(prev => {
                        const exists = prev.some(u => u.email.toLowerCase() === emailLower);
                        if (exists) {
                          return prev.map(u => {
                            if (u.email.toLowerCase() === emailLower) {
                              return {
                                ...u,
                                subscriptionStatus: 'pending',
                                subscriptionPlan: selectedPlanForPayment,
                                paymentReference: generatedRefCode,
                                receiptUrl: uploadedReceiptB64,
                                paymentSubmittedAt: new Date().toISOString()
                              };
                            }
                            return u;
                          });
                        } else {
                          const newUserObj: SptUser = {
                            id: `usr_${Date.now()}`,
                            name: customerSession.name || 'User',
                            email: emailLower,
                            registeredAt: new Date().toISOString(),
                            subscriptionStatus: 'pending',
                            subscriptionPlan: selectedPlanForPayment,
                            paymentReference: generatedRefCode,
                            receiptUrl: uploadedReceiptB64,
                            paymentSubmittedAt: new Date().toISOString()
                          };
                          return [...prev, newUserObj];
                        }
                      });
                      syncProfileToSupabase(customerSession.email, {
                        subscription_status: 'pending',
                        subscription_plan: selectedPlanForPayment,
                        payment_reference: generatedRefCode,
                        receipt_url: uploadedReceiptB64,
                        payment_submitted_at: new Date().toISOString()
                      });

                      alert('ඔබගේ ගෙවීම් රිසිට්පත සාර්ථකව Super Admin වෙත යොමු කරන ලදී! \n\nReceipt verification request forwarded to Admin\'s email: sadeeppasindu0218@gmail.com\nAlso registered in Admin verification console log queue.');
                      
                      setShowPaymentCheckout(false);
                      setActiveTab('tools');
                    }
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-500 hover:to-blue-700 text-slate-950 font-extrabold font-mono tracking-widest text-xs uppercase transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 animate-pulse"
                >
                  <CheckCircle className="w-4 h-4" /> CONFIRM & SEND RECEIPT
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6.6 Admin 6-Digit PIN Prompt Modal */}
      <AnimatePresence>
        {showAdminPinPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-sm rounded-2xl relative border border-[#00f0ff]/30 shadow-[0_0_50px_rgba(0,240,255,0.2)] bg-[#0a0815]/98 text-left p-6 space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowAdminPinPrompt(false);
                  setAdminPinInput('');
                  setAdminPinError('');
                }}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white cursor-pointer transition"
                title="Cancel authentication"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-[#00f0ff]">
                  <Lock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-[#00f0ff] uppercase tracking-widest font-black block">SUPER ADMIN AUTHENTICATION</span>
                  <h3 className="text-base font-bold text-white uppercase font-display leading-none">
                    {t('පරිපාලක ආරක්ෂක PIN තහවුරු කිරීම', 'Verify Admin Security PIN')}
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t(
                    'පරිපාලක පැනලයට ඇතුල් වීම සීමා කර ඇත! කරුණාකර ඔබගේ ඉලක්කම් 6ක ආරක්ෂක PIN කේතය (Security PIN) මෙහි සටහන් කරන්න.',
                    'This area is restricted! Please enter your 6-digit security PIN to access the Sadeep Pasindu Elite Console.'
                  )}
                </p>

                <div>
                  <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1.55">
                    {t('ආරක්ෂක PIN කේතය (Security PIN)', 'Enter Security PIN')}
                  </span>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    value={adminPinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setAdminPinInput(val);
                      setAdminPinError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (adminPinInput === adminPin) {
                          setIsAdminPinVerified(true);
                          setShowAdminPinPrompt(false);
                          setAdminPinInput('');
                          setAdminPinError('');
                          setActiveTab('admin');
                        } else {
                          setAdminPinError(t('වැරදි PIN කේතයකි! කරුණාකර නැවත උත්සාහ කරන්න.', 'Incorrect PIN code! Please try again.'));
                        }
                      }
                    }}
                    className="w-full text-center text-xl font-mono tracking-[0.5em] bg-black/60 border border-white/10 rounded-xl py-3 text-[#00f0ff] focus:outline-none focus:border-[#00f0ff]/50 transition"
                    autoFocus
                    required
                  />
                  {adminPinError && (
                    <span className="text-[10px] font-mono text-rose-400 uppercase font-black block mt-2 text-center">
                      ⚠️ {adminPinError}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPinPrompt(false);
                      setAdminPinInput('');
                      setAdminPinError('');
                    }}
                    className="w-1/3 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white font-black font-mono tracking-wider text-[10px] uppercase cursor-pointer transition text-center"
                  >
                    {t('අවලංගු කරන්න', 'Cancel')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (adminPinInput === adminPin) {
                        setIsAdminPinVerified(true);
                        setShowAdminPinPrompt(false);
                        setAdminPinInput('');
                        setAdminPinError('');
                        setActiveTab('admin');
                      } else {
                        setAdminPinError(t('වැරදි PIN කේතයකි! කරුණාකර නැවත උත්සාහ කරන්න.', 'Incorrect PIN code! Please try again.'));
                      }
                    }}
                    className="flex-grow py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-500 hover:to-blue-700 text-slate-950 font-black font-mono tracking-widest text-[10px] uppercase cursor-pointer transition shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-1.5"
                  >
                    🔐 {t('ඇතුල් වන්න', 'Verify & Access')}
                  </button>
                </div>
              </div>

              <div className="bg-black/35 p-3 rounded-xl border border-white/5 text-[9px] font-mono text-slate-500 text-center uppercase tracking-wide leading-relaxed">
                Default PIN is 000000 during initial sandbox trial • Security logs are active
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6.5 Interactive User Profile, Avatar manager and Password Settings Modal */}
      <AnimatePresence>
        {showProfileModal && customerSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-4 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-xl rounded-2xl relative border border-[#00f0ff]/30 shadow-[0_0_50px_rgba(0,240,255,0.2)] max-h-[92vh] flex flex-col overflow-hidden bg-[#0a0815]/98 text-left"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileOldPass('');
                  setProfileNewPass('');
                  setProfileConfirmPass('');
                }}
                className="absolute top-5 right-5 z-20 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white cursor-pointer transition animate-none"
                title="Close profile panel"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Profile Header Block */}
              <div className="p-6 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-transparent">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-[#00f0ff]">
                  <Settings className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-[#00f0ff] uppercase tracking-widest font-black block">USER CONTROL CENTER</span>
                  <h3 className="text-lg font-bold text-white uppercase font-display leading-none">
                    {t('පැතිකඩ සහ ආරක්ෂක සැකසුම්', 'Profile & Security Settings')}
                  </h3>
                </div>
              </div>

              {/* Scrollable Settings Area */}
              <div className="p-6 overflow-y-auto space-y-6 flex-grow text-left font-sans">
                
                {/* 1. Profile Photo Interactive Control Block */}
                {(() => {
                  const currentUserConfig = sptUsersList.find(u => u.email.toLowerCase() === customerSession.email.toLowerCase());
                  const userAvatar = currentUserConfig?.profilePictureUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(customerSession.email)}`;

                  return (
                    <div className="p-5 rounded-2xl bg-cyan-950/15 border border-cyan-500/15 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-400/5 blur-2xl rounded-full pointer-events-none" />
                      
                      {/* Round Frame Profile Photo */}
                      <div className="relative shrink-0">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 to-[#bd00ff] opacity-75 blur-sm" />
                        <img
                          src={userAvatar}
                          alt="Large User Avatar"
                          className="w-20 h-20 rounded-full border-2 border-[#00f0ff] object-cover relative z-10 shadow-xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Photo Actions and Inputs */}
                      <div className="space-y-2 relative z-10 flex-grow text-center sm:text-left w-full">
                        <h4 className="text-sm font-bold text-white">{customerSession.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono select-all break-all">{customerSession.email}</p>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          {/* File input disguised as button */}
                          <label className="px-3 py-1.5 rounded-lg bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 border border-[#00f0ff]/30 text-[10px] font-mono tracking-wider text-[#00f0ff] font-bold uppercase transition cursor-pointer select-none">
                            {t('ඡායාරූපය වෙනස් කරන්න', 'Change Photo')}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const b64 = reader.result as string;
                                    setSptUsersList(prev => prev.map(u => {
                                      if (u.email.toLowerCase() === customerSession.email.toLowerCase()) {
                                        return { ...u, profilePictureUrl: b64 };
                                      }
                                      return u;
                                    }));
                                    alert('පැතිකඩ ඡායාරූපය සාර්ථකව උඩුගත කරන ලදී! (Profile image uploaded!)');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>

                          {currentUserConfig?.profilePictureUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('ඔබට ඔබගේ පැතිකඩ ඡායාරූපය ඉවත් කර සාමාන්‍ය රූපය සැකසීමට අවශ්‍යද? (Remove custom photo?)')) {
                                  setSptUsersList(prev => prev.map(u => {
                                    if (u.email.toLowerCase() === customerSession.email.toLowerCase()) {
                                      const { profilePictureUrl, ...rest } = u;
                                      return rest;
                                    }
                                    return u;
                                  }));
                                  alert('පැතිකඩ ඡායාරූපය සාර්ථකව ඉවත් කරන ලදී. (Profile custom image removed.)');
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[10px] font-mono tracking-wider text-rose-400 uppercase transition cursor-pointer"
                            >
                              {t('ඉවත් කරන්න', 'Remove Photo')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. My Subscription Plan Interactive Display Capsule */}
                {(() => {
                  const currentUserConfig = sptUsersList.find(u => u.email.toLowerCase() === customerSession.email.toLowerCase());
                  const activePlanTitle = {
                    weekly: 'Weekly Premium Pack',
                    monthly: 'Monthly Premium Pack',
                    '6months': '6-Month Extreme Pack',
                    yearly: 'Yearly Ultimate Pack',
                    lifetime: 'Lifetime Elite Pack'
                  }[currentUserConfig?.subscriptionPlan || ''] || '7-Day Free Trial (නොමිලේ අත්හදා බලන්නා)';

                  const isExpired = currentUserConfig?.subscriptionStatus === 'expired';
                  const isPending = currentUserConfig?.subscriptionStatus === 'pending';
                  const isActive = currentUserConfig?.subscriptionStatus === 'active';
                  const isTrial = currentUserConfig?.subscriptionStatus === 'trial';

                  return (
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 relative overflow-hidden text-left">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest font-extrabold mb-1">
                            {t('වත්මන් සාමාජිකත්වය', 'Current Active Membership')}
                          </span>
                          <span className="text-xs text-white font-bold block uppercase tracking-wide">
                            My Plan: <span className="text-[#00f0ff]">{activePlanTitle}</span>
                          </span>
                          {currentUserConfig?.subscriptionExpiresAt && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-1">
                              Expires on: {new Date(currentUserConfig.subscriptionExpiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 font-mono text-[9px] font-extrabold tracking-widest uppercase text-right">
                          {isActive && (
                            <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ACTIVE
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                              PENDING
                            </span>
                          )}
                          {isTrial && (
                            <span className="px-2.5 py-1 rounded bg-cyan-500/15 text-[#00f0ff] border border-cyan-500/30">
                              TRIAL
                            </span>
                          )}
                          {isExpired && (
                            <span className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              EXPIRED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Redirect Go To Premium Subscriptions button */}
                      <button
                        type="button"
                        onClick={() => {
                          const planCode = currentUserConfig?.subscriptionPlan; // 'weekly', 'monthly', etc.
                          let matchPlanId = 'plan_1'; // default plan
                          if (planCode === 'weekly') matchPlanId = 'plan_1';
                          else if (planCode === 'monthly') matchPlanId = 'plan_2';
                          else if (planCode === '6months') matchPlanId = 'plan_3';
                          else if (planCode === 'yearly') matchPlanId = 'plan_4';
                          else if (planCode === 'lifetime') matchPlanId = 'plan_5';
                          
                          setSelectedPlanIdInPlans(matchPlanId);
                          setActiveTab('plans');
                          setShowProfileModal(false);
                          
                          // Pre-scroll or notify
                          setTimeout(() => {
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }, 100);
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black font-mono tracking-widest text-[10px] uppercase cursor-pointer transition shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-1.5"
                      >
                        💎 {t('මගේ දායකත්වය සහ පැකේජ බලන්න', 'My Subscription / View Plans')}
                      </button>
                    </div>
                  );
                })()}

                {/* 3. Password Encryption / Change Segment */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-4 text-left">
                  <div>
                    <h4 className="text-xs font-mono text-[#00f0ff] uppercase tracking-widest font-black flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      {t('මුරපදය යාවත්කාලීන කරන්න', 'Secure Password Vault Updates')}
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal mt-1">
                      {t(
                        'ඔබගේ ගිණුමේ ඇති පැරණි මුරපදය නිවැරදි නම් පමණක් නව මුරපදය යාවත්කාලීන වේ. පැරණි මුරපදය වැරදුනහොත් ඔබව ස්වයංක්‍රීයව පද්ධතියෙන් ඉවත් (Auto-Logout) කර වහල පිටුවට යොමු කෙරේ.',
                        'Enter your old password correctly to verify identity before locking new password. Incorrect old passwords trigger an automatic session logout.'
                      )}
                    </p>
                  </div>

                  <div className="space-y-3 font-sans text-left">
                    {/* Old Password Input */}
                    <div>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1">
                        {t('පැරණි මුරපදය (Old Password)', 'Old Password')}
                      </span>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={profileOldPass}
                        onChange={(e) => setProfileOldPass(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-black/45 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-[#00f0ff] transition"
                        required
                      />
                    </div>

                    {/* New Password row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                      <div>
                        <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1">
                          {t('නව මුරපදය (New Password)', 'New Password')}
                        </span>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={profileNewPass}
                          onChange={(e) => setProfileNewPass(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-black/45 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-[#00f0ff] transition"
                          required
                        />
                      </div>
                      <div>
                        <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1">
                          {t('නව මුරපදය නැවත (Confirm New Password)', 'Confirm Password')}
                        </span>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={profileConfirmPass}
                          onChange={(e) => setProfileConfirmPass(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-black/45 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-[#00f0ff] transition"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit password button */}
                  <button
                    type="button"
                    disabled={isUpdatingProfilePass}
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!profileOldPass) {
                        alert('කරුණාකර පැරණි මුරපදය ඇතුලත් කරන්න. (Please fill old password field)');
                        return;
                      }
                      if (!profileNewPass || !profileConfirmPass) {
                        alert('කරුණාකර නව මුරපදය ඇතුලත් කර තහවුරු කරන්න. (Please fill new and confirm password fields)');
                        return;
                      }
                      if (profileNewPass !== profileConfirmPass) {
                        alert('අලුත් මුරපදයන් එකිනෙකට නොගැලපේ! (New passwords do not match!)');
                        return;
                      }
                      if (profileNewPass.length < 6) {
                        alert('නව මුරපදය සඳහා අවම වශයෙන් අක්ෂර 6ක්වත් ඇතුලත් කරන්න. (New password must be at least 6 characters.)');
                        return;
                      }

                      setIsUpdatingProfilePass(true);
                      try {
                        // Attempt authenticating with current login session email and entered old password to verify the user
                        const { error: signInError } = await supabase.auth.signInWithPassword({
                          email: customerSession.email,
                          password: profileOldPass
                        });

                        if (signInError) {
                          throw signInError;
                        }

                        // Authenticated correctly! Update the password on Supabase authentication module safely
                        const { error: updateError } = await supabase.auth.updateUser({
                          password: profileNewPass
                        });

                        if (updateError) {
                          throw updateError;
                        }

                        // Sync in local users directory state too
                        setSptUsersList(prev => prev.map(u => {
                          if (u.email.toLowerCase() === customerSession.email.toLowerCase()) {
                            return { ...u, password: profileNewPass };
                          }
                          return u;
                        }));

                        alert('සාර්ථකයි! ඔබගේ රහස්‍ය මුරපදය නවීකරණය කරන ලදී. (Success! Your password was verified and updated securely.)');
                        setProfileOldPass('');
                        setProfileNewPass('');
                        setProfileConfirmPass('');
                        setShowProfileModal(false);
                      } catch (err: any) {
                        // "old password eka harinam witharak aluth eka change wenne, pasword eka waradunoth ato logout wela home ekata genawa"
                        // Wrong password entered -> Auto logout!
                        alert('ආරක්ෂක අනතුරු ඇඟවීම් දෝෂයකි! පැරණි මුරපදය වැරදියි. ඔබගේ ගිණුම ආරක්ෂා කිරීමට ඔබව ස්වයංක්‍රීයව ලොග් අවුට් කරනු ලැබේ. \n\n(Incorrect old password! Auto-logout for security.)');
                        
                        setCustomerSession(null);
                        setActiveToolId(null);
                        setProfileOldPass('');
                        setProfileNewPass('');
                        setProfileConfirmPass('');
                        setActiveTab('home');
                        setShowProfileModal(false);
                      } finally {
                        setIsUpdatingProfilePass(false);
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-500 hover:to-blue-700 text-slate-950 font-black font-mono tracking-widest text-[10px] uppercase cursor-pointer transition shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-1.5"
                  >
                    {isUpdatingProfilePass ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {isUpdatingProfilePass ? 'PROCESSING SECURE UPDATE...' : 'UPDATE SECURE PASSWORD'}
                  </button>
                </div>

              </div>

              {/* Close Bottom Actions */}
              <div className="p-4 bg-black/45 border-t border-white/10 text-center text-[10px] text-slate-500 font-mono">
                SPT Universe Security Gateways Protected • SSL Encryption Shield
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Blog Post Deep Detail Popup Modal */}
      <AnimatePresence>
        {activeBlogDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden relative border border-white/10 max-h-[90vh] flex flex-col"
            >
              {/* Header bar controls / exit */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/30">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  Reading Article • {activeBlogDetail.author || 'Admin'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveBlogDetail(null)}
                  className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable contents wrapper */}
              <div className="overflow-y-auto p-6 space-y-6 flex-grow custom-scrollbar">
                {activeBlogDetail.youtubeUrl && getYouTubeEmbedId(activeBlogDetail.youtubeUrl) ? (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-lg relative">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeEmbedId(activeBlogDetail.youtubeUrl)}`}
                      title="YouTube video player"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : activeBlogDetail.mediaUrl && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/50 aspect-video flex items-center justify-center">
                    {activeBlogDetail.mediaType === 'image' && (
                      <img 
                        src={activeBlogDetail.mediaUrl} 
                        alt={activeBlogDetail.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {activeBlogDetail.mediaType === 'video' && (
                      <video 
                        src={activeBlogDetail.mediaUrl} 
                        controls 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {activeBlogDetail.mediaType === 'audio' && (
                      <div className="p-8 w-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-950 to-slate-900">
                        <Music className="w-12 h-12 text-cyan-400 mb-4 animate-bounce" />
                        <audio src={activeBlogDetail.mediaUrl} controls className="w-full max-w-md h-10" />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span>Published: {new Date(activeBlogDetail.createdAt || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-display font-medium text-white tracking-tight leading-snug">
                    {activeBlogDetail.title}
                  </h2>

                  <p className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap pt-2">
                    {activeBlogDetail.content}
                  </p>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="p-4 border-t border-white/5 bg-black/40 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveBlogDetail(null)}
                  className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white tracking-wider cursor-pointer transition"
                >
                  Close Article
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const articleLink = `${window.location.origin}/?tab=blogs&id=${activeBlogDetail.id}`;
                    try {
                      await navigator.clipboard.writeText(articleLink);
                      alert('බ්ලොග් ලිපියේ ලින්ක් එක සාර්ථකව පිටපත් කර ගන්නා ලදි! Copy Link Successful.');
                    } catch (err) {
                      alert('Could not copy link to clipboard');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/30 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Service Showcase visual modal dialog */}
      <AnimatePresence>
        {activeServiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden relative border border-[#00f0ff]/20 bg-slate-950/95 flex flex-col max-h-[90vh]"
            >
              <button
                onClick={() => setActiveServiceModal(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-black/60 text-white hover:bg-black/90 cursor-pointer transition border border-white/10"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="overflow-y-auto p-6 md:p-8 space-y-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#00f0ff]">
                    {activeServiceModal.category.replace('_', ' ')}
                  </span>
                  <h3 className="text-2xl font-display font-bold text-white tracking-tight mt-1">
                    {activeServiceModal.title}
                  </h3>
                  <div className="h-[1.5px] w-12 bg-neon-blue mt-1 mb-2" />
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">
                    {activeServiceModal.description}
                  </p>
                </div>

                {activeServiceModal.youtubeUrl && getYouTubeEmbedId(activeServiceModal.youtubeUrl) ? (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-[#00f0ff]/30 bg-black shadow-lg relative">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeEmbedId(activeServiceModal.youtubeUrl)}`}
                      title="YouTube video player"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : activeServiceModal.imageUrl && (
                  <div className="h-44 md:h-64 rounded-2xl overflow-hidden relative border border-white/5">
                    <img 
                      src={activeServiceModal.imageUrl} 
                      alt={activeServiceModal.title} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Showcase works subsection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span className="text-xs uppercase font-mono font-bold tracking-widest text-slate-200">
                      Showcase Portfolio Works (නිර්මාණ එකතුව):
                    </span>
                  </div>

                  {activeServiceModal.showcaseFiles && activeServiceModal.showcaseFiles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeServiceModal.showcaseFiles.map(file => (
                        <div key={file.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-xs">{file.type === 'video' ? '🎥' : '📷'}</span>
                              <span className="text-[9px] font-mono uppercase bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-bold">
                                {file.type}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white tracking-wide">{file.title}</h4>
                          </div>

                          {file.type === 'video' ? (
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative border border-white/10">
                              {file.url.includes('youtube.com/embed/') ? (
                                <iframe
                                  src={file.url}
                                  title={file.title}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center space-y-2 bg-slate-900">
                                  <Video className="w-8 h-8 text-[#00f0ff] animate-pulse" />
                                  <span className="text-[10px] text-slate-400">Playable video attachment</span>
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-[#00f0ff] text-slate-950 hover:bg-cyan-400 font-bold font-mono text-[9px] rounded flex items-center gap-1 transition"
                                  >
                                    Watch Video Demo <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 bg-black/60 relative">
                              <img 
                                src={file.url} 
                                alt={file.title} 
                                className="w-full h-full object-cover hover:scale-105 transition" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">පරිපාලක විසින් කිසිදු සජීවී නිර්මාණයක් තවමත් ඇතුළත් කර නැත. (No showcase files yet)</p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row gap-3 items-center justify-between">
                  <div className="text-center md:text-left">
                    <span className="text-[10px] text-slate-400 block font-mono">Book this elite service today:</span>
                    <span className="text-xs text-amber-305 font-bold">100% Satisfactory Guarantee</span>
                  </div>
                  <button
                    onClick={() => {
                      trackTelemetryEvent('click', activeTab, 'Contact WhatsApp');
                      alert(`පරිපාලක / Creator 'Sadeep' සමග සම්බන්ධ වීම: Order reference is '${activeServiceModal.title}'`);
                      setActiveServiceModal(null);
                    }}
                    className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-slate-950 font-bold text-xs uppercase font-mono tracking-wider rounded-xl hover:opacity-95 cursor-pointer text-center shadow-lg"
                  >
                    Direct Order WhatsApp / Support
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. App Shortcut Installation Guideline Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel w-full max-w-sm rounded-3xl p-6 relative border border-white/10"
            >
              <button
                onClick={() => setShowInstallGuide(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white cursor-pointer transition"
                title="Close guide"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-2 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-b from-slate-900 to-black border-2 border-amber-400 flex flex-col items-center justify-center mx-auto shadow-lg shadow-amber-500/20 overflow-hidden">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      <span className="text-md font-black text-amber-300 font-display">SPT</span>
                      <span className="text-[5px] text-amber-400 font-extrabold uppercase tracking-widest leading-none mt-0.5">OFFICIAL</span>
                    </>
                  )}
                </div>
                <h3 className="text-lg font-display font-medium text-white">{t("ෂෝට්කට් එකක් එක් කිරීමේ උපදෙස්", "Add Shortcut Guide")}</h3>
                <p className="text-xs text-slate-400">{t("ඔබගේ දුරකථනයෙහි, ටැබ් එකෙහි හෝ පරිගණක මුහුණතෙහි Shortcut එකක් එක් කිරීමේ පියවර", "Easy steps to add a quick desktop or mobile home screen access shortcut")}</p>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 text-left">
                  <span className="block text-[10px] font-mono text-[#00f0ff] uppercase font-bold">{t("📱 ඇපල් iOS (Safari දුරකථන/ටැබ්)", "📱 Apple iOS (Safari iPhone/iPad)")}</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {language === 'si' ? (
                      <>
                        1. පහළ ඇති සෆාරි <span className="font-bold text-amber-300">&ldquo;Share&rdquo; (බෙදාගන්න)</span> බොත්තම ඔබන්න.<br />
                        2. මෙනුවෙන් <span className="font-bold text-amber-300">&ldquo;Add to Home Screen&rdquo; (මුල් තිරයට එක් කරන්න)</span> තෝරන්න.<br />
                        3. ඉන්පසු දකුණු පස ඉහලින් ඇති Add button එක ක්ලික් කරන්න.
                      </>
                    ) : (
                      <>
                        1. Tap the Safari <span className="font-bold text-amber-300">&ldquo;Share&rdquo;</span> button at the bottom of the screen.<br />
                        2. Scroll down and choose <span className="font-bold text-amber-300">&ldquo;Add to Home Screen&rdquo;</span> from the menu.<br />
                        3. Tap the <span className="font-bold text-amber-300">&ldquo;Add&rdquo;</span> button in the top-right corner to save.
                      </>
                    )}
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 text-left">
                  <span className="block text-[10px] font-mono text-emerald-400 uppercase font-bold">{t("🤖 ඇන්ඩ්‍රොයිඩ් / ක්‍රෝම් (දුරකථන සහ ටැබ්)", "🤖 Android / Chrome (Phone & Tablet)")}</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {language === 'si' ? (
                      <>
                        1. බ්‍රවුසරයේ දකුණු පස ඇති තිත් තුන <span className="font-bold text-amber-300">(Menu)</span> ඔබන්න.<br />
                        2. <span className="font-bold text-amber-300">&ldquo;Add to Home Screen&rdquo;</span> හෝ <span className="font-bold text-amber-300">&ldquo;Install App&rdquo;</span> ක්ලික් කරන්න.
                      </>
                    ) : (
                      <>
                        1. Tap the three dots <span className="font-bold text-amber-300">(Menu)</span> on the top right corner of Chrome browser.<br />
                        2. Choose <span className="font-bold text-amber-300">&ldquo;Add to Home Screen&rdquo;</span> or <span className="font-bold text-amber-300">&ldquo;Install App&rdquo;</span>.
                      </>
                    )}
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 text-left">
                  <span className="block text-[10px] font-mono text-[#bd00ff] uppercase font-bold">{t("💻 ඩෙස්ක්ටොප් ක්‍රෝම් / එජ් (පරිගණක)", "💻 Desktop Chrome / Edge (Laptop/PC)")}</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {language === 'si' ? (
                      <>
                        1. URL bar එකේ දකුණු පස ඇති <span className="font-bold text-cyan-300">&ldquo;Install&rdquo; (Download icon)</span> එක ක්ලික් කරන්න.<br />
                        2. නැතහොත් Settings ... click කර <span className="font-bold text-cyan-500">&ldquo;Save and share&rdquo; &rarr; &ldquo;Install page&rdquo;</span> තෝරන්න.
                      </>
                    ) : (
                      <>
                        1. Click the <span className="font-bold text-cyan-300">&ldquo;Install App&rdquo; icon</span> in the right corner of the URL address bar.<br />
                        2. Or open the browser menu, click <span className="font-bold text-cyan-500">&ldquo;Save and share&rdquo; &rarr; &ldquo;Install page&rdquo;</span>.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-full py-2.5 mt-5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:bg-yellow-500 font-bold text-xs font-mono uppercase transition cursor-pointer text-center"
              >
                {t("තේරුණා", "Understood")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global AI Chatbot Support */}
      <CustomerSupportChat language={language} />
    </div>
  );
}
