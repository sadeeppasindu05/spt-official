-- Migration 003: Add online_count column to marketing_counters
ALTER TABLE IF EXISTS public.marketing_counters ADD COLUMN IF NOT EXISTS online_count integer default 14;
