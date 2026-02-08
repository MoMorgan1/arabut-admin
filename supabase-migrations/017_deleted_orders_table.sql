-- ===================================
-- Migration: Create deleted_orders and deleted_order_items tables
-- Purpose: Move deleted orders to separate tables instead of soft delete
-- ===================================

-- Create deleted_orders table (same structure as orders)
CREATE TABLE IF NOT EXISTS deleted_orders (
  id UUID PRIMARY KEY,
  salla_order_id TEXT NOT NULL,
  salla_reference_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_phone_code TEXT NOT NULL,
  payment_method TEXT,
  salla_total_sar NUMERIC(10,2),
  exchange_rate NUMERIC(10,4),
  status TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  settled_amount NUMERIC(10,2),
  raw_webhook JSONB,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE deleted_orders IS 'Orders that have been moved to trash';
COMMENT ON COLUMN deleted_orders.deleted_at IS 'When the order was moved to trash';
COMMENT ON COLUMN deleted_orders.deleted_by IS 'Admin user who moved it to trash';

-- Create deleted_order_items table (same structure as order_items)
CREATE TABLE IF NOT EXISTS deleted_order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES deleted_orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  status TEXT NOT NULL,
  
  -- EA Credentials
  ea_email TEXT,
  ea_password TEXT,
  backup_code_1 TEXT,
  backup_code_2 TEXT,
  backup_code_3 TEXT,
  platform TEXT CHECK (platform IN ('PS', 'PC')),
  
  -- Coins specific
  coins_amount_k NUMERIC(10,2),
  shipping_type TEXT CHECK (shipping_type IN ('fast', 'slow')),
  max_price_eur NUMERIC(10,2),
  top_up_enabled INTEGER,
  fulfillment_method TEXT CHECK (fulfillment_method IN ('internal', 'external')),
  
  -- FUT Transfer
  ft_order_id TEXT,
  ft_status TEXT,
  ft_last_synced TIMESTAMPTZ,
  
  -- Cost
  expected_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  
  -- Supplier
  supplier_id UUID,
  
  -- Notes
  notes TEXT,
  customer_note TEXT,
  
  -- SBC
  challenges_count INTEGER,
  
  -- Coins delivery
  coins_delivered_k NUMERIC(10,2),
  
  -- Service targets
  rank_target INTEGER CHECK (rank_target BETWEEN 1 AND 6),
  division_target INTEGER CHECK (division_target BETWEEN 1 AND 10),
  is_fast_service BOOLEAN DEFAULT false,
  
  -- SBC dual costs
  sbc_coins_cost NUMERIC(10,2),
  sbc_service_cost NUMERIC(10,2),
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE deleted_order_items IS 'Order items from deleted orders';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_deleted_orders_deleted_at ON deleted_orders(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_orders_salla_order_id ON deleted_orders(salla_order_id);
CREATE INDEX IF NOT EXISTS idx_deleted_order_items_order_id ON deleted_order_items(order_id);

-- RLS Policies: Only admins can view/manage deleted orders
ALTER TABLE deleted_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_manage_deleted_orders ON deleted_orders;
CREATE POLICY admin_manage_deleted_orders ON deleted_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_manage_deleted_order_items ON deleted_order_items;
CREATE POLICY admin_manage_deleted_order_items ON deleted_order_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Remove deleted_at column from orders table (no longer needed)
ALTER TABLE orders DROP COLUMN IF EXISTS deleted_at;
