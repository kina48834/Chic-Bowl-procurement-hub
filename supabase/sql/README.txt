Categorized SQL for the procurement app (mirrors src/procurement/* and src/auth/*).

This repo targets hosted Supabase (apply SQL in the dashboard or `psql`). There is no `supabase/config.toml`; if you need the local Supabase CLI stack (`supabase start`), run `supabase init` in the project root to generate one.

The Vite app (local or Vercel) talks to Supabase only via `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`; procurement + profiles use the same client (`src/lib/supabaseClient.ts`, RLS in `13_row_level_security.sql`).

Env: `.env.example` and `.env.local` use the same variables in the same order; copy the example to `.env.local` and set secrets (publishable key, DB password). Only `VITE_*` is exposed to the browser. On Vercel, define the same `VITE_*` variables in Project Settings → Environment Variables.

Run order (numeric):
  01_extensions.sql
  02_profiles.sql
  03_app_settings.sql
  04_suppliers.sql
  05_purchase_requests.sql
  06_quotations.sql
  07_purchase_orders.sql
  08_deliveries.sql
  09_inventory_lines.sql — stock catalog; category CHECK matches purchase_requests + SPA stock-catalog.ts
  10_budget_requests.sql
  11_payments.sql
  12_audit_log.sql
  13_row_level_security.sql
  14_profile_account_ref.sql — adds profiles.account_ref for existing DBs (included in fresh 02_profiles)
  15_admin_provision_notes.sql — documents how Admin → Add user syncs to auth.users + public.profiles (harmless SELECT)

Demo accounts (single file — Chic Bowl seed emails, Auth steps, profile upsert, notices):
  seed/demo_accounts.sql — /login uses email + password only (no role shortcut buttons)

Seeds (optional; also embedded in ALL.sql):
  seed/demo_procurement_data.sql — truncates operational tables, loads sample rows (app_settings.system_notes mentions /admin/reports, /admin/inventory, /manager/inventory)
  seed/demo_accounts.sql — see above (requires auth.users rows from Dashboard → Authentication)

Merged copies (copy-paste): from repo root run `npm run supabase:merge` (runs `supabase/merge-sql.sh`)
  ../ALL_SCHEMA.sql — numbered SQL 01–15 (file 15 is documentation-only)
  ../ALL.sql — 01–15 + demo procurement + demo_accounts (create Auth users before profile upsert)

Troubleshooting (still broken after `npm run build`?)
  • Build/lint only affect the Vite app. Supabase is fixed by running SQL in the dashboard and
    by creating users under Authentication — not by npm.
  • 42P17 infinite recursion on public.profiles: run the full `13_row_level_security.sql` in SQL
    Editor (is_profile_admin() uses SECURITY DEFINER + row_security off; all profiles policies
    are dropped and recreated).
  • Invalid login credentials: follow STEP 1 in `seed/demo_accounts.sql`, then run that file
    (STEP 2). Running the script without Auth users inserts nothing — check the script warnings.
  • inventory_lines_category_check fails on ALTER: a row’s category is outside the same list as
    purchase_requests—update it to a valid slug (see 09_inventory_lines.sql) or align with the app’s
    src/procurement/stock-catalog.ts.
