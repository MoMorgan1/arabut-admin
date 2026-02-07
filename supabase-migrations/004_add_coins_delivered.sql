-- Migration: Add coins_delivered_k to order_items
-- Tracks partial delivery progress for coin orders (e.g., 250K delivered out of 500K total)

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS coins_delivered_k NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN order_items.coins_delivered_k IS 'Amount of coins (in K) that have been delivered so far';
