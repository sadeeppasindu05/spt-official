-- Migration 002: Add missing tables for full system CRUD + realtime
-- Run this in Supabase SQL Editor AFTER 001_apply_rls_policies.sql

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

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.marketing_counters;
