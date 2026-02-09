-- =============================================================
-- Migration 019: Add RLS policies for supplier_prices & default_supplier_prices
-- Fixes: "new row violates row-level security policy" error
-- =============================================================

-- -----------------------------------------------
-- 1. Enable RLS (safe if already enabled)
-- -----------------------------------------------
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_supplier_prices ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 2. Drop existing policies if any (safe re-run)
-- -----------------------------------------------
DROP POLICY IF EXISTS "admin_employee_read_all" ON supplier_prices;
DROP POLICY IF EXISTS "admin_write_all" ON supplier_prices;
DROP POLICY IF EXISTS "employee_write_supplier_prices" ON supplier_prices;
DROP POLICY IF EXISTS "supplier_read_own_prices" ON supplier_prices;
DROP POLICY IF EXISTS "supplier_write_own_prices" ON supplier_prices;

DROP POLICY IF EXISTS "admin_employee_read_all" ON default_supplier_prices;
DROP POLICY IF EXISTS "admin_write_all" ON default_supplier_prices;
DROP POLICY IF EXISTS "employee_write_default_prices" ON default_supplier_prices;

-- -----------------------------------------------
-- 3. supplier_prices policies
-- -----------------------------------------------

-- Admin: full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "admin_write_all" ON supplier_prices FOR ALL
  USING (get_user_role() = 'admin');

-- Employee: read all + insert/update/delete
CREATE POLICY "admin_employee_read_all" ON supplier_prices FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));

CREATE POLICY "employee_write_supplier_prices" ON supplier_prices FOR ALL
  USING (get_user_role() = 'employee');

-- Supplier: read + write their own pricing only
CREATE POLICY "supplier_read_own_prices" ON supplier_prices FOR SELECT
  USING (
    get_user_role() = 'supplier'
    AND supplier_id IN (
      SELECT s.id FROM suppliers s WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "supplier_write_own_prices" ON supplier_prices FOR ALL
  USING (
    get_user_role() = 'supplier'
    AND supplier_id IN (
      SELECT s.id FROM suppliers s WHERE s.user_id = auth.uid()
    )
  );

-- -----------------------------------------------
-- 4. default_supplier_prices policies
-- -----------------------------------------------

-- Admin: full access
CREATE POLICY "admin_write_all" ON default_supplier_prices FOR ALL
  USING (get_user_role() = 'admin');

-- Employee: read all + insert/update/delete
CREATE POLICY "admin_employee_read_all" ON default_supplier_prices FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));

CREATE POLICY "employee_write_default_prices" ON default_supplier_prices FOR ALL
  USING (get_user_role() = 'employee');
