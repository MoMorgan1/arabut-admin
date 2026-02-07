-- Add settled_amount to orders (for Salla settlement matching)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS settled_amount NUMERIC(10,2) DEFAULT NULL;

COMMENT ON COLUMN orders.settled_amount IS 'Amount from Salla settlement file when matched';
