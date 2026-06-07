-- SPT Official - Complete RLS Policies Deployment
-- Run this in Supabase SQL Editor to apply all security policies

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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles." ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "Only admins can delete profiles." ON public.profiles
  FOR DELETE USING (is_admin());

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

DROP POLICY IF EXISTS "Services are viewable by everyone." ON public.services;
DROP POLICY IF EXISTS "Only admins can insert services." ON public.services;
DROP POLICY IF EXISTS "Only admins can update services." ON public.services;
DROP POLICY IF EXISTS "Only admins can delete services." ON public.services;

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

DROP POLICY IF EXISTS "Tools are viewable by everyone." ON public.tools;
DROP POLICY IF EXISTS "Only admins can insert tools." ON public.tools;
DROP POLICY IF EXISTS "Only admins can update tools." ON public.tools;
DROP POLICY IF EXISTS "Only admins can delete tools." ON public.tools;

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

DROP POLICY IF EXISTS "Brands are viewable by everyone." ON public.brands;
DROP POLICY IF EXISTS "Only admins can insert brands." ON public.brands;
DROP POLICY IF EXISTS "Only admins can update brands." ON public.brands;
DROP POLICY IF EXISTS "Only admins can delete brands." ON public.brands;

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

DROP POLICY IF EXISTS "Offers are viewable by everyone." ON public.offers;
DROP POLICY IF EXISTS "Only admins can insert offers." ON public.offers;
DROP POLICY IF EXISTS "Only admins can update offers." ON public.offers;
DROP POLICY IF EXISTS "Only admins can delete offers." ON public.offers;

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

DROP POLICY IF EXISTS "Reviews are viewable by everyone." ON public.reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews." ON public.reviews;
DROP POLICY IF EXISTS "Only admins can update reviews." ON public.reviews;
DROP POLICY IF EXISTS "Only admins can delete reviews." ON public.reviews;

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

DROP POLICY IF EXISTS "Blogs are viewable by everyone." ON public.blogs;
DROP POLICY IF EXISTS "Only admins can insert blogs." ON public.blogs;
DROP POLICY IF EXISTS "Only admins can update blogs." ON public.blogs;
DROP POLICY IF EXISTS "Only admins can delete blogs." ON public.blogs;

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

DROP POLICY IF EXISTS "Homestats are viewable by everyone." ON public.homestats;
DROP POLICY IF EXISTS "Only admins can insert homestats." ON public.homestats;
DROP POLICY IF EXISTS "Only admins can update homestats." ON public.homestats;
DROP POLICY IF EXISTS "Only admins can delete homestats." ON public.homestats;

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

DROP POLICY IF EXISTS "Aboutcards are viewable by everyone." ON public.aboutcards;
DROP POLICY IF EXISTS "Only admins can insert aboutcards." ON public.aboutcards;
DROP POLICY IF EXISTS "Only admins can update aboutcards." ON public.aboutcards;
DROP POLICY IF EXISTS "Only admins can delete aboutcards." ON public.aboutcards;

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

DROP POLICY IF EXISTS "Gateways are viewable by everyone." ON public.gateways;
DROP POLICY IF EXISTS "Only admins can insert gateways." ON public.gateways;
DROP POLICY IF EXISTS "Only admins can update gateways." ON public.gateways;
DROP POLICY IF EXISTS "Only admins can delete gateways." ON public.gateways;

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

DROP POLICY IF EXISTS "Contacts are viewable by everyone." ON public.contacts;
DROP POLICY IF EXISTS "Only admins can insert contacts." ON public.contacts;
DROP POLICY IF EXISTS "Only admins can update contacts." ON public.contacts;
DROP POLICY IF EXISTS "Only admins can delete contacts." ON public.contacts;

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

DROP POLICY IF EXISTS "Plans are viewable by everyone." ON public.plans;
DROP POLICY IF EXISTS "Only admins can insert plans." ON public.plans;
DROP POLICY IF EXISTS "Only admins can update plans." ON public.plans;
DROP POLICY IF EXISTS "Only admins can delete plans." ON public.plans;

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

DROP POLICY IF EXISTS "System configuration is viewable by everyone." ON public.system_config;
DROP POLICY IF EXISTS "Only admins can insert or update system configuration." ON public.system_config;

CREATE POLICY "System configuration is viewable by everyone." ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Only admins can insert or update system configuration." ON public.system_config FOR ALL USING (is_admin());

-- Enable realtime for all tables (for live sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blogs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homestats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aboutcards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gateways;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
