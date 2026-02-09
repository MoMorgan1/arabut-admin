-- ===================================
-- Migration: Create deleted_orders and deleted_order_items tables
-- Purpose: Move deleted orders to separate tables instead of soft delete
-- ===================================

-- Create deleted_orders table (same structure as orders)
CREATE TABLE IF NOT EXISTS deleted_orders (
  id UUID PRIMARY KEY,
  salla_order_id TEXT NOT NULL,
  salla_ref_id TEXT,
  order_date TIMESTAMPTZ NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_phone_code TEXT NOT NULL DEFAULT '966',
  platform TEXT CHECK (platform IN ('PS', 'PC')),
  order_type TEXT NOT NULL DEFAULT 'coins',
  payment_method TEXT,
  salla_total_sar NUMERIC(10,2) NOT NULL DEFAULT 0,
  exchange_rate NUMERIC(10,4),
  settled_amount NUMERIC(10,2),
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  ban_status TEXT NOT NULL DEFAULT 'none',
  refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  assigned_employee UUID,
  notes TEXT,
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
  sku TEXT,
  product_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_sar NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform TEXT CHECK (platform IN ('PS', 'PC')),
  status TEXT NOT NULL DEFAULT 'new',
  expected_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  supplier_id UUID,
  notes TEXT,
  customer_note TEXT,
  
  -- Account Credentials
  ea_email TEXT,
  ea_password TEXT,
  ea_backup1 TEXT,
  ea_backup2 TEXT,
  ea_backup3 TEXT,
  ps_backup1 TEXT,
  ps_backup2 TEXT,
  ps_backup3 TEXT,
  
  -- Coins specific
  coins_amount_k INTEGER,
  shipping_type TEXT,
  transfer_method TEXT,
  max_price_eur NUMERIC(10,2),
  top_up_enabled INTEGER,
  fulfillment_method TEXT,
  coins_delivered_k NUMERIC(10,2) DEFAULT 0,
  
  -- FUT Transfer API
  ft_order_id TEXT,
  ft_status TEXT,
  ft_account_check TEXT,
  ft_economy_state TEXT,
  ft_last_synced TIMESTAMPTZ,
  
  -- Service fields
  rank_target TEXT,
  rank_achieved TEXT,
  rank_urgency TEXT,
  
  -- SBC
  challenges_count INTEGER,
  
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
