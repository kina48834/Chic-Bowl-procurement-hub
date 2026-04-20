#!/usr/bin/env bash
# Concatenate categorized SQL (supabase/sql/01_*.sql … 20_*.sql + seeds) into ALL.sql for SQL Editor copy-paste.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/supabase/sql"
OUT_ALL="$ROOT/supabase/ALL.sql"

NUMBERS=(01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20)

shopt -s nullglob
for n in "${NUMBERS[@]}"; do
  matches=("$SQL"/${n}_*.sql)
  if [[ ${#matches[@]} -eq 0 ]]; then
    echo "merge-sql.sh: ERROR: expected at least one file matching $SQL/${n}_*.sql" >&2
    exit 1
  fi
done
shopt -u nullglob

emit_manifest_comments() {
  echo "-- Manifest — numbered files concatenated below (merge script fails if any 01–20 is missing):"
  shopt -s nullglob
  for n in "${NUMBERS[@]}"; do
    for f in "$SQL"/${n}_*.sql; do
      [[ -f "$f" ]] && echo "--   • $(basename "$f")"
    done
  done
  shopt -u nullglob
  echo "-- ALL.sql additionally appends: seed/demo_procurement_data.sql, seed/demo_accounts.sql"
  echo "--"
}

emit_numbered_schema() {
  for n in "${NUMBERS[@]}"; do
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
-- ALL.sql — full bundle: schema (01–20) + demo procurement seed + demo account profiles.
-- Regenerate: npm run supabase:merge
--
-- Before running:
--   • Demo logins: after schema, run seed/demo_accounts.sql — it creates auth.users + auth.identities
--     (bcrypt passwords) and upserts public.profiles. No manual Authentication → Users step required.
--
-- Sections in order:
--   1) 01_extensions … 20_rls_session_notes (19 grants; 20 JWT/RLS notes)
--   2) seed/demo_procurement_data.sql — truncates operational tables, loads sample rows
--   3) seed/demo_accounts.sql — demo Auth users + identities + public.profiles
--

HEADER
  emit_manifest_comments
  emit_numbered_schema
  echo "-- ===== seed/demo_procurement_data.sql ====="
  cat "$SQL/seed/demo_procurement_data.sql"
  echo
  echo "-- ===== seed/demo_accounts.sql (Auth + profiles) ====="
  cat "$SQL/seed/demo_accounts.sql"
  echo
} > "$OUT_ALL"

echo "Wrote $OUT_ALL"
