-- 11_payments.sql — supplier payments (mirrors Payment).

CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY,
  supplier_id text NOT NULL REFERENCES public.suppliers (id) ON DELETE RESTRICT,
  purchase_order_id text REFERENCES public.purchase_orders (id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid')),
  reference text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL,
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS payments_supplier_idx ON public.payments (supplier_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);

COMMENT ON TABLE public.payments IS 'AP / payments; mirrors Payment';
