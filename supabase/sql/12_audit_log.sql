-- 12_audit_log.sql — audit trail (mirrors AuditEntry).

CREATE TABLE IF NOT EXISTS public.audit_log (
  id text PRIMARY KEY,
  at timestamptz NOT NULL,
  actor_email text NOT NULL,
  action text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS audit_log_at_idx ON public.audit_log (at DESC);

COMMENT ON TABLE public.audit_log IS 'Append-only style log; mirrors AuditEntry';
