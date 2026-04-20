# Chic Bowl — Procurement hub

**Canonical GitHub repository:** [kina48834/Chic-Bowl-procurement-hub](https://github.com/kina48834/Chic-Bowl-procurement-hub) — use this URL for clones, Vercel, and CI (ignore similarly named forks or old test repos).

Role-based procurement workspace (inventory, purchasing, manager, finance, admin) built with **React**, **Vite**, **TypeScript**, **Tailwind**, and **Supabase** (Auth + Postgres). Client-side data sync uses the **publishable key** and **RLS**; no service role in the browser.

## Supabase (database + auth)

1. In the Supabase SQL Editor, run **`supabase/ALL.sql`** for schema + demo procurement seed + demo Auth users, or run **`supabase/sql/01_*.sql` … `20_*.sql`** in numeric order if you want schema/RLS only (no table truncates from the demo seed). Details in **`supabase/sql/README.txt`**.
2. Apply **`supabase/sql/13_row_level_security.sql`** on hosted DB if you see `42P17` on `profiles`.
3. Create users under **Authentication → Users**; run **`supabase/sql/seed/demo_accounts.sql`** STEP 2 for `public.profiles` roles (details in that file and `15_admin_provision_notes.sql`).

The app is **Supabase-only**: both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are required (see **`SupabaseRequiredGate`**). Operational tables are read/written by **`src/procurement/supabase/sync.ts`** via PostgREST.

**Routing:** After sign-in (or visiting `/` while authenticated), users go straight to their role dashboard (e.g. `/admin/dashboard`, `/purchasing/dashboard`). The `/app` path remains as a redirect for old bookmarks.

## Vercel

1. Import this repo; Vercel should detect **Vite** (root `npm run build`, output **`dist`**).
2. **Environment variables** (Production and Preview): set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** to match your Supabase project (same as `.env.example`).
3. After the first deploy, open **Supabase → Authentication → URL configuration**: set **Site URL** to your Vercel URL (e.g. `https://your-app.vercel.app`) and add it to **Redirect URLs** so auth and client-side routing behave correctly.
4. **`vercel.json`** adds a SPA fallback so deep links (e.g. `/admin/dashboard`) load the app instead of 404.

## Local development

```bash
cp .env.example .env.local
# `.env.example` includes your project URL and publishable key; adjust if you change projects. Restart `npm run dev` after edits.

npm install
npm run dev
```

```bash
npm run build    # production build
npm run lint
npm run supabase:merge   # regenerate ALL.sql after editing supabase/sql
```

## Repository layout

| Path | Purpose |
|------|---------|
| `src/` | App source (auth, procurement, role UIs) |
| `src/roles/<role>/` | Per-role **MVC-style** layout: `models/` (nav + meta), `controllers/` (public exports / future hooks), `views/` (pages and feature folders) |
| `src/lib/supabaseClient.ts` | Browser Supabase client; null if env missing |
| `supabase/sql/` | Numbered schema, RLS, seeds |
| `supabase/ALL.sql` | Merged bundle for SQL Editor |
