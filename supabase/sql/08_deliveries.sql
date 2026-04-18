-- 08_deliveries.sql — receiving / deliveries (mirrors Delivery).

CREATE TABLE IF NOT EXISTS public.deliveries (
  id text PRIMARY KEY,
  purchase_order_id text NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  quantity_expected numeric NOT NULL,
  quantity_received numeric NOT NULL,
  quality_notes text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS deliveries_po_idx ON public.deliveries (purchase_order_id);

COMMENT ON TABLE public.deliveries IS 'Goods receipt; mirrors Delivery';
