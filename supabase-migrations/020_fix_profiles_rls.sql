-- =============================================================
-- Fix Profiles RLS for User Sync (IDEMPOTENT - safe to re-run)
-- =============================================================
-- Issue: When creating users via admin panel, the trigger function
-- handle_new_user() needs to insert into profiles table.
-- This migration ensures all necessary RLS policies exist.
-- =============================================================

-- 1. Ensure get_user_role() helper exists (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop only our custom policies (safe re-run)
DROP POLICY IF EXISTS "service_role_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_write_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;

-- 3. Ensure the ORIGINAL schema policies exist on profiles
--    (re-create them if they were dropped)
DROP POLICY IF EXISTS "admin_employee_read_all" ON profiles;
CREATE POLICY "admin_employee_read_all" ON profiles
  FOR SELECT
  USING (get_user_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS "admin_write_all" ON profiles;
CREATE POLICY "admin_write_all" ON profiles
  FOR ALL
  USING (get_user_role() = 'admin');

-- 4. Allow users to always read their own profile
--    (needed for role checks before other policies kick in)
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 5. Supplier: read own profile
DROP POLICY IF EXISTS "supplier_read_own" ON profiles;
CREATE POLICY "supplier_read_own" ON profiles
  FOR SELECT
  USING (
    id = auth.uid()
    AND role = 'supplier'
  );

-- 6. Ensure handle_new_user trigger includes email column
--    (your DB has an email NOT NULL constraint on profiles)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
