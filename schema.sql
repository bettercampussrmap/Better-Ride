-- ====================================================================
-- BETTER CAMPUS COMMUNITY: TRAVEL BUDDY FINDER (SRM UNIVERSITY-AP)
-- PostgreSQL Complete Schema & Migration: supabase/schema.sql
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SAFE MIGRATION FOR PREVIOUSLY CREATED TABLES
-- (Drops foreign keys to auth.users and converts UUID columns to TEXT
-- so both Google Identity user IDs and UUIDs work seamlessly without type errors)
DO $$
BEGIN
    -- 1. Drop foreign key constraints that restrict users to auth.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'slot_members_user_id_fkey') THEN
        ALTER TABLE public.slot_members DROP CONSTRAINT slot_members_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_user_id_fkey') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;

    -- 2. Convert UUID user_id / profile id to TEXT so all Google IDs & UUIDs are valid
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id') THEN
        ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'slot_members' AND column_name = 'user_id') THEN
        ALTER TABLE public.slot_members ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'user_id') THEN
        ALTER TABLE public.messages ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    END IF;

    -- 3. Add ride coordination columns if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'slot_members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'slot_members' AND column_name = 'target_size') THEN
            ALTER TABLE public.slot_members ADD COLUMN target_size INT DEFAULT 4;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'slot_members' AND column_name = 'ride_pref') THEN
            ALTER TABLE public.slot_members ADD COLUMN ride_pref TEXT DEFAULT 'auto';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'slot_members' AND column_name = 'pickup_note') THEN
            ALTER TABLE public.slot_members ADD COLUMN pickup_note TEXT;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_slots') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'time_slots' AND column_name = 'destination') THEN
            ALTER TABLE public.time_slots ADD COLUMN destination TEXT NOT NULL DEFAULT 'Vijayawada Railway Station (BZA)';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 1. PROFILES TABLE (supports both Google sub IDs & Supabase UUIDs)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. TIME SLOTS TABLE
CREATE TABLE IF NOT EXISTS public.time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination TEXT NOT NULL DEFAULT 'Vijayawada Railway Station (BZA)',
    departure_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    target_size INT DEFAULT 4,
    ride_type TEXT DEFAULT 'auto',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_slot_dest_date_window UNIQUE (destination, departure_date, start_time, end_time),
    CONSTRAINT chk_slot_time_order CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS idx_time_slots_dest_date ON public.time_slots(destination, departure_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_date ON public.time_slots(departure_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_date_time ON public.time_slots(departure_date, start_time);

-- 3. SLOT MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.slot_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    ride_pref TEXT DEFAULT 'auto',
    target_size INT DEFAULT 4,
    pickup_note TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_slot_user UNIQUE (slot_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_slot_members_slot_id ON public.slot_members(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_members_user_id ON public.slot_members(user_id);

-- 4. MESSAGES TABLE (Real-Time Internet Group Chat for each slot)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_message_length CHECK (length(trim(content)) > 0 AND length(content) <= 1000)
);
CREATE INDEX IF NOT EXISTS idx_messages_slot_id ON public.messages(slot_id, created_at ASC);

-- 5. ROW LEVEL SECURITY (Permissive policies to support Google accounts & fast real-time sync)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public upsert profiles" ON public.profiles;
CREATE POLICY "Allow public view profiles" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Allow public upsert profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Allow public insert time slots" ON public.time_slots;
CREATE POLICY "Allow public read time slots" ON public.time_slots FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert time slots" ON public.time_slots FOR INSERT TO public WITH CHECK (true);

ALTER TABLE public.slot_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public view slot memberships" ON public.slot_members;
DROP POLICY IF EXISTS "Allow public join slot memberships" ON public.slot_members;
DROP POLICY IF EXISTS "Allow public leave slot memberships" ON public.slot_members;
CREATE POLICY "Allow public view slot memberships" ON public.slot_members FOR SELECT TO public USING (true);
CREATE POLICY "Allow public join slot memberships" ON public.slot_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public leave slot memberships" ON public.slot_members FOR DELETE TO public USING (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public view messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public insert messages" ON public.messages;
CREATE POLICY "Allow public view messages" ON public.messages FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert messages" ON public.messages FOR INSERT TO public WITH CHECK (true);

-- 6. REALTIME REPLICATION (For instant live chat & live slot updates)
ALTER TABLE public.slot_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.time_slots REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'slot_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_members;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'time_slots') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.time_slots;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
