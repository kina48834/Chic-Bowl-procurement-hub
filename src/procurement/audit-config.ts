/**
 * Newest-first cap for in-memory + Supabase sync (`audit()` in ProcurementProvider).
 * Document the same number in `supabase/sql/12_audit_log.sql` COMMENT.
 */
export const AUDIT_LOG_MAX_ENTRIES = 120

/** Default rows shown before “Show more” on Admin → Audit log. */
export const AUDIT_LOG_UI_INITIAL_ROWS = 40
