-- 17_audit_log_indexes.sql — reporting helpers for audit trail (optional migration).
-- App writes audit_log on procurement actions (e.g. PR approved); indexes speed Admin audit UI + reports.

CREATE INDEX IF NOT EXISTS audit_log_action_idx ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS audit_log_actor_lower_idx ON public.audit_log (lower(actor_email));

COMMENT ON INDEX public.audit_log_action_idx IS 'Filter audit rows by action (e.g. PR approved)';
COMMENT ON INDEX public.audit_log_actor_lower_idx IS 'Filter audit rows by actor email';
