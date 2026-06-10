-- SPT Official - Complete Database Schema + RLS Policies
-- Run this in Supabase SQL Editor to initialize the database

-- Admin check function (defined first as other policies depend on it)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  role text default 'user' check (role in ('user', 'admin')),
  subscription_status text default 'trial' check (subscription_status in ('trial', 'pending', 'active', 'expired')),
  subscription_plan text check (subscription_plan in ('weekly', 'monthly', '6months', 'yearly', 'lifetime')),
  subscription_expires_at timestamp with time zone,
  payment_reference text,
  receipt_url text,
  payment_submitted_at timestamp with time zone,
  profile_picture_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles." ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "Only admins can delete profiles." ON public.profiles FOR DELETE USING (is_admin());

-- 2. Services
CREATE TABLE IF NOT EXISTS public.services (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  title_en text,
  description text not null,
  description_en text,
  category text,
  highlight boolean default false,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone." ON public.services FOR SELECT USING (true);
CREATE POLICY "Only admins can insert services." ON public.services FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update services." ON public.services FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete services." ON public.services FOR DELETE USING (is_admin());

-- 3. Tools
CREATE TABLE IF NOT EXISTS public.tools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  name_en text,
  description text not null,
  description_en text,
  icon text,
  category text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tools are viewable by everyone." ON public.tools FOR SELECT USING (true);
CREATE POLICY "Only admins can insert tools." ON public.tools FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update tools." ON public.tools FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete tools." ON public.tools FOR DELETE USING (is_admin());

-- 4. Brands
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  name_en text,
  subtitle text,
  subtitle_en text,
  description text,
  description_en text,
  visual_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands are viewable by everyone." ON public.brands FOR SELECT USING (true);
CREATE POLICY "Only admins can insert brands." ON public.brands FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update brands." ON public.brands FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete brands." ON public.brands FOR DELETE USING (is_admin());

-- 5. Offers
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  title_en text,
  description text not null,
  description_en text,
  discount_badge text,
  discount_badge_en text,
  valid_until text,
  promo_code text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Offers are viewable by everyone." ON public.offers FOR SELECT USING (true);
CREATE POLICY "Only admins can insert offers." ON public.offers FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update offers." ON public.offers FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete offers." ON public.offers FOR DELETE USING (is_admin());

-- 6. Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  name_en text,
  role text,
  role_en text,
  comment text not null,
  comment_en text,
  rating integer check (rating >= 1 AND rating <= 5),
  avatar_seed text,
  image_url text,
  pinned boolean default false,
  hidden boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone." ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reviews." ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update reviews." ON public.reviews FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete reviews." ON public.reviews FOR DELETE USING (is_admin());

-- 7. Blogs
CREATE TABLE IF NOT EXISTS public.blogs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  title_en text,
  content text not null,
  content_en text,
  media_type text,
  media_url text,
  author text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blogs are viewable by everyone." ON public.blogs FOR SELECT USING (true);
CREATE POLICY "Only admins can insert blogs." ON public.blogs FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update blogs." ON public.blogs FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete blogs." ON public.blogs FOR DELETE USING (is_admin());

-- 8. Homestats
CREATE TABLE IF NOT EXISTS public.homestats (
  id uuid default gen_random_uuid() primary key,
  badge text not null,
  badge_en text,
  title text not null,
  title_en text,
  description text,
  description_en text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.homestats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homestats are viewable by everyone." ON public.homestats FOR SELECT USING (true);
CREATE POLICY "Only admins can insert homestats." ON public.homestats FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update homestats." ON public.homestats FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete homestats." ON public.homestats FOR DELETE USING (is_admin());

-- 9. Aboutcards
CREATE TABLE IF NOT EXISTS public.aboutcards (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  title_en text,
  description text not null,
  description_en text,
  icon text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.aboutcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aboutcards are viewable by everyone." ON public.aboutcards FOR SELECT USING (true);
CREATE POLICY "Only admins can insert aboutcards." ON public.aboutcards FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update aboutcards." ON public.aboutcards FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete aboutcards." ON public.aboutcards FOR DELETE USING (is_admin());

-- 10. Gateways
CREATE TABLE IF NOT EXISTS public.gateways (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  name text not null,
  name_en text,
  details text not null,
  details_en text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gateways are viewable by everyone." ON public.gateways FOR SELECT USING (true);
CREATE POLICY "Only admins can insert gateways." ON public.gateways FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update gateways." ON public.gateways FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete gateways." ON public.gateways FOR DELETE USING (is_admin());

-- 11. Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  title_en text,
  url text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contacts are viewable by everyone." ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Only admins can insert contacts." ON public.contacts FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update contacts." ON public.contacts FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete contacts." ON public.contacts FOR DELETE USING (is_admin());

-- 12. Plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  price_usd text,
  original_price_usd text,
  discount_tag text,
  duration_label text,
  is_popular boolean default false,
  is_free boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone." ON public.plans FOR SELECT USING (true);
CREATE POLICY "Only admins can insert plans." ON public.plans FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update plans." ON public.plans FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete plans." ON public.plans FOR DELETE USING (is_admin());

-- 13. System Config
CREATE TABLE IF NOT EXISTS public.system_config (
  key text primary key,
  value text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System configuration is viewable by everyone." ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Only admins can insert or update system configuration." ON public.system_config FOR ALL USING (is_admin());

-- 14. Support Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  name text,
  message text not null,
  status text default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support messages are viewable by admins only." ON public.support_messages FOR SELECT USING (is_admin());
CREATE POLICY "Anyone can insert support messages." ON public.support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update support messages." ON public.support_messages FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete support messages." ON public.support_messages FOR DELETE USING (is_admin());

-- 15. Telemetry Events
CREATE TABLE IF NOT EXISTS public.telemetry (
  id text primary key,
  type text not null,
  path text,
  element_name text,
  timestamp timestamp with time zone,
  session_token text,
  ip_location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Telemetry is viewable by admins only." ON public.telemetry FOR SELECT USING (is_admin());
CREATE POLICY "Anyone can insert telemetry." ON public.telemetry FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can delete telemetry." ON public.telemetry FOR DELETE USING (is_admin());

-- 17. Admins
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  role text not null default 'editor' check (role in ('superadmin', 'moderator', 'editor')),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins are viewable by admins only." ON public.admins;
DROP POLICY IF EXISTS "Only admins can insert admins." ON public.admins;
DROP POLICY IF EXISTS "Only admins can update admins." ON public.admins;
DROP POLICY IF EXISTS "Only admins can delete admins." ON public.admins;

CREATE POLICY "Admins are viewable by admins only." ON public.admins FOR SELECT USING (is_admin());
CREATE POLICY "Only admins can insert admins." ON public.admins FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update admins." ON public.admins FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete admins." ON public.admins FOR DELETE USING (is_admin());

-- Insert default super admin if not exists
INSERT INTO public.admins (name, email, role, is_active)
SELECT 'Sadeep Pasindu', 'sadeeppasindu0218@gmail.com', 'superadmin', true
WHERE NOT EXISTS (SELECT 1 FROM public.admins WHERE email = 'sadeeppasindu0218@gmail.com');

INSERT INTO public.admins (name, email, role, is_active)
SELECT 'Staff Assistant', 'support@spt.com', 'moderator', true
WHERE NOT EXISTS (SELECT 1 FROM public.admins WHERE email = 'support@spt.com');

-- 16. Marketing Counters
CREATE TABLE IF NOT EXISTS public.marketing_counters (
  id text primary key default 'global',
  registered_count integer default 592,
  subscribed_count integer default 370,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.marketing_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketing counters are viewable by everyone." ON public.marketing_counters FOR SELECT USING (true);
CREATE POLICY "Anyone can update marketing counters." ON public.marketing_counters FOR ALL USING (true);

-- Enable realtime for live data sync
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.tools;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.brands;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.offers;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.blogs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.homestats;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.aboutcards;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.gateways;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.plans;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.system_config;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.marketing_counters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admins;

-- 18. Storage Buckets for Images
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('avatars', 'avatars', true, false),
       ('receipts', 'receipts', true, false),
       ('cms-images', 'cms-images', true, false)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to storage objects
DROP POLICY IF EXISTS "Public Access avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public Access cms-images" ON storage.objects;
CREATE POLICY "Public Access avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public Access receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Public Access cms-images" ON storage.objects FOR SELECT USING (bucket_id = 'cms-images');
CREATE POLICY "Insert avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Insert receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "Insert cms-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cms-images' AND is_admin());
CREATE POLICY "Delete avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Delete receipts" ON storage.objects FOR DELETE USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "Delete cms-images" ON storage.objects FOR DELETE USING (bucket_id = 'cms-images' AND is_admin());

-- 19. Marketing Counters: add online_count column
ALTER TABLE public.marketing_counters ADD COLUMN IF NOT EXISTS online_count integer default 14;

-- 20. AI Custom Models
CREATE TABLE IF NOT EXISTS public.ai_models (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  api_key text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI models are viewable by admins only." ON public.ai_models FOR SELECT USING (is_admin());
CREATE POLICY "Only admins can insert ai_models." ON public.ai_models FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can update ai_models." ON public.ai_models FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can delete ai_models." ON public.ai_models FOR DELETE USING (is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.ai_models;

-- 21. Backups table for auto-backup persistence
CREATE TABLE IF NOT EXISTS public.backups (
  id uuid default gen_random_uuid() primary key,
  data jsonb not null,
  label text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backups are viewable by admins only." ON public.backups FOR SELECT USING (is_admin());
CREATE POLICY "Only admins can insert backups." ON public.backups FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can delete backups." ON public.backups FOR DELETE USING (is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.backups;

-- 22. Profile picture URL table (no FK constraints — works for custom-auth users)
CREATE TABLE IF NOT EXISTS public.profile_pictures (
  email text primary key,
  url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profile_pictures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile pictures are viewable by everyone." ON public.profile_pictures FOR SELECT USING (true);
CREATE POLICY "Anyone can upsert profile pictures." ON public.profile_pictures FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.profile_pictures;

-- 23. Atomic counter increment RPC (avoids client-side prev+1 race conditions)
CREATE OR REPLACE FUNCTION increment_counter(counter_type text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_val integer;
BEGIN
  IF counter_type = 'registered' THEN
    UPDATE marketing_counters SET registered_count = registered_count + 1, updated_at = now() WHERE id = 'global' RETURNING registered_count INTO new_val;
  ELSIF counter_type = 'subscribed' THEN
    UPDATE marketing_counters SET subscribed_count = subscribed_count + 1, updated_at = now() WHERE id = 'global' RETURNING subscribed_count INTO new_val;
  ELSE
    RAISE EXCEPTION 'invalid counter_type: %', counter_type;
  END IF;
  RETURN new_val;
END;
$$;
