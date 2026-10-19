-- ====================================================================
-- BETTER CAMPUS COMMUNITY: TRAVEL BUDDY FINDER (SRM UNIVERSITY-AP)
-- PostgreSQL Migration: 0002_fix_time_slots_rls.sql
-- Fixes RLS policies on time_slots, slot_members, and messages
-- Run this in your Supabase Dashboard > SQL Editor > New query > Run
-- ====================================================================

-- 1. TIME SLOTS RLS FIX
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Authenticated users can insert time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Allow public read time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Allow public insert time slots" ON public.time_slots;

CREATE POLICY "Allow public read time slots"
    ON public.time_slots
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow public insert time slots"
    ON public.time_slots
    FOR INSERT
    TO public
    WITH CHECK (true);

-- 2. SLOT MEMBERS RLS FIX
ALTER TABLE public.slot_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view slot memberships" ON public.slot_members;
DROP POLICY IF EXISTS "Users can join a slot as themselves" ON public.slot_members;
DROP POLICY IF EXISTS "Users can leave a slot only for themselves" ON public.slot_members;
DROP POLICY IF EXISTS "Allow public view slot memberships" ON public.slot_members;
DROP POLICY IF EXISTS "Allow public join slot memberships" ON public.slot_members;
DROP POLICY IF EXISTS "Allow public leave slot memberships" ON public.slot_members;

CREATE POLICY "Allow public view slot memberships"
    ON public.slot_members
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow public join slot memberships"
    ON public.slot_members
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Allow public leave slot memberships"
    ON public.slot_members
    FOR DELETE
    TO public
    USING (true);

-- 3. MESSAGES RLS FIX
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view messages in their joined slots" ON public.messages;
DROP POLICY IF EXISTS "Members can insert messages in their joined slots" ON public.messages;
DROP POLICY IF EXISTS "Allow public view messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public insert messages" ON public.messages;

CREATE POLICY "Allow public view messages"
    ON public.messages
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow public insert messages"
    ON public.messages
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Ensure Realtime publications are enabled
ALTER TABLE public.time_slots REPLICA IDENTITY FULL;
ALTER TABLE public.slot_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
