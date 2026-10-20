-- Drop unique constraint on time_slots to allow multiple ride groups in the same time window
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'time_slots' 
          AND constraint_name = 'uq_slot_dest_date_window'
    ) THEN
        ALTER TABLE public.time_slots DROP CONSTRAINT uq_slot_dest_date_window;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
