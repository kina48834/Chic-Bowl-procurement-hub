#!/usr/bin/env bash
# Concatenate categorized SQL into merged files for Supabase SQL Editor copy-paste.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/supabase/sql"
OUT_SCHEMA="$ROOT/supabase/ALL_SCHEMA.sql"
OUT_ALL="$ROOT/supabase/ALL.sql"

emit_numbered_schema() {
  for n in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15; do
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
-- ALL_SCHEMA.sql — schema + RLS + migrations + notes (01–15). File 15 is documentation-only.
-- Regenerate: npm run supabase:merge
--
-- For one file that also includes demo procurement data and demo profile upserts, use ALL.sql.
--

HEADER
  emit_numbered_schema
} > "$OUT_SCHEMA"

{
  cat << 'HEADER'
-- ALL.sql — full bundle: schema (01–15) + demo procurement seed + demo account profiles.
-- Regenerate: npm run supabase:merge
--
-- Before running:
--   • Create Auth users (Supabase Dashboard → Authentication) for the demo emails you need,
--     OR run the schema + procurement sections first and create users before the profiles section applies.
--
-- Sections in order:
--   1) 01_extensions … 15_admin_provision_notes (15 documents admin provision; demo Auth in seed/demo_accounts.sql)
--   2) seed/demo_procurement_data.sql — truncates operational tables, loads sample rows
--   3) seed/demo_accounts.sql — upserts public.profiles (joins auth.users by email)
--

HEADER
  emit_numbered_schema
  echo "-- ===== seed/demo_procurement_data.sql ====="
  cat "$SQL/seed/demo_procurement_data.sql"
  echo
  echo "-- ===== seed/demo_accounts.sql (requires matching auth.users) ====="
  cat "$SQL/seed/demo_accounts.sql"
  echo
} > "$OUT_ALL"

echo "Wrote $OUT_SCHEMA and $OUT_ALL"
