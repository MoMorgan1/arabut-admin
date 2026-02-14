-- =============================================================
-- Fix revenue_settlements table - add missing total_amount column
-- =============================================================

-- Check if column exists and add it if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'revenue_settlements' 
        AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE revenue_settlements 
        ADD COLUMN total_amount NUMERIC(12,2);
        
        RAISE NOTICE 'Added total_amount column to revenue_settlements';
    ELSE
        RAISE NOTICE 'total_amount column already exists';
    END IF;
END $$;

-- Also ensure upload_date exists (in case it's missing too)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'revenue_settlements' 
        AND column_name = 'upload_date'
    ) THEN
        ALTER TABLE revenue_settlements 
        ADD COLUMN upload_date TIMESTAMPTZ NOT NULL DEFAULT now();
        
        RAISE NOTICE 'Added upload_date column to revenue_settlements';
    ELSE
        RAISE NOTICE 'upload_date column already exists';
    END IF;
END $$;
