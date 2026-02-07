-- Fix notification RLS to allow broadcast notifications (user_id IS NULL)
-- These are created by the webhook handler for service orders

DROP POLICY IF EXISTS "admin_employee_read_all" ON notifications;

CREATE POLICY "user_read_own_or_broadcast" ON notifications FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
