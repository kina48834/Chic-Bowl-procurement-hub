-- 11_payments.sql — supplier payments (mirrors Payment).

CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY,
  supplier_id text NOT NULL REFERENCES public.suppliers (id) ON DELETE RESTRICT,
  purchase_order_id text REFERENCES public.purchase_orders (id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'on_hold')),
  reference text NOT NULL DEFAULT '',
  hold_reason text,
  created_at timestamptz NOT NULL,
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS payments_supplier_idx ON public.payments (supplier_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);

-- Existing databases: CREATE TABLE IF NOT EXISTS does not add new columns or widen CHECKs. Keep in sync with 16_procurement_workflow_migration.sql.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS hold_reason text;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (
  status IN ('pending', 'paid', 'on_hold')
);

COMMENT ON TABLE public.payments IS 'AP / payments; mirrors Payment';
COMMENT ON COLUMN public.payments.hold_reason IS 'Why payment is on hold (e.g. delivery rejected, awaiting replacement).';
