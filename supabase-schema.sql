-- =============================================================
-- ArabUT — Supabase Schema v2
-- Order Management System for FIFA Ultimate Team services
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- =============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee', 'supplier')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper function for RLS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================
-- 2. SUPPLIERS
-- =============================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_info TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 3. ORDERS (parent — one per Salla order)
-- =============================================================
CREATE TYPE order_type AS ENUM ('coins', 'fut_rank', 'challenges', 'raffles', 'other');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salla_order_id TEXT UNIQUE NOT NULL,
  salla_reference_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_phone_code TEXT DEFAULT '+966',
  payment_method TEXT,
  salla_total_sar NUMERIC(10,2),
  exchange_rate NUMERIC(8,4),
  status TEXT NOT NULL DEFAULT 'new',
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  raw_webhook JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_salla_id ON orders(salla_order_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date DESC);

-- =============================================================
-- 4. ORDER ITEMS (child — one per product in the order)
-- =============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type order_type NOT NULL DEFAULT 'other',
  product_name TEXT NOT NULL,
  sku TEXT,
  status TEXT NOT NULL DEFAULT 'new',

  -- EA Credentials (for coins / services)
  ea_email TEXT,
  ea_password TEXT,
  backup_code_1 TEXT,
  backup_code_2 TEXT,
  backup_code_3 TEXT,
  platform TEXT CHECK (platform IN ('PS', 'PC')),

  -- Coins specific
  coins_amount_k NUMERIC(10,2),
  shipping_type TEXT CHECK (shipping_type IN ('fast', 'slow')),
  max_price_eur NUMERIC(8,2),
  top_up_enabled INTEGER,
  fulfillment_method TEXT CHECK (fulfillment_method IN ('internal', 'external')),

  -- FUT Transfer
  ft_order_id TEXT,
  ft_status TEXT,
  ft_last_synced TIMESTAMPTZ,

  -- Cost
  expected_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),

  -- Supplier assignment (for services)
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,
  customer_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status);
CREATE INDEX idx_order_items_type ON order_items(item_type);
CREATE INDEX idx_order_items_ft ON order_items(ft_order_id);

-- =============================================================
-- 5. ORDER STATUS LOG (audit trail)
-- =============================================================
CREATE TABLE order_status_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_log_item ON order_status_log(order_item_id);

-- =============================================================
-- 6. SUPPLIER TRANSACTIONS
-- =============================================================
CREATE TABLE supplier_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'deduction', 'refund', 'adjustment')),
  amount NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_tx_supplier ON supplier_transactions(supplier_id);

-- =============================================================
-- 7. EXPENSES
-- =============================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_months INTEGER DEFAULT 1,
  monthly_share NUMERIC(10,2),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 8. REVENUE SETTLEMENTS (Salla weekly files)
-- =============================================================
CREATE TABLE revenue_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount NUMERIC(12,2),
  matched_count INTEGER DEFAULT 0,
  unmatched_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 9. SETTLEMENT ITEMS
-- =============================================================
CREATE TABLE settlement_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id UUID NOT NULL REFERENCES revenue_settlements(id) ON DELETE CASCADE,
  salla_order_id TEXT NOT NULL,
  settled_amount NUMERIC(10,2) NOT NULL,
  is_matched BOOLEAN NOT NULL DEFAULT false,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlement_items_settlement ON settlement_items(settlement_id);

-- =============================================================
-- 10. PRICING RULES
-- =============================================================
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL CHECK (platform IN ('PS', 'PC')),
  shipping_type TEXT NOT NULL CHECK (shipping_type IN ('fast', 'slow')),
  min_amount_k NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_amount_k NUMERIC(10,2),
  price_per_million_usd NUMERIC(8,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed pricing rules from current N8N tiers
INSERT INTO pricing_rules (platform, shipping_type, min_amount_k, max_amount_k, price_per_million_usd) VALUES
  ('PS', 'slow', 0, NULL, 14),
  ('PS', 'fast', 0, 700, 16),
  ('PS', 'fast', 701, 1500, 18),
  ('PS', 'fast', 1501, 2000, 22),
  ('PS', 'fast', 2001, 5000, 24),
  ('PS', 'fast', 5001, NULL, 26),
  ('PC', 'slow', 0, NULL, 25),
  ('PC', 'fast', 0, NULL, 25);

-- =============================================================
-- 11. NOTIFICATIONS
-- =============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admin & Employee: full read access
CREATE POLICY "admin_employee_read_all" ON profiles FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON orders FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON order_items FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON order_status_log FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON suppliers FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON supplier_transactions FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON expenses FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON revenue_settlements FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON settlement_items FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON pricing_rules FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));
CREATE POLICY "admin_employee_read_all" ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Admin: full write access
CREATE POLICY "admin_write_all" ON profiles FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON orders FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON order_items FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON order_status_log FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON suppliers FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON supplier_transactions FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON expenses FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON revenue_settlements FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON settlement_items FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON pricing_rules FOR ALL
  USING (get_user_role() = 'admin');
CREATE POLICY "admin_write_all" ON notifications FOR ALL
  USING (get_user_role() = 'admin');

-- Employee: insert/update on orders and items
CREATE POLICY "employee_write_orders" ON orders FOR INSERT
  WITH CHECK (get_user_role() = 'employee');
CREATE POLICY "employee_update_orders" ON orders FOR UPDATE
  USING (get_user_role() = 'employee');
CREATE POLICY "employee_write_items" ON order_items FOR INSERT
  WITH CHECK (get_user_role() = 'employee');
CREATE POLICY "employee_update_items" ON order_items FOR UPDATE
  USING (get_user_role() = 'employee');
CREATE POLICY "employee_write_log" ON order_status_log FOR INSERT
  WITH CHECK (get_user_role() = 'employee');

-- Supplier: read only their assigned items
CREATE POLICY "supplier_read_own_items" ON order_items FOR SELECT
  USING (
    get_user_role() = 'supplier'
    AND supplier_id IN (
      SELECT s.id FROM suppliers s WHERE s.user_id = auth.uid()
    )
  );
CREATE POLICY "supplier_update_own_items" ON order_items FOR UPDATE
  USING (
    get_user_role() = 'supplier'
    AND supplier_id IN (
      SELECT s.id FROM suppliers s WHERE s.user_id = auth.uid()
    )
  );
CREATE POLICY "supplier_read_own_transactions" ON supplier_transactions FOR SELECT
  USING (
    get_user_role() = 'supplier'
    AND supplier_id IN (
      SELECT s.id FROM suppliers s WHERE s.user_id = auth.uid()
    )
  );
CREATE POLICY "supplier_read_own_profile" ON suppliers FOR SELECT
  USING (
    get_user_role() = 'supplier'
    AND user_id = auth.uid()
  );

-- Notifications: users read/update their own
CREATE POLICY "user_update_own_notifications" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================================
-- UPDATED_AT TRIGGER
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
