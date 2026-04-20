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
