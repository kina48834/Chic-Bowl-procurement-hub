-- seed/demo_accounts.sql — SINGLE demo-account SQL for Chic Bowl by 3rd Jen Kitchens.
-- Upserts public.profiles for the five demo emails (mirrors src/auth/seed-users.ts + Sign in page).
-- The /login page is email + password only (no role shortcut buttons; no on-screen demo password list).
-- After sign-in, the app
-- After sign-in, the SPA routes each role to that role’s dashboard (e.g. admin → /admin/dashboard, inventory-staff → /inventory/dashboard).
-- Operational schema + seeds: inventory_lines.category is constrained in 09_inventory_lines.sql to match
-- purchase_requests (05); app_settings copy in seed/demo_procurement_data.sql references /admin/reports and catalog routes.
--
-- =============================================================================
-- STEP 1 — Authentication (Dashboard → Authentication → Users → Add user)
-- =============================================================================
-- This file does NOT create auth.users. Passwords are checked only by Supabase Auth.
-- Add each user with the exact email and password below (Email provider on; for testing you
-- can disable “Confirm email”):
--
--   Email                      Password              Role in public.profiles (after STEP 2)
--   -------------------------  --------------------  ----------------------
--   admin@gmail.com            admin1919             admin
--   inventorystaff@gmail.com   inventorystaff1919    inventory-staff
--   purchasing@gmail.com       purchasing1919        purchasing
--   manager@gmail.com          manager1919           manager
--   finance@gmail.com          finance1919           finance
--
-- UIDs in Authentication (e.g. 39832e72-…) are created by Supabase and differ per project. Do not
-- paste them into this file — STEP 2 below joins auth.users to profiles by email only.
--
-- Passwords must match src/auth/seed-users.ts (Sign in page + local demo mode).
-- If users already exist with older passwords, open each user in Authentication → Users and set
-- the password to the value in the table above (or delete the user and Add user again).
--
-- =============================================================================
-- STEP 2 — Run this entire script in the SQL Editor (upsert profiles from auth.users)
-- =============================================================================
-- If login still fails: wrong password, email not confirmed, or user missing in Auth.
-- “Invalid login credentials” = Auth problem, not this INSERT. “Email not confirmed” → confirm the user under
-- Authentication → Users (not fixed by turning off Confirm email afterward); see 15_admin_provision_notes.sql.
--
-- Local-only app mode: when VITE_SUPABASE_* is unset, demo users come from seed-users.ts in
-- the browser — this script is for hosted Supabase only.
--
-- RLS: Postgres 42P17 on profiles → run supabase/sql/13_row_level_security.sql (full file).
--
-- NOTE: handle_new_user() may have inserted a profile already; this script overwrites demo rows.

INSERT INTO public.profiles (id, email, display_name, role, source)
SELECT
  u.id,
  lower(trim(u.email)),
  CASE lower(trim(u.email))
    WHEN 'admin@gmail.com' THEN 'Admin'
    WHEN 'inventorystaff@gmail.com' THEN 'Inventory Staff'
    WHEN 'purchasing@gmail.com' THEN 'Purchasing Staff'
    WHEN 'manager@gmail.com' THEN 'Manager'
    WHEN 'finance@gmail.com' THEN 'Finance'
    ELSE initcap(split_part(lower(trim(u.email)), '@', 1))
  END,
  CASE lower(trim(u.email))
    WHEN 'admin@gmail.com' THEN 'admin'
    WHEN 'inventorystaff@gmail.com' THEN 'inventory-staff'
    WHEN 'purchasing@gmail.com' THEN 'purchasing'
    WHEN 'manager@gmail.com' THEN 'manager'
    WHEN 'finance@gmail.com' THEN 'finance'
    ELSE 'inventory-staff'
  END,
  'seed'
FROM auth.users AS u
WHERE lower(trim(u.email)) IN (
  'admin@gmail.com',
  'inventorystaff@gmail.com',
  'purchasing@gmail.com',
  'manager@gmail.com',
  'finance@gmail.com'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  source = EXCLUDED.source,
  updated_at = now();

-- Hint when Auth users are missing (INSERT above affects 0 rows).
DO $$
DECLARE
  auth_n int;
  prof_n int;
BEGIN
  SELECT COUNT(*) INTO auth_n
  FROM auth.users
  WHERE lower(trim(email)) IN (
    'admin@gmail.com',
    'inventorystaff@gmail.com',
    'purchasing@gmail.com',
    'manager@gmail.com',
    'finance@gmail.com'
  );

  SELECT COUNT(*) INTO prof_n
  FROM public.profiles
  WHERE lower(trim(email)) IN (
    'admin@gmail.com',
    'inventorystaff@gmail.com',
    'purchasing@gmail.com',
    'manager@gmail.com',
    'finance@gmail.com'
  );

  IF auth_n = 0 THEN
    RAISE WARNING
      'demo_accounts.sql: no demo emails in auth.users. Add all five users in Authentication → Users (see header), then run this script again.';
  ELSIF auth_n < 5 THEN
    RAISE NOTICE
      'demo_accounts.sql: % of 5 demo emails exist in auth.users; add the rest, then re-run.', auth_n;
  END IF;

  IF auth_n > 0 AND prof_n < auth_n THEN
    RAISE WARNING
      'demo_accounts.sql: % profile row(s) for demo emails but % auth user(s). Check RLS on profiles or re-run after fixing 13_row_level_security.sql.', prof_n, auth_n;
  END IF;
END;
$$;
