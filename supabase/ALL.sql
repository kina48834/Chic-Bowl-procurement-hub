-- ALL.sql — full bundle: schema (01–20) + demo procurement seed + demo account profiles.
-- Regenerate: npm run supabase:merge
--
-- Before running:
--   • Demo logins: after schema, run seed/demo_accounts.sql — it creates auth.users + auth.identities
--     (bcrypt passwords) and upserts public.profiles. No manual Authentication → Users step required.
--
-- Sections in order:
--   1) 01_extensions … 20_rls_session_notes (19 grants; 20 JWT/RLS notes)
--   2) seed/demo_procurement_data.sql — truncates operational tables, loads sample rows
--   3) seed/demo_accounts.sql — demo Auth users + identities + public.profiles
--

-- Manifest — numbered files concatenated below (merge script fails if any 01–20 is missing):
--   • 01_extensions.sql
--   • 02_profiles.sql
--   • 03_app_settings.sql
--   • 04_suppliers.sql
--   • 05_purchase_requests.sql
--   • 06_quotations.sql
--   • 07_purchase_orders.sql
--   • 08_deliveries.sql
--   • 09_inventory_lines.sql
--   • 10_budget_requests.sql
--   • 11_payments.sql
--   • 12_audit_log.sql
--   • 13_row_level_security.sql
--   • 14_profile_account_ref.sql
--   • 15_admin_provision_notes.sql
--   • 16_procurement_workflow_migration.sql
--   • 17_audit_log_indexes.sql
--   • 18_app_supabase_connectivity_notes.sql
--   • 19_public_api_grants.sql
--   • 20_rls_session_notes.sql
-- ALL.sql additionally appends: seed/demo_procurement_data.sql, seed/demo_accounts.sql
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
  'Procurement Hub',
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

COMMENT ON TABLE public.suppliers IS
  'Vendor master; mirrors Supplier type. purchase_orders.supplier_id and payments.supplier_id use ON DELETE RESTRICT — the SPA uses FK-safe orphan cleanup (src/procurement/supabase/sync.ts deleteSupplierOrphansSafe) so persist never fails when adding suppliers while seed POs still reference seed suppliers.';

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
  'Inventory staff/admin stock catalog; purchase_orders.inventory_catalog_id may reference id; mirrors InventoryLine in the app. RLS (13) limits writes to inventory-staff + admin; the SPA skips inventory_lines sync for other roles so budgets/POs/etc. still persist.';

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

COMMENT ON TABLE public.budget_requests IS
  'Finance budget review; mirrors BudgetRequest. Same RLS as other hub tables (authenticated full access in 13_row_level_security.sql). If saves disappear on refresh, fix the SPA session/persist gate — not this DDL.';

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

COMMENT ON TABLE public.audit_log IS
  'Procurement audit trail; mirrors AuditEntry. The SPA keeps at most ~120 newest events (see src/procurement/audit-config.ts AUDIT_LOG_MAX_ENTRIES) and syncs that slice to Postgres. Admins can clear or trim the log from /admin/audit-log to avoid unbounded growth; empty log deletes all rows on next persist.';

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

-- Hub operational tables: full CRUD for role `authenticated` (JWT from the signed-in user).
-- Use explicit SELECT / INSERT / UPDATE / DELETE policies instead of FOR ALL so PostgREST
-- upserts and multi-table sync (see src/procurement/supabase/sync.ts) do not hit driver
-- edge cases (e.g. 42501 on payments).
DO $$
DECLARE
  t text;
  r record;
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
    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'hub_' || t || '_select',
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
      'hub_' || t || '_insert',
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
      'hub_' || t || '_update',
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)',
      'hub_' || t || '_delete',
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

-- Note: src/procurement/supabase/sync.ts skips inventory_lines DELETE/UPSERT for other roles so
-- finance/manager/purchasing can still persist POs, budgets, payments, etc. without RLS aborting the whole batch.

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

-- ===== 17_audit_log_indexes.sql =====
-- 17_audit_log_indexes.sql — reporting helpers for audit trail (optional migration).
-- App writes audit_log on procurement actions (e.g. PR approved); indexes speed Admin audit UI + reports.

CREATE INDEX IF NOT EXISTS audit_log_action_idx ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS audit_log_actor_lower_idx ON public.audit_log (lower(actor_email));

COMMENT ON INDEX public.audit_log_action_idx IS 'Filter audit rows by action (e.g. PR approved)';
COMMENT ON INDEX public.audit_log_actor_lower_idx IS 'Filter audit rows by actor email';

-- ===== 18_app_supabase_connectivity_notes.sql =====
-- 18_app_supabase_connectivity_notes.sql — documentation only (no DDL).
-- Aligns with: src/lib/supabaseClient.ts, src/procurement/supabase/sync.ts,
--             src/procurement/ProcurementProvider.tsx, supabase/sql/13_row_level_security.sql
--
-- How the browser talks to this schema
--   • The Vite SPA never opens a raw Postgres connection. It uses the Supabase REST API
--     (PostgREST) with the project URL + publishable (anon) key from the environment.
--   • Required env (see .env.example): VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
--     (trimmed in the app; URL should be https://<ref>.supabase.co or local http://127.0.0.1:54321).
--
-- How procurement data is written
--   • inventory_lines: RLS allows mutations only for inventory-staff + admin (13_row_level_security.sql).
--     persistProcurementToSupabase skips that table for other roles so one forbidden upsert does not abort budgets, POs, etc.
--   • When both VITE_* variables are set, ProcurementProvider loads all operational tables
--     in one round-trip (loadProcurementFromSupabase), then on each user action applies the
--     change in memory and runs persistProcurementToSupabase (serialized so writes do not overlap).
--   • Tables touched by sync (order varies): app_settings, suppliers, inventory_lines,
--     purchase_requests, quotations, purchase_orders, deliveries, budget_requests, payments, audit_log.
--   • After a successful cloud load, the browser clears the local procurement snapshot so Postgres
--     stays the single source of truth.
--
-- If changes “don’t save” or the console shows TypeError: Failed to fetch
--   • That is a network / client configuration issue, not missing SQL. Typical causes:
--       – Embedded IDE browser blocking requests to *.supabase.co (test in Safari/Chrome).
--       – Wrong, empty, or whitespace-only publishable key; URL typo; trailing-only URL edits.
--       – Project paused; offline; VPN/firewall; local Supabase URL while `supabase start` is not running.
--   • RLS or SQL errors usually return HTTP 4xx/5xx with a JSON message from PostgREST, not “Failed to fetch”.
--   • The app shows a header banner when sync fails (Supabase mode); fix env/network first, then re-run actions.
--
-- Fresh install checklist
--   • Run numbered SQL 01–17 for schema, RLS, and indexes; then 19_public_api_grants.sql (PostgREST privileges).
--   • seed/demo_accounts.sql — required for hosted sign-in: creates auth.users + public.profiles (RLS uses profiles.role).
--     Without a profile row for your auth user id, the app cannot resolve role / inventory RLS and sync may fail.
--   • seed/demo_procurement_data.sql — optional minimal bootstrap (one supplier + app_settings); truncates operational tables.
--   • Optional: 20_rls_session_notes.sql — documents JWT + authenticated role vs anon.
--   • Run 18 only if you want this SELECT in the editor.

SELECT 1 AS app_supabase_connectivity_notes_ok;

-- ===== 19_public_api_grants.sql =====
-- 19_public_api_grants.sql — table privileges for Supabase PostgREST (anon + authenticated).
-- Without these, the browser can get "permission denied for table …" even when RLS policies allow the row.
-- Run after creating tables (01–12) and before or after RLS (13). Safe to re-run.
--
-- RLS still enforces row access; GRANT only allows the role to attempt the statement.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.app_settings,
  public.suppliers,
  public.purchase_requests,
  public.quotations,
  public.purchase_orders,
  public.deliveries,
  public.inventory_lines,
  public.budget_requests,
  public.payments,
  public.audit_log
TO anon, authenticated;

-- Tables created later in the same session (e.g. new migrations) still need grants; this helps new objects:
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- ===== 20_rls_session_notes.sql =====
-- 20_rls_session_notes.sql — documentation only (harmless SELECT).
-- Aligns with: src/auth/auth-store.ts (whenCloudAuthHydrated), src/procurement/supabase/sync.ts,
--             supabase/sql/13_row_level_security.sql (policies TO authenticated).
--
-- PostgREST + anon key:
--   • Unauthenticated requests use DB role `anon`. Your RLS policies target `TO authenticated`,
--     so without a row grant + policy match, reads return no rows and writes fail.
--   • After signInWithPassword, the Supabase client attaches Authorization: Bearer <access_token>
--     so Postgres runs as `authenticated` and auth.uid() is set from the JWT.
--
-- App behaviour:
--   • The SPA waits for the first auth.getSession() refresh before protected routes and before
--     bulk procurement load/save so RLS does not run as anon by accident on a cold refresh.

SELECT 1 AS rls_session_notes_ok;

-- ===== seed/demo_procurement_data.sql =====
-- seed/demo_procurement_data.sql — minimal operational bootstrap (no mock PO/PR/catalog bulk).
-- Run after core schema (01–17) and public.profiles + RLS (02, 13). Safe to re-run: truncates operational tables only.
-- Demo Auth users stay in seed/demo_accounts.sql (run separately; not truncated here).
--
-- Inserts: app_settings row + exactly one supplier. All other operational tables empty.

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
  'Procurement Hub',
  'Data — Signed-in users read/write procurement tables in Postgres via the app (RLS + authenticated role).
Users — Create Auth users + public.profiles with seed/demo_accounts.sql or Admin → User management.
Env — The SPA needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY; restart the dev server after changing .env.local.
',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  system_notes = EXCLUDED.system_notes,
  last_override_note = EXCLUDED.last_override_note,
  updated_at = now();

INSERT INTO public.suppliers (id, name, contact, email, phone, pricing_notes, reliability, active) VALUES
  ('bootstrap-supplier-1', 'Primary supplier (edit or replace)', '', '', '', '', 3, true);

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

