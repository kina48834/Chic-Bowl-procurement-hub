-- 10_budget_requests.sql — budget envelopes (mirrors BudgetRequest).

CREATE TABLE IF NOT EXISTS public.budget_requests (
  id text PRIMARY KEY,
  title text NOT NULL,
  amount numeric NOT NULL,
  purchase_request_id text REFERENCES public.purchase_requests (id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL,
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS budget_requests_status_idx ON public.budget_requests (status);

COMMENT ON TABLE public.budget_requests IS
  'Finance budget review; mirrors BudgetRequest. Same RLS as other hub tables (authenticated full access in 13_row_level_security.sql). If saves disappear on refresh, fix the SPA session/persist gate — not this DDL.';
