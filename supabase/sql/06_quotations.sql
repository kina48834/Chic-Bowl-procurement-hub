-- 06_quotations.sql — supplier quotations (mirrors Quotation).

CREATE TABLE IF NOT EXISTS public.quotations (
  id text PRIMARY KEY,
  supplier_id text NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
  title text NOT NULL,
  price numeric NOT NULL,
  quality_note text NOT NULL DEFAULT '',
  delivery_terms text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS quotations_supplier_id_idx ON public.quotations (supplier_id);

COMMENT ON TABLE public.quotations IS 'RFQ / quotes; mirrors Quotation';
