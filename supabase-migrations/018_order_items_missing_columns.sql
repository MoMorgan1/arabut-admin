-- Add missing order_items columns (division_target, is_fast_service, rank_target, etc.)
-- Run this if you get "Could not find the 'division_target' column" or similar.

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS rank_target INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS division_target INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_fast_service BOOLEAN DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS coins_delivered_k NUMERIC(10,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sbc_coins_cost NUMERIC(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sbc_service_cost NUMERIC(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_sar NUMERIC(10,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS ft_account_check TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS ft_economy_state TEXT;
