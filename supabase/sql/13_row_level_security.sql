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
