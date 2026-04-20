-- ALL.sql — full bundle: schema (01–16) + demo procurement seed + demo account profiles.
-- Regenerate: npm run supabase:merge
--
-- Before running:
--   • Demo logins: after schema, run seed/demo_accounts.sql — it creates auth.users + auth.identities
--     (bcrypt passwords) and upserts public.profiles. No manual Authentication → Users step required.
--
-- Sections in order:
--   1) 01_extensions … 16_procurement_workflow_migration (15 documents admin provision; 16 additive workflow migration)
--   2) seed/demo_procurement_data.sql — truncates operational tables, loads sample rows
--   3) seed/demo_accounts.sql — demo Auth users + identities + public.profiles
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
  request_reason text NOT NULL DEFAULT '',
  quantity numeric NOT NULL,
  unit text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved')),
  requested_by_email text NOT NULL,
  created_at timestamptz NOT NULL,
  reviewed_at timestamptz,
  review_note text
);

CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON public.purchase_requests (status);
CREATE INDEX IF NOT EXISTS purchase_requests_requested_by_idx ON public.purchase_requests (lower(requested_by_email));

-- Existing databases: CREATE TABLE IF NOT EXISTS does not add new columns. Keep in sync with 16_procurement_workflow_migration.sql.
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS request_reason text NOT NULL DEFAULT '';

COMMENT ON TABLE public.purchase_requests IS 'PR workflow; mirrors PurchaseRequest';
COMMENT ON COLUMN public.purchase_requests.request_reason IS 'Why inventory needs the item; required in the app for traceability.';

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
      'returned_by_finance',
      'sent',
      'shipped',
      'waiting_replacement',
      'completed',
      'rejected'
    )
  ),
  created_at timestamptz NOT NULL,
  sent_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  manager_note text,
  finance_note text,
  inventory_catalog_id text
);

CREATE INDEX IF NOT EXISTS purchase_orders_pr_idx ON public.purchase_orders (purchase_request_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_idx ON public.purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON public.purchase_orders (status);

COMMENT ON TABLE public.purchase_orders IS 'PO lifecycle; inventory_catalog_id links to inventory_lines when set';
COMMENT ON COLUMN public.purchase_orders.finance_note IS 'Finance approval note or reason when returning PO to Purchasing.';
COMMENT ON COLUMN public.purchase_orders.status IS 'pending_approval = Finance queue; returned_by_finance = Purchasing must revise and resubmit.';

-- ===== 08_deliveries.sql =====
-- 08_deliveries.sql — receiving / deliveries (mirrors Delivery).

CREATE TABLE IF NOT EXISTS public.deliveries (
  id text PRIMARY KEY,
  purchase_order_id text NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  quantity_expected numeric NOT NULL,
  quantity_received numeric NOT NULL,
  quantity_rejected numeric NOT NULL DEFAULT 0,
  quality_notes text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (
    status IN ('pending', 'accepted', 'rejected', 'partially_accepted')
  ),
  rejection_item_name text,
  rejection_reason text,
  photo_urls text,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS deliveries_po_idx ON public.deliveries (purchase_order_id);

COMMENT ON TABLE public.deliveries IS 'Goods receipt; mirrors Delivery';
COMMENT ON COLUMN public.deliveries.quantity_received IS 'Quantity accepted into good stock (full or partial accept).';
COMMENT ON COLUMN public.deliveries.quantity_rejected IS 'Quantity rejected (damage, wrong item, etc.).';
COMMENT ON COLUMN public.deliveries.photo_urls IS 'Optional JSON array of image URLs for rejection reports.';

-- ===== 09_inventory_lines.sql =====
-- 09_inventory_lines.sql — stock catalog + on-hand lines (mirrors src/procurement/types.ts InventoryLine).
--
-- SPA (Vite): same catalog UX at /inventory/catalog and /admin/inventory (shared data via ProcurementProvider).
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
  reorder_threshold numeric NOT NULL DEFAULT 20,
  source_delivery_id text
);

CREATE INDEX IF NOT EXISTS inventory_lines_category_idx ON public.inventory_lines (category);

-- Idempotent: (re)applies if the table already existed from an older export without this check.
-- Normalize legacy categories (e.g. "received", mixed case, extra spaces) before adding the CHECK.
UPDATE public.inventory_lines
SET category = CASE
  WHEN lower(trim(category)) IN (
    'chicken',
    'ingredients',
    'packaging',
    'equipment',
    'beverages',
    'cleaning',
    'frozen',
    'dry_goods',
    'other'
  ) THEN lower(trim(category))
  ELSE 'other'
END;

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
  'Inventory staff/admin stock catalog; purchase_orders.inventory_catalog_id may reference id; mirrors InventoryLine in the app.';

COMMENT ON COLUMN public.inventory_lines.category IS
  'Same closed set as purchase_requests.category (see 05_purchase_requests.sql); UI labels in src/procurement/stock-catalog.ts.';

COMMENT ON COLUMN public.inventory_lines.quantity IS
  'Baseline on-hand quantity shown as “On-hand” in Inventory/Admin stock catalog screens.';

COMMENT ON COLUMN public.inventory_lines.reorder_threshold IS
  'When on-hand is at or below this value, the app shows a low-stock alert for Inventory Staff.';

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
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'on_hold')),
  reference text NOT NULL DEFAULT '',
  hold_reason text,
  created_at timestamptz NOT NULL,
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS payments_supplier_idx ON public.payments (supplier_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);

-- Existing databases: CREATE TABLE IF NOT EXISTS does not add new columns or widen CHECKs. Keep in sync with 16_procurement_workflow_migration.sql.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS hold_reason text;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (
  status IN ('pending', 'paid', 'on_hold')
);

COMMENT ON TABLE public.payments IS 'AP / payments; mirrors Payment';
COMMENT ON COLUMN public.payments.hold_reason IS 'Why payment is on hold (e.g. delivery rejected, awaiting replacement).';

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

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT role::text
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO service_role;

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

-- Demo / internal hub: allow any signed-in user full CRUD on operational tables
-- except inventory_lines (mutations there are restricted to inventory-staff/admin below).
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

DROP POLICY IF EXISTS "authenticated_full_access" ON public.inventory_lines;
DROP POLICY IF EXISTS "inventory_lines_select_authenticated" ON public.inventory_lines;
DROP POLICY IF EXISTS "inventory_lines_mutate_inventory_staff_admin" ON public.inventory_lines;

CREATE POLICY "inventory_lines_select_authenticated" ON public.inventory_lines
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "inventory_lines_mutate_inventory_staff_admin" ON public.inventory_lines
  FOR ALL TO authenticated
  USING (public.current_profile_role() IN ('inventory-staff', 'admin'))
  WITH CHECK (public.current_profile_role() IN ('inventory-staff', 'admin'));

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
-- Frontend prerequisite (Vite / Vercel):
--   • Local: `.env.local` matches `.env.example` (same keys/order): General (SUPABASE_PROJECT_*), API
--     (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY), optional DATABASE_URL.
--   • Vercel: set the same `VITE_SUPABASE_*` in Environment Variables; in Supabase → Authentication → URL
--     configuration, allow your production (and preview) origins so sign-in and redirects work.
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
--      /admin/user-management) so after you sign in as admin again you return there—not the default dashboard.
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
-- /inventory/catalog (shared stock catalog → inventory_lines), /admin/reports (cross-cutting KPIs).
--
-- Passwords:
--   • public.profiles has no password column; credentials are stored only in auth.users (GoTrue).
--   • The app does not enforce a minimum length in code; Supabase Auth may still reject passwords
--     that violate hosted project rules (weak password, length, etc.)—the API error is shown in the UI.

-- Demo Chic Bowl sign-in (emails/passwords + profile upsert): seed/demo_accounts.sql only.

SELECT 1 AS admin_user_management_uses_auth_signup_and_public_profiles;

-- ===== 16_procurement_workflow_migration.sql =====
-- 16_procurement_workflow_migration.sql — additive migration for existing databases that already ran 01–15.
-- Safe to re-run: uses IF NOT EXISTS / guarded ALTERs where possible.
--
-- After this file:
--   • Purchase requests: request_reason; status only pending|approved (legacy rejected rows become pending).
--   • Purchase orders: finance_note; status includes returned_by_finance, waiting_replacement.
--   • Deliveries: quantity_rejected, rejection fields, partially_accepted status.
--   • Inventory lines: reorder_threshold.
--   • Payments: on_hold, hold_reason.

-- ---- purchase_requests ----
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS request_reason text NOT NULL DEFAULT '';

ALTER TABLE public.purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_status_check;
UPDATE public.purchase_requests SET status = 'pending' WHERE status = 'rejected';
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_status_check CHECK (
  status IN ('pending', 'approved')
);

-- ---- purchase_orders ----
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS finance_note text;

ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_status_check CHECK (
  status IN (
    'draft',
    'pending_approval',
    'approved',
    'returned_by_finance',
    'sent',
    'shipped',
    'waiting_replacement',
    'completed',
    'rejected'
  )
);

-- ---- deliveries ----
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS quantity_rejected numeric NOT NULL DEFAULT 0;
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS rejection_item_name text;
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS photo_urls text;

UPDATE public.deliveries SET quantity_rejected = 0 WHERE quantity_rejected IS NULL;

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check CHECK (
  status IN ('pending', 'accepted', 'rejected', 'partially_accepted')
);

-- ---- inventory_lines ----
ALTER TABLE public.inventory_lines
  ADD COLUMN IF NOT EXISTS reorder_threshold numeric NOT NULL DEFAULT 20;

-- ---- payments ----
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS hold_reason text;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (
  status IN ('pending', 'paid', 'on_hold')
);

-- ===== seed/demo_procurement_data.sql =====
-- seed/demo_procurement_data.sql — demo procurement rows (mirrors src/procurement/seed.ts).
-- Run after core schema (supabase/sql/01–16). Safe to re-run: truncates operational tables only.
--
-- SPA alignment:
--   • Fixed stock catalog + low-stock thresholds: /inventory/catalog
--   • Finance PO approval: /finance/po-approvals
--   • Manager PR approval (approve only): /manager/approvals/requests

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
Demo sign-in — Hosted: run seed/demo_accounts.sql after schema (creates auth.users + identities + profiles; passwords match src/auth/seed-users.ts). The /login page is email + password only (no on-screen credential list).
Data — When using Supabase, operational data lives in Postgres; configure RLS for your environment.
Currency — Amounts display with consistent formatting across workspaces.
Stock catalog — Fixed master list in inventory_lines; low-stock alerts use reorder_threshold.
Workflow — Manager approves purchase requests only (no reject). Finance approves POs. Purchasing revises POs returned by Finance.
Reports — Admin executive snapshot: /admin/reports (PO book, suppliers, audit peek, governance tiles).
',
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

INSERT INTO public.purchase_requests (id, category, description, request_reason, quantity, unit, status, requested_by_email, created_at, reviewed_at, review_note) VALUES
  ('seed-pr-pending', 'chicken', 'Chicken breast — weekly production', 'Forecasted demand for grill line; current stock below reorder threshold.', 120, 'kg', 'pending', 'inventorystaff@gmail.com', '2026-04-18T12:00:00.000Z', NULL, NULL),
  ('seed-pr-approved', 'packaging', 'Paper bowls — retail line', 'Low stock alert from catalog; need buffer before weekend rush.', 800, 'units', 'approved', 'inventorystaff@gmail.com', '2026-04-18T12:00:00.000Z', '2026-04-18T12:00:00.000Z', 'Approved for sourcing.');

INSERT INTO public.quotations (id, supplier_id, title, price, quality_note, delivery_terms, created_at) VALUES
  ('seed-qt-1', 'seed-supplier-2', 'Eco trays RFQ', 1840, 'Food-grade certified; samples on file.', 'FOB hub; 5 business days', '2026-04-18T12:00:00.000Z'),
  ('seed-qt-2', 'seed-supplier-1', 'Alternate tray quote', 2100, 'Heavier gauge', '2-week lead', '2026-04-18T12:00:00.000Z');

INSERT INTO public.purchase_orders (id, purchase_request_id, supplier_id, items_summary, total, status, created_at, sent_at, shipped_at, completed_at, manager_note, finance_note, inventory_catalog_id) VALUES
  ('seed-po-draft', 'seed-pr-approved', 'seed-supplier-2', 'Paper bowls × 800', 1840, 'draft', '2026-04-18T12:00:00.000Z', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO public.inventory_lines (id, name, category, quantity, unit, last_updated, reorder_threshold, source_delivery_id) VALUES
  ('cat-chicken-breast', 'Chicken breast', 'chicken', 80, 'kg', '2026-04-18T12:00:00.000Z', 25, NULL),
  ('cat-flour', 'Flour', 'ingredients', 120, 'kg', '2026-04-18T12:00:00.000Z', 30, NULL),
  ('cat-cornstarch', 'Cornstarch', 'ingredients', 40, 'kg', '2026-04-18T12:00:00.000Z', 15, NULL),
  ('cat-fish-sauce', 'Fish sauce', 'ingredients', 24, 'L', '2026-04-18T12:00:00.000Z', 8, NULL),
  ('cat-oil', 'Cooking oil', 'ingredients', 60, 'L', '2026-04-18T12:00:00.000Z', 20, NULL),
  ('cat-pepper', 'Pepper', 'ingredients', 5, 'kg', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-soda', 'Soda (club / baking)', 'ingredients', 10, 'kg', '2026-04-18T12:00:00.000Z', 4, NULL),
  ('cat-nata', 'Nata de coco', 'ingredients', 15, 'kg', '2026-04-18T12:00:00.000Z', 5, NULL),
  ('cat-rice', 'Rice', 'ingredients', 200, 'kg', '2026-04-18T12:00:00.000Z', 50, NULL),
  ('cat-breadcrumbs', 'Breadcrumbs', 'ingredients', 25, 'kg', '2026-04-18T12:00:00.000Z', 10, NULL),
  ('cat-honey-butter', 'Honey butter sauce', 'ingredients', 8, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-teriyaki', 'Teriyaki sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-buffalo', 'Buffalo sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-soygarlic', 'Soy garlic sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-sweet-chili', 'Sweet chili sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-barbeque', 'Barbecue sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-parsley', 'Parsley', 'ingredients', 3, 'kg', '2026-04-18T12:00:00.000Z', 1, NULL),
  ('cat-green-apple', 'Green apple syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-lychee', 'Lychee syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-blueberry', 'Blueberry syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-strawberry', 'Strawberry syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-mango', 'Mango syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-lemon', 'Lemon syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-yakult', 'Yakult', 'beverages', 200, 'bottles', '2026-04-18T12:00:00.000Z', 48, NULL),
  ('cat-gloves', 'Disposable gloves', 'packaging', 40, 'boxes', '2026-04-18T12:00:00.000Z', 10, NULL),
  ('cat-plastic-wrap', 'Plastic wrap', 'packaging', 12, 'rolls', '2026-04-18T12:00:00.000Z', 4, NULL),
  ('cat-paper-bowl', 'Paper bowl', 'packaging', 2000, 'units', '2026-04-18T12:00:00.000Z', 400, NULL),
  ('cat-cup-12oz', '12 oz plastic cup', 'packaging', 3000, 'units', '2026-04-18T12:00:00.000Z', 600, NULL),
  ('cat-cup-16oz', '16 oz plastic cup', 'packaging', 2500, 'units', '2026-04-18T12:00:00.000Z', 500, NULL),
  ('cat-cup-22oz', '22 oz plastic cup', 'packaging', 2000, 'units', '2026-04-18T12:00:00.000Z', 400, NULL),
  ('cat-straw', 'Straws', 'packaging', 10000, 'units', '2026-04-18T12:00:00.000Z', 2000, NULL),
  ('cat-tape', 'Packaging tape', 'packaging', 24, 'rolls', '2026-04-18T12:00:00.000Z', 6, NULL),
  ('cat-gas', 'LPG / cooking gas', 'equipment', 4, 'tanks', '2026-04-18T12:00:00.000Z', 1, NULL);

INSERT INTO public.budget_requests (id, title, amount, purchase_request_id, status, notes, created_at, reviewed_at) VALUES
  ('seed-budget-1', 'Q2 packaging envelope', 25000, 'seed-pr-approved', 'pending', 'Rolling commitment for retail packaging.', '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.payments (id, supplier_id, purchase_order_id, amount, status, reference, hold_reason, created_at, paid_at) VALUES
  ('seed-pay-1', 'seed-supplier-1', NULL, 4200, 'pending', 'INV-FV-1044', NULL, '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.audit_log (id, at, actor_email, action, detail) VALUES
  ('seed-audit-1', '2026-04-18T12:00:00.000Z', 'system@seed', 'Seed', 'Demo procurement dataset loaded.');

COMMIT;

-- ===== seed/demo_accounts.sql (Auth + profiles) =====
-- seed/demo_accounts.sql — Chic Bowl demo Auth users + public.profiles (mirrors src/auth/seed-users.ts).
-- Run in Supabase SQL Editor (postgres role). Safe to re-run: resets passwords for the five demo emails,
-- ensures auth.identities rows, then upserts public.profiles.
--
-- Passwords / roles (same as STEP 1 table below; local SPA uses seed-users.ts when Supabase is unset):
--   admin@gmail.com            admin1919             admin
--   inventorystaff@gmail.com   inventorystaff1919    inventory-staff
--   purchasing@gmail.com       purchasing1919        purchasing
--   manager@gmail.com          manager1919           manager
--   finance@gmail.com          finance1919           finance
--
-- UUIDs for *new* inserts match src/auth/seed-users.ts. If a demo email already exists in auth.users,
-- that row is updated (password, confirmation, metadata) and its existing id is kept.
--
-- Requires: pgcrypto (below). RLS on profiles: run full 13_row_level_security.sql if you see policy errors.
--
-- =============================================================================
-- STEP 1 — pgcrypto + auth.users + auth.identities
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_instance uuid;
  rec RECORD;
  v_uid uuid;
BEGIN
  SELECT u.instance_id
  INTO v_instance
  FROM auth.users AS u
  WHERE u.instance_id IS NOT NULL
  LIMIT 1;

  IF v_instance IS NULL THEN
    v_instance := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  FOR rec IN
    SELECT * FROM (
      VALUES
        ('admin@gmail.com'::text, 'admin1919'::text, 'Admin'::text, 'admin'::text, 'f1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5061'::uuid),
        ('inventorystaff@gmail.com', 'inventorystaff1919', 'Inventory Staff', 'inventory-staff', 'f2b3c4d5-e6f7-48a9-b1c2-d3e4f5061728'::uuid),
        ('purchasing@gmail.com', 'purchasing1919', 'Purchasing Staff', 'purchasing', 'f3c4d5e6-f7a8-49b0-c2d3-e4f506172839'::uuid),
        ('manager@gmail.com', 'manager1919', 'Manager', 'manager', 'f4d5e6f7-a8b9-40c1-d3e4-f50617283940'::uuid),
        ('finance@gmail.com', 'finance1919', 'Finance', 'finance', 'f5e6f8a0-b9c1-41d2-a3f4-506172839415'::uuid)
    ) AS t(email, pw, dname, app_role, seed_id)
  LOOP
    SELECT u.id
    INTO v_uid
    FROM auth.users AS u
    WHERE lower(trim(u.email)) = lower(trim(rec.email));

    IF v_uid IS NULL THEN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      VALUES (
        v_instance,
        rec.seed_id,
        'authenticated',
        'authenticated',
        lower(trim(rec.email)),
        crypt(rec.pw, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('display_name', rec.dname, 'role', rec.app_role),
        now(),
        now()
      );
      v_uid := rec.seed_id;
    ELSE
      UPDATE auth.users
      SET
        encrypted_password = crypt(rec.pw, gen_salt('bf')),
        email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
        raw_app_meta_data = COALESCE(auth.users.raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = jsonb_build_object('display_name', rec.dname, 'role', rec.app_role),
        updated_at = now()
      WHERE id = v_uid;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM auth.identities AS i
      WHERE i.user_id = v_uid
        AND i.provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', lower(trim(rec.email))),
        'email',
        v_uid::text,
        now(),
        now(),
        now()
      );
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- STEP 2 — public.profiles (sync roles; matches app + RLS)
-- =============================================================================
-- handle_new_user() may have inserted a profile; this upserts display_name, role, source = seed.

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

-- =============================================================================
-- STEP 3 — diagnostics
-- =============================================================================
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

  IF auth_n < 5 THEN
    RAISE WARNING 'demo_accounts.sql: expected 5 demo auth users, found %. Check STEP 1 errors above.', auth_n;
  END IF;

  IF prof_n < 5 THEN
    RAISE WARNING 'demo_accounts.sql: expected 5 demo profiles, found %. Run 02_profiles + 13_row_level_security if inserts failed.', prof_n;
  END IF;

  RAISE NOTICE 'demo_accounts.sql: demo auth users = %, profiles = %.', auth_n, prof_n;
END;
$$;

