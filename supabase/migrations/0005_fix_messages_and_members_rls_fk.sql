-- ====================================================================
-- BETTER CAMPUS COMMUNITY: TRAVEL BUDDY FINDER (SRM UNIVERSITY-AP)
-- PostgreSQL Migration: 0005_fix_messages_and_members_rls_fk.sql
-- Fixes foreign key constraint on messages and slot_members
-- Allows realtime broadcast and public insert/select
-- ====================================================================

DO $$
BEGIN
    -- 1. Drop foreign key constraints that restrict user_id to auth.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_user_id_fkey') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'slot_members_user_id_fkey') THEN
        ALTER TABLE public.slot_members DROP CONSTRAINT slot_members_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;

    -- 2. Ensure columns are TEXT so all user IDs are valid
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'user_id') THEN
        ALTER TABLE public.messages ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'slot_members' AND column_name = 'user_id') THEN
        ALTER TABLE public.slot_members ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id') THEN
        ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- 3. Ensure pickup_note column exists on slot_members
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'slot_members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'slot_members' AND column_name = 'pickup_note') THEN
            ALTER TABLE public.slot_members ADD COLUMN pickup_note TEXT;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. PERMISSIVE RLS POLICIES FOR INSTANT CROSS-USER SYNC
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public view messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public insert messages" ON public.messages;
CREATE POLICY "Allow public view messages" ON public.messages FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert messages" ON public.messages FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public view slot memberships" ON public.slot_members;
DROP POLICY IF EXISTS "Allow public join slot memberships" ON public.slot_members;
DROP POLICY IF EXISTS "Allow public leave slot memberships" ON public.slot_members;
CREATE POLICY "Allow public view slot memberships" ON public.slot_members FOR SELECT TO public USING (true);
CREATE POLICY "Allow public join slot memberships" ON public.slot_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public leave slot memberships" ON public.slot_members FOR DELETE TO public USING (true);

-- 5. REALTIME REPLICATION
ALTER TABLE public.slot_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.time_slots REPLICA IDENTITY FULL;
