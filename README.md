# Chic Bowl — Procurement hub

Role-based procurement workspace (inventory, purchasing, manager, finance, admin) built with **React**, **Vite**, **TypeScript**, **Tailwind**, and **Supabase** (Auth + Postgres). Client-side data sync uses the **publishable key** and **RLS**; no service role in the browser.

## Supabase (database + auth)

1. In the Supabase SQL Editor, run **`supabase/ALL_SCHEMA.sql`** (schema + RLS + notes), or **`supabase/ALL.sql`** for schema + demo data + profile upserts (see `supabase/sql/README.txt` for order and troubleshooting).
2. Apply **`supabase/sql/13_row_level_security.sql`** on hosted DB if you see `42P17` on `profiles`.
3. Create users under **Authentication → Users**; run **`supabase/sql/seed/demo_accounts.sql`** STEP 2 for `public.profiles` roles (details in that file and `15_admin_provision_notes.sql`).

Operational tables (`suppliers`, `purchase_orders`, `inventory_lines`, etc.) are read/written by **`src/procurement/supabase/sync.ts`** when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set.

## Vercel

1. Import this repo; Vercel should detect **Vite** (root `npm run build`, output **`dist`**).
2. **Environment variables** (Production and Preview): set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** to match your Supabase project (same as `.env.example`).
3. After the first deploy, open **Supabase → Authentication → URL configuration**: set **Site URL** to your Vercel URL (e.g. `https://your-app.vercel.app`) and add it to **Redirect URLs** so auth and client-side routing behave correctly.
4. **`vercel.json`** adds a SPA fallback so deep links (e.g. `/admin/dashboard`) load the app instead of 404.

## Local development

```bash
cp .env.example .env.local
# Edit .env.local — set VITE_SUPABASE_* for hosted mode, or leave publishable key empty for browser-only demo auth.

npm install
npm run dev
```

```bash
npm run build    # production build
npm run lint
npm run supabase:merge   # regenerate ALL.sql / ALL_SCHEMA.sql after editing supabase/sql
```

## Repository layout

| Path | Purpose |
|------|---------|
| `src/` | App source (auth, procurement, role UIs) |
| `src/lib/supabaseClient.ts` | Browser Supabase client; null if env missing |
| `supabase/sql/` | Numbered schema, RLS, seeds |
| `supabase/ALL.sql` | Merged bundle for SQL Editor |
