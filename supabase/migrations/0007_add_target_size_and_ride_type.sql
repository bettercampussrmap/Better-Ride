-- ====================================================================
-- BETTER RIDE: DYNAMIC GROUP CAPACITY & VEHICLE TYPE MIGRATION
-- Migration 0007: 0007_add_target_size_and_ride_type.sql
-- ====================================================================

-- 1. Add target_size and ride_type columns to public.time_slots
ALTER TABLE public.time_slots 
ADD COLUMN IF NOT EXISTS target_size INT DEFAULT 4,
ADD COLUMN IF NOT EXISTS ride_type TEXT DEFAULT 'auto';

-- 2. Add target_size, ride_pref, and pickup_note columns to public.slot_members
ALTER TABLE public.slot_members 
ADD COLUMN IF NOT EXISTS target_size INT DEFAULT 4,
ADD COLUMN IF NOT EXISTS ride_pref TEXT DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS pickup_note TEXT;

-- 3. Update the ride_members view if present to include the new columns
DO $$
BEGIN
    CREATE OR REPLACE VIEW public.ride_members AS
    SELECT 
        id,
        slot_id,
        user_id,
        ride_pref,
        target_size,
        pickup_note,
        joined_at
    FROM public.slot_members;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Set Replica Identity FULL to deliver complete row payloads on UPDATE & DELETE in Realtime
ALTER TABLE public.slot_members REPLICA IDENTITY FULL;
ALTER TABLE public.time_slots REPLICA IDENTITY FULL;

-- 5. Ensure Supabase Realtime publication includes time_slots and slot_members
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'slot_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_members;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'time_slots') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.time_slots;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
