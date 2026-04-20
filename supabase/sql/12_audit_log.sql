-- 12_audit_log.sql — audit trail (mirrors AuditEntry).

CREATE TABLE IF NOT EXISTS public.audit_log (
  id text PRIMARY KEY,
  at timestamptz NOT NULL,
  actor_email text NOT NULL,
  action text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS audit_log_at_idx ON public.audit_log (at DESC);

COMMENT ON TABLE public.audit_log IS
  'Procurement audit trail; mirrors AuditEntry. The SPA keeps at most ~120 newest events (see src/procurement/audit-config.ts AUDIT_LOG_MAX_ENTRIES) and syncs that slice to Postgres. Admins can clear or trim the log from /admin/audit-log to avoid unbounded growth; empty log deletes all rows on next persist.';
