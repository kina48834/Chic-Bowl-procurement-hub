Categorized SQL for the procurement app (mirrors src/procurement/* and src/auth/*).

This repo targets hosted Supabase (apply SQL in the dashboard or `psql`). There is no `supabase/config.toml`; if you need the local Supabase CLI stack (`supabase start`), run `supabase init` in the project root to generate one.

The Vite app (local or Vercel) talks to Supabase only via `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`; procurement + profiles use the same client (`src/lib/supabaseClient.ts`, RLS in `13_row_level_security.sql`). Post-login navigation is implemented in the SPA (`src/auth/role-access.ts`), not in SQL.

When both `VITE_*` vars are set, all role actions in `ProcurementProvider` persist to Postgres (serialized full-state sync per change); localStorage procurement snapshot is cleared after a successful load so data stays single-sourced in the database.

Env: `.env.example` and `.env.local` use the same variables in the same order; copy the example to `.env.local` and set secrets (publishable key, DB password). Only `VITE_*` is exposed to the browser. On Vercel, define the same `VITE_*` variables in Project Settings → Environment Variables.

Run order (numeric):
  01_extensions.sql
  02_profiles.sql
  03_app_settings.sql
  04_suppliers.sql — referenced by POs/payments (RESTRICT); app sync skips deleting suppliers still referenced
  05_purchase_requests.sql
  06_quotations.sql
  07_purchase_orders.sql
  08_deliveries.sql
  09_inventory_lines.sql — stock catalog; category CHECK matches purchase_requests + SPA stock-catalog.ts; RLS write-limited (see 13); app skips inventory sync for non-catalog roles on persist
  10_budget_requests.sql
  11_payments.sql
  12_audit_log.sql — SPA retains newest ~120 rows (see src/procurement/audit-config.ts); admin can clear/trim at /admin/audit-log
  13_row_level_security.sql
  14_profile_account_ref.sql — adds profiles.account_ref for existing DBs (included in fresh 02_profiles)
  15_admin_provision_notes.sql — documents how Admin → Add user syncs to auth.users + public.profiles (harmless SELECT)
  16_procurement_workflow_migration.sql — additive columns for PR reasons, PO finance review, delivery receipt/rejection, inventory reorder thresholds, payment holds (run on existing DBs after 01–15)
  17_audit_log_indexes.sql — indexes on audit_log.action and actor email (optional; speeds audit / reports)
  18_app_supabase_connectivity_notes.sql — how the SPA syncs to Postgres via REST; troubleshooting “Failed to fetch” (harmless SELECT)
  19_public_api_grants.sql — GRANT … TO anon, authenticated on all hub tables (fixes “permission denied for table” from PostgREST; run after tables + 13)
  20_rls_session_notes.sql — why JWT/session matters for RLS + authenticated role (harmless SELECT)

Demo accounts (single file — Chic Bowl: auth.users + identities + public.profiles):
  seed/demo_accounts.sql — creates/updates five demo Auth users (pgcrypto bcrypt), email identities, then upserts profiles; passwords match src/auth/seed-users.ts

Seeds (optional; also embedded in ALL.sql):
  seed/demo_procurement_data.sql — truncates operational tables, inserts app_settings + one bootstrap supplier (no mock PO/PR/catalog)
  seed/demo_accounts.sql — run after 02_profiles (+ 13 RLS); creates five role accounts + profiles (or use Admin → User management)

Merged copy (copy-paste): from repo root run `npm run supabase:merge` (runs `supabase/merge-sql.sh`).
  The script fails if any `01_*.sql` … `20_*.sql` is missing and writes a `-- Manifest` comment list at the top of `ALL.sql`.
  ../ALL.sql — 01–20 + demo procurement + demo_accounts (demo_accounts seeds Auth + profiles)

Troubleshooting (still broken after `npm run build`?)
  • Console: `42501` / `new row violates row-level security` on `payments` (or another hub table)
    → re-run `13_row_level_security.sql` in SQL Editor (drops stray policies, adds explicit INSERT/UPDATE
    policies per table). Ensure `19_public_api_grants.sql` ran and you are signed in (JWT role `authenticated`).
  • Build/lint only affect the Vite app. Supabase is fixed by running SQL in the dashboard and
    by creating users under Authentication — not by npm.
  • Browser console: `TypeError: Failed to fetch` when saving = network or env (wrong URL/key, offline,
    embedded preview blocking *.supabase.co). Not an RLS/SQL error. See `18_app_supabase_connectivity_notes.sql`
    and use a normal browser tab with valid `VITE_SUPABASE_*` in `.env.local`.
  • SQL Editor / API: `permission denied for table` = run `19_public_api_grants.sql` (or the full `ALL.sql` schema sections / merge)
    so `anon` and `authenticated` can execute DML; RLS still applies.
  • 42P17 infinite recursion on public.profiles: run the full `13_row_level_security.sql` in SQL
    Editor (is_profile_admin() uses SECURITY DEFINER + row_security off; all profiles policies
    are dropped and recreated).
  • Invalid login credentials (demo emails): run `seed/demo_accounts.sql` in the SQL Editor (creates
    Auth users + identities + profiles). Ensure pgcrypto can be created; check Messages for warnings.
  • inventory_lines_category_check fails on ALTER: a row’s category is outside the same list as
    purchase_requests—update it to a valid slug (see 09_inventory_lines.sql) or align with the app’s
    src/procurement/stock-catalog.ts.
