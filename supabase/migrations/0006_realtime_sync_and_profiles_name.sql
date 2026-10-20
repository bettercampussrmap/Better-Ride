-- ====================================================================
-- BETTER RIDE: REAL-TIME SYNC & USER PROFILES MIGRATION
-- Migration 0006: 0006_realtime_sync_and_profiles_name.sql
-- ====================================================================

-- 0. Safely drop foreign key constraints that restrict users exclusively to auth.users
-- This allows both Google sign-in users, Supabase auth users, and student profiles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'slot_members_user_id_fkey') THEN
        ALTER TABLE public.slot_members DROP CONSTRAINT slot_members_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_user_id_fkey') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_user_id_fkey;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 1. Ensure 'name' column exists on public.profiles and sync with display_name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE public.profiles SET name = display_name WHERE name IS NULL AND display_name IS NOT NULL;
UPDATE public.profiles SET display_name = name WHERE display_name IS NULL AND name IS NOT NULL;

-- 2. Create 'ride_members' alias view pointing to 'slot_members'
-- Ensures queries referencing either ride_members or slot_members succeed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ride_members') THEN
        CREATE OR REPLACE VIEW public.ride_members AS
        SELECT 
            id,
            slot_id,
            user_id,
            joined_at
        FROM public.slot_members;
    END IF;
END $$;

-- 3. Set Replica Identity FULL to deliver complete row payloads on UPDATE & DELETE in Realtime
ALTER TABLE public.slot_members REPLICA IDENTITY FULL;
ALTER TABLE public.time_slots REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 4. Enable Supabase Realtime publication on all essential tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'slot_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_members;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'time_slots') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.time_slots;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
