-- =============================================================
-- Fix Profiles RLS for User Sync
-- =============================================================
-- Issue: When creating users via admin panel, the trigger function
-- handle_new_user() needs to insert into profiles table.
-- Even though it's SECURITY DEFINER, RLS still applies.
-- This migration adds a policy to allow the service role to bypass RLS.
-- =============================================================

-- Add policy for service role (used by admin client and triggers)
CREATE POLICY "service_role_all_profiles" ON profiles
  FOR ALL
  USING (
    -- Service role can access all profiles
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Also allow users to read their own profile
    auth.uid() = id
  )
  WITH CHECK (
    -- Service role can modify all profiles
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Users can update their own profile
    auth.uid() = id
  );

-- Ensure admins can read all profiles (already covered by existing policies, but ensure it's clear)
CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Allow admins to insert/update profiles
CREATE POLICY "admin_write_profiles" ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "admin_update_profiles" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
