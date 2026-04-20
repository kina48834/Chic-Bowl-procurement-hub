#!/usr/bin/env bash
# Concatenate categorized SQL into merged files for Supabase SQL Editor copy-paste.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/supabase/sql"
OUT_SCHEMA="$ROOT/supabase/ALL_SCHEMA.sql"
OUT_ALL="$ROOT/supabase/ALL.sql"

emit_numbered_schema() {
  for n in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17; do
    for f in "$SQL"/${n}_*.sql; do
      if [[ -f "$f" ]]; then
        echo "-- ===== $(basename "$f") ====="
        cat "$f"
        echo
      fi
    done
  done
}

{
  cat << 'HEADER'
-- ALL_SCHEMA.sql — schema + RLS + migrations + notes (01–17). Files 15–16: 15 docs only, 16 workflow migration; 17 audit indexes.
-- Regenerate: npm run supabase:merge
--
-- For one file that also includes demo procurement data and demo profile upserts, use ALL.sql.
--

HEADER
  emit_numbered_schema
} > "$OUT_SCHEMA"

{
  cat << 'HEADER'
-- ALL.sql — full bundle: schema (01–17) + demo procurement seed + demo account profiles.
-- Regenerate: npm run supabase:merge
--
-- Before running:
--   • Demo logins: after schema, run seed/demo_accounts.sql — it creates auth.users + auth.identities
--     (bcrypt passwords) and upserts public.profiles. No manual Authentication → Users step required.
--
-- Sections in order:
--   1) 01_extensions … 17_audit_log_indexes (15 documents admin provision; 16 workflow migration; 17 audit indexes)
--   2) seed/demo_procurement_data.sql — truncates operational tables, loads sample rows
--   3) seed/demo_accounts.sql — demo Auth users + identities + public.profiles
--

HEADER
  emit_numbered_schema
  echo "-- ===== seed/demo_procurement_data.sql ====="
  cat "$SQL/seed/demo_procurement_data.sql"
  echo
  echo "-- ===== seed/demo_accounts.sql (Auth + profiles) ====="
  cat "$SQL/seed/demo_accounts.sql"
  echo
} > "$OUT_ALL"

echo "Wrote $OUT_SCHEMA and $OUT_ALL"
