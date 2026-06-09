-- 17. Admins Table (persistent admin roles)
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

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.admins;

-- Insert default super admin if not exists
INSERT INTO public.admins (name, email, role, is_active)
SELECT 'Sadeep Pasindu', 'sadeeppasindu0218@gmail.com', 'superadmin', true
WHERE NOT EXISTS (SELECT 1 FROM public.admins WHERE email = 'sadeeppasindu0218@gmail.com');

INSERT INTO public.admins (name, email, role, is_active)
SELECT 'Staff Assistant', 'support@spt.com', 'moderator', true
WHERE NOT EXISTS (SELECT 1 FROM public.admins WHERE email = 'support@spt.com');
