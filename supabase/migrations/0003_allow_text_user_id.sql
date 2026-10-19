-- ====================================================================
-- BETTER CAMPUS COMMUNITY: TRAVEL BUDDY FINDER (SRM UNIVERSITY-AP)
-- PostgreSQL Migration: 0003_allow_text_user_id.sql
-- Fixes UUID input syntax error by converting user_id columns to TEXT
-- and removing restrictive auth.users foreign key constraints.
-- Run this in your Supabase Dashboard > SQL Editor > New query > Run
-- ====================================================================

-- 1. DROP RESTRICTIVE FOREIGN KEY CONSTRAINTS
ALTER TABLE public.slot_members DROP CONSTRAINT IF EXISTS slot_members_user_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. ALTER COLUMNS TO TEXT (accepts both Google OAuth numeric sub IDs and UUIDs)
ALTER TABLE public.slot_members ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.messages ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;

-- 3. ENSURE RLS POLICIES PERMIT BOTH AUTHENTICATED AND PUBLIC REQUESTS
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Allow public insert time slots" ON public.time_slots;
CREATE POLICY "Allow public read time slots" ON public.time_slots FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert time slots" ON public.time_slots FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public view slot memberships" ON public.slot_members;
DROP POLICY IF EXISTS "Allow public join slot memberships" ON public.slot_members;
DROP POLICY IF EXISTS "Allow public leave slot memberships" ON public.slot_members;
CREATE POLICY "Allow public view slot memberships" ON public.slot_members FOR SELECT TO public USING (true);
CREATE POLICY "Allow public join slot memberships" ON public.slot_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public leave slot memberships" ON public.slot_members FOR DELETE TO public USING (true);

DROP POLICY IF EXISTS "Allow public view messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public insert messages" ON public.messages;
CREATE POLICY "Allow public view messages" ON public.messages FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert messages" ON public.messages FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public upsert profiles" ON public.profiles;
CREATE POLICY "Allow public view profiles" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Allow public upsert profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);
