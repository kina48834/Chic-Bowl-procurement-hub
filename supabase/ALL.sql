-- ALL.sql — full bundle: schema (01–15) + demo procurement seed + demo account profiles.
-- Regenerate: npm run supabase:merge
--
-- Before running:
--   • Create Auth users (Supabase Dashboard → Authentication) for the demo emails you need,
--     OR run the schema + procurement sections first and create users before the profiles section applies.
--
-- Sections in order:
--   1) 01_extensions … 15_admin_provision_notes (15 documents admin provision; demo Auth in seed/demo_accounts.sql)
--   2) seed/demo_procurement_data.sql — truncates operational tables, loads sample rows
--   3) seed/demo_accounts.sql — upserts public.profiles (joins auth.users by email)
--

-- ===== 01_extensions.sql =====
-- 01_extensions.sql — optional database extensions (Supabase has most pre-enabled).
-- gen_random_uuid() is available without extra extensions on Supabase.

-- Uncomment if you need case-insensitive email uniqueness at the DB layer:
-- CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

-- ===== 02_profiles.sql =====
-- 02_profiles.sql — app identity & roles (links to auth.users).
-- Mirrors src/auth/types.ts (SessionUser + role).

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  account_ref text NOT NULL DEFAULT (gen_random_uuid()::text) UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (
    role IN (
      'admin',
      'finance',
      'manager',
      'inventory-staff',
      'purchasing'
    )
  ),
  source text NOT NULL DEFAULT 'provisioned' CHECK (source IN ('seed', 'registration', 'provisioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_idx ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- Auto-create a profile row when a user signs up via Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
  meta_role text;
  meta_name text;
BEGIN
  meta_role := COALESCE(NEW.raw_user_meta_data ->> 'role', '');
  meta_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', '');

  r := CASE lower(trim(meta_role))
    WHEN 'admin' THEN 'admin'
    WHEN 'finance' THEN 'finance'
    WHEN 'manager' THEN 'manager'
    WHEN 'inventory-staff' THEN 'inventory-staff'
    WHEN 'purchasing' THEN 'purchasing'
    ELSE 'inventory-staff'
  END;

  INSERT INTO public.profiles (id, email, display_name, role, source)
  VALUES (
    NEW.id,
    lower(trim(NEW.email)),
    COALESCE(NULLIF(trim(meta_name), ''), initcap(split_part(lower(trim(NEW.email)), '@', 1))),
    r,
    'registration'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE public.profiles IS 'Application user profile; mirrors RoleId in src/shared/types/nav.ts';
COMMENT ON COLUMN public.profiles.account_ref IS 'Random public account id for display; distinct from auth.users id.';

-- Admin UI (User management → Add user): when VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
-- are set, the app creates auth.users via signUp, then updates this table (role, display_name, source).
-- Without both env vars, provisioning is local-browser only (see 15_admin_provision_notes.sql).
-- Passwords are never stored in this table; they are handled by Supabase Auth (auth.users) or local demo storage.

-- ===== 03_app_settings.sql =====
-- 03_app_settings.sql — singleton settings (mirrors AppSettings in src/procurement/types.ts).

CREATE TABLE IF NOT EXISTS public.app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL DEFAULT '',
  system_notes text NOT NULL DEFAULT '',
  last_override_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id, company_name, system_notes, last_override_note)
VALUES (
  1,
  'Chic Bowl by 3rd Jen Kitchens',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.app_settings IS 'Single-row app configuration; mirrors ProcurementState.settings';

-- ===== 04_suppliers.sql =====
-- 04_suppliers.sql — suppliers (mirrors Supplier in src/procurement/types.ts).

CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  pricing_notes text NOT NULL DEFAULT '',
  reliability smallint NOT NULL CHECK (reliability BETWEEN 1 AND 5),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_active_idx ON public.suppliers (active) WHERE active = true;

COMMENT ON TABLE public.suppliers IS 'Vendor master; mirrors Supplier type';

-- ===== 05_purchase_requests.sql =====
-- 05_purchase_requests.sql — purchase requests (mirrors PurchaseRequest).

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (
    category IN (
      'chicken',
      'ingredients',
      'packaging',
      'equipment',
      'beverages',
      'cleaning',
      'frozen',
      'dry_goods',
      'other'
    )
  ),
  description text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by_email text NOT NULL,
  created_at timestamptz NOT NULL,
  reviewed_at timestamptz,
  review_note text
);

CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON public.purchase_requests (status);
CREATE INDEX IF NOT EXISTS purchase_requests_requested_by_idx ON public.purchase_requests (lower(requested_by_email));

COMMENT ON TABLE public.purchase_requests IS 'PR workflow; mirrors PurchaseRequest';

-- ===== 06_quotations.sql =====
-- 06_quotations.sql — supplier quotations (mirrors Quotation).

CREATE TABLE IF NOT EXISTS public.quotations (
  id text PRIMARY KEY,
  supplier_id text NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
  title text NOT NULL,
  price numeric NOT NULL,
  quality_note text NOT NULL DEFAULT '',
  delivery_terms text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS quotations_supplier_id_idx ON public.quotations (supplier_id);

COMMENT ON TABLE public.quotations IS 'RFQ / quotes; mirrors Quotation';

-- ===== 07_purchase_orders.sql =====
-- 07_purchase_orders.sql — purchase orders (mirrors PurchaseOrder).

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id text PRIMARY KEY,
  purchase_request_id text NOT NULL REFERENCES public.purchase_requests (id) ON DELETE RESTRICT,
  supplier_id text NOT NULL REFERENCES public.suppliers (id) ON DELETE RESTRICT,
  items_summary text NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL CHECK (
    status IN (
      'draft',
      'pending_approval',
      'approved',
      'sent',
      'shipped',
      'completed',
      'rejected'
    )
  ),
  created_at timestamptz NOT NULL,
  sent_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  manager_note text,
  inventory_catalog_id text
);

CREATE INDEX IF NOT EXISTS purchase_orders_pr_idx ON public.purchase_orders (purchase_request_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_idx ON public.purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON public.purchase_orders (status);

COMMENT ON TABLE public.purchase_orders IS 'PO lifecycle; inventory_catalog_id links to inventory_lines when set';

-- ===== 08_deliveries.sql =====
-- 08_deliveries.sql — receiving / deliveries (mirrors Delivery).

CREATE TABLE IF NOT EXISTS public.deliveries (
  id text PRIMARY KEY,
  purchase_order_id text NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  quantity_expected numeric NOT NULL,
  quantity_received numeric NOT NULL,
  quality_notes text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS deliveries_po_idx ON public.deliveries (purchase_order_id);

COMMENT ON TABLE public.deliveries IS 'Goods receipt; mirrors Delivery';

-- ===== 09_inventory_lines.sql =====
-- 09_inventory_lines.sql — stock catalog + on-hand lines (mirrors src/procurement/types.ts InventoryLine).
--
-- SPA (Vite): same catalog UX at /manager/inventory and /admin/inventory (shared data via ProcurementProvider).
-- Executive cross-cuts (PO book, spend by supplier, catalog counts) live at /admin/reports.
-- Category text must stay aligned with public.purchase_requests (05_purchase_requests.sql) and
-- src/procurement/stock-catalog.ts (PRCategory) so PRs, POs, and the stock catalog dropdowns stay one vocabulary.

CREATE TABLE IF NOT EXISTS public.inventory_lines (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  last_updated timestamptz NOT NULL,
  source_delivery_id text
);

CREATE INDEX IF NOT EXISTS inventory_lines_category_idx ON public.inventory_lines (category);

-- Idempotent: (re)applies if the table already existed from an older export without this check.
ALTER TABLE public.inventory_lines DROP CONSTRAINT IF EXISTS inventory_lines_category_check;
ALTER TABLE public.inventory_lines ADD CONSTRAINT inventory_lines_category_check CHECK (
  category IN (
    'chicken',
    'ingredients',
    'packaging',
    'equipment',
    'beverages',
    'cleaning',
    'frozen',
    'dry_goods',
    'other'
  )
);

COMMENT ON TABLE public.inventory_lines IS
  'Manager/admin stock catalog; purchase_orders.inventory_catalog_id may reference id; mirrors InventoryLine in the app.';

COMMENT ON COLUMN public.inventory_lines.category IS
  'Same closed set as purchase_requests.category (see 05_purchase_requests.sql); UI labels in src/procurement/stock-catalog.ts.';

COMMENT ON COLUMN public.inventory_lines.quantity IS
  'Baseline on-hand quantity shown as “On-hand” in Manager/Admin stock catalog screens.';

COMMENT ON COLUMN public.inventory_lines.source_delivery_id IS
  'Optional link to a receiving/delivery record when the app tracks provenance.';

-- Enforce PO → catalog FK after both tables exist.
ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_inventory_catalog_id_fkey;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_inventory_catalog_id_fkey
  FOREIGN KEY (inventory_catalog_id) REFERENCES public.inventory_lines (id) ON DELETE SET NULL;

-- ===== 10_budget_requests.sql =====
-- 10_budget_requests.sql — budget envelopes (mirrors BudgetRequest).

CREATE TABLE IF NOT EXISTS public.budget_requests (
  id text PRIMARY KEY,
  title text NOT NULL,
  amount numeric NOT NULL,
  purchase_request_id text REFERENCES public.purchase_requests (id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL,
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS budget_requests_status_idx ON public.budget_requests (status);

COMMENT ON TABLE public.budget_requests IS 'Finance budget review; mirrors BudgetRequest';

-- ===== 11_payments.sql =====
-- 11_payments.sql — supplier payments (mirrors Payment).

CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY,
  supplier_id text NOT NULL REFERENCES public.suppliers (id) ON DELETE RESTRICT,
  purchase_order_id text REFERENCES public.purchase_orders (id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid')),
  reference text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL,
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS payments_supplier_idx ON public.payments (supplier_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);

COMMENT ON TABLE public.payments IS 'AP / payments; mirrors Payment';

-- ===== 12_audit_log.sql =====
-- 12_audit_log.sql — audit trail (mirrors AuditEntry).

CREATE TABLE IF NOT EXISTS public.audit_log (
  id text PRIMARY KEY,
  at timestamptz NOT NULL,
  actor_email text NOT NULL,
  action text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS audit_log_at_idx ON public.audit_log (at DESC);

COMMENT ON TABLE public.audit_log IS 'Append-only style log; mirrors AuditEntry';

-- ===== 13_row_level_security.sql =====
-- 13_row_level_security.sql — RLS scaffolding (demo-friendly).
-- Tighten policies per role before production; service_role bypasses RLS in Supabase.
--
-- Admin policies must not read public.profiles in a way that re-triggers profiles RLS, or Postgres
-- returns 42P17 (infinite recursion). The helper below is SECURITY DEFINER and runs with
-- row_security = off so the existence check does not recurse.

CREATE OR REPLACE FUNCTION public.is_profile_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_profile_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_admin() TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Remove every existing policy on profiles (avoids duplicates / old recursive definitions).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END;
$$;

-- Profiles: each user reads/updates own row.
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Demo / internal hub: allow any signed-in user full CRUD on operational tables.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_settings',
    'suppliers',
    'purchase_requests',
    'quotations',
    'purchase_orders',
    'deliveries',
    'inventory_lines',
    'budget_requests',
    'payments',
    'audit_log'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END;
$$;

-- Admins: full profile visibility (is_profile_admin bypasses RLS on the inner read).
CREATE POLICY "profiles_admin_select_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_profile_admin());

CREATE POLICY "profiles_admin_update_all" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (true);

CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_profile_admin());

-- ===== 14_profile_account_ref.sql =====
-- 14_profile_account_ref.sql — add public account_ref for profiles created before this column existed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_ref text;

UPDATE public.profiles
SET account_ref = gen_random_uuid()::text
WHERE account_ref IS NULL OR btrim(account_ref) = '';

ALTER TABLE public.profiles
  ALTER COLUMN account_ref SET DEFAULT (gen_random_uuid()::text),
  ALTER COLUMN account_ref SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_account_ref_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_ref_key UNIQUE (account_ref);
  END IF;
END;
$$;

COMMENT ON COLUMN public.profiles.account_ref IS 'Random public account id for display; distinct from auth.users id.';

-- ===== 15_admin_provision_notes.sql =====
-- 15_admin_provision_notes.sql — documentation only (no-op for the database).
-- Safe to run in SQL Editor; creates no objects.
--
-- Frontend prerequisite (Vite):
--   • .env.local matches .env.example (same keys/order): General (SUPABASE_PROJECT_*), API
--     (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY), optional DATABASE_URL.
--   • Both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set. If either is missing,
--     the app runs in local-only mode:
--     "Add user" stores accounts in the browser only—nothing is written to auth.users or
--     public.profiles on Supabase.
--
-- Admin → User management → "Add user" (with both VITE_SUPABASE_* vars set):
--   1) The app calls supabase.auth.signUp with email, password, and user_metadata
--      (display_name, role).
--   2) Supabase inserts into auth.users; trigger public.handle_new_user() inserts
--      into public.profiles (id = auth user id, default account_ref, role from metadata).
--   3) The app restores the admin session, then UPDATEs public.profiles for the new id
--      (display_name, role, source = provisioned) so values match the admin’s choices.
--   4) If restore fails, the app sends you to /login and preserves the current URL (e.g.
--      /admin/user-management) so after you sign in as admin again you return to User management—not /app.
--
-- Supabase project requirements:
--   • Authentication → Providers → Email: enabled
--   • Allow new users to sign up (or sign-ups will fail from the browser)
--   • “Confirm email”: if enabled when the user is created, signInWithPassword returns “Email not confirmed” until
--     they confirm via link OR you manually confirm under Authentication → Users (⋯ / Confirm user).
--     Turning “Confirm email” off later does not set email_confirmed_at on existing users—those accounts still need
--     one manual confirm (or delete and re-create the Auth user). For internal demos, keep Confirm email off before
--     provisioning, or confirm each user in the Users table after creation.
--
-- New users appear in Dashboard → Authentication → Users and in Admin → User management
-- after the accounts list refreshes (public.profiles is the source for roles in the app).
--
-- Related SPA routes (hosted + local): /admin/user-management (provision), /admin/inventory and
-- /manager/inventory (shared stock catalog → inventory_lines), /admin/reports (cross-cutting KPIs).
--
-- Passwords:
--   • public.profiles has no password column; credentials are stored only in auth.users (GoTrue).
--   • The app does not enforce a minimum length in code; Supabase Auth may still reject passwords
--     that violate hosted project rules (weak password, length, etc.)—the API error is shown in the UI.

-- Demo Chic Bowl sign-in (emails/passwords + profile upsert): seed/demo_accounts.sql only.

SELECT 1 AS admin_user_management_uses_auth_signup_and_public_profiles;

-- ===== seed/demo_procurement_data.sql =====
-- seed/demo_procurement_data.sql — demo procurement rows (mirrors src/procurement/seed.ts).
-- Run after core schema (supabase/sql/01–13). Safe to re-run: truncates operational tables only.
--
-- SPA alignment (same bundle as npm run dev):
--   • Stock catalog CRUD: /manager/inventory and /admin/inventory (shared inventory_lines).
--   • Executive KPIs / spend / governance: /admin/reports.
--   • inventory_lines.category values must satisfy 09_inventory_lines.sql (same list as purchase_requests).

BEGIN;

TRUNCATE TABLE
  public.audit_log,
  public.payments,
  public.deliveries,
  public.purchase_orders,
  public.quotations,
  public.budget_requests,
  public.purchase_requests,
  public.inventory_lines,
  public.suppliers
CASCADE;

INSERT INTO public.app_settings (id, company_name, system_notes, last_override_note)
VALUES (
  1,
  'Chic Bowl by 3rd Jen Kitchens',
  'Access — New accounts are created only in Admin → User management (email + initial password). There is no public self-service registration; visiting /register redirects to Sign in.
Demo sign-in — Hosted: passwords per email are in seed/demo_accounts.sql STEP 1 (same as src/auth/seed-users.ts). The /login page is email + password only (no on-screen credential list). Create or reset Auth users, then run that file for profiles.
Data — When using Supabase, operational data lives in Postgres; configure RLS for your environment.
Currency — Amounts display with consistent formatting across workspaces.
Stock catalog — Master SKUs: /manager/inventory and /admin/inventory (shared data; delete blocked while a PO references a line). Categories match purchase_requests.
Reports — Admin executive snapshot: /admin/reports (PO book, suppliers, audit peek, governance tiles).
Support — Each workspace page includes an embedded process guide for the end-to-end flow.',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  system_notes = EXCLUDED.system_notes,
  last_override_note = EXCLUDED.last_override_note,
  updated_at = now();

INSERT INTO public.suppliers (id, name, contact, email, phone, pricing_notes, reliability, active) VALUES
  ('seed-supplier-1', 'Fresh Valley Poultry', 'Sam Rivera', 'orders@freshvalley.example', '+63 917 555 0101', 'Whole chicken tier pricing; weekly index.', 4, true),
  ('seed-supplier-2', 'PackRight Supplies', 'Jordan Lee', 'sales@packright.example', '+63 917 555 0102', 'Biodegradable trays — MOQ 500.', 5, true);

INSERT INTO public.purchase_requests (id, category, description, quantity, unit, status, requested_by_email, created_at, reviewed_at, review_note) VALUES
  ('seed-pr-pending', 'chicken', 'Whole chicken — weekly kitchen run', 120, 'kg', 'pending', 'inventorystaff@gmail.com', '2026-04-18T12:00:00.000Z', NULL, NULL),
  ('seed-pr-approved', 'packaging', 'Eco trays for retail line', 800, 'units', 'approved', 'inventorystaff@gmail.com', '2026-04-18T12:00:00.000Z', '2026-04-18T12:00:00.000Z', 'Approved for sourcing.');

INSERT INTO public.quotations (id, supplier_id, title, price, quality_note, delivery_terms, created_at) VALUES
  ('seed-qt-1', 'seed-supplier-2', 'Eco trays RFQ', 1840, 'Food-grade certified; samples on file.', 'FOB hub; 5 business days', '2026-04-18T12:00:00.000Z'),
  ('seed-qt-2', 'seed-supplier-1', 'Alternate tray quote', 2100, 'Heavier gauge', '2-week lead', '2026-04-18T12:00:00.000Z');

INSERT INTO public.purchase_orders (id, purchase_request_id, supplier_id, items_summary, total, status, created_at, sent_at, shipped_at, completed_at, manager_note, inventory_catalog_id) VALUES
  ('seed-po-draft', 'seed-pr-approved', 'seed-supplier-2', 'Eco trays × 800', 1840, 'draft', '2026-04-18T12:00:00.000Z', NULL, NULL, NULL, NULL, NULL);

INSERT INTO public.inventory_lines (id, name, category, quantity, unit, last_updated, source_delivery_id) VALUES
  ('inv-1', 'Frozen chicken portions', 'chicken', 340, 'kg', '2026-04-18T12:00:00.000Z', NULL),
  ('inv-2', 'Spice blend A', 'ingredients', 45, 'kg', '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.budget_requests (id, title, amount, purchase_request_id, status, notes, created_at, reviewed_at) VALUES
  ('seed-budget-1', 'Q2 packaging envelope', 25000, 'seed-pr-approved', 'pending', 'Rolling commitment for retail packaging.', '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.payments (id, supplier_id, purchase_order_id, amount, status, reference, created_at, paid_at) VALUES
  ('seed-pay-1', 'seed-supplier-1', NULL, 4200, 'pending', 'INV-FV-1044', '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.audit_log (id, at, actor_email, action, detail) VALUES
  ('seed-audit-1', '2026-04-18T12:00:00.000Z', 'system@seed', 'Seed', 'Demo procurement dataset loaded.');

COMMIT;

-- ===== seed/demo_accounts.sql (requires matching auth.users) =====
-- seed/demo_accounts.sql — SINGLE demo-account SQL for Chic Bowl by 3rd Jen Kitchens.
-- Upserts public.profiles for the five demo emails (mirrors src/auth/seed-users.ts + Sign in page).
-- The /login page is email + password only (no role shortcut buttons; no on-screen demo password list).
-- After sign-in, the app
-- redirects by profile role (admin → /admin/dashboard or /app; inventory-staff → /inventory/dashboard; etc.).
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

