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
