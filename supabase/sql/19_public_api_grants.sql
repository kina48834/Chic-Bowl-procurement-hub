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
