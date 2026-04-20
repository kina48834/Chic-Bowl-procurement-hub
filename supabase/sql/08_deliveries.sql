-- 08_deliveries.sql — receiving / deliveries (mirrors Delivery).

CREATE TABLE IF NOT EXISTS public.deliveries (
  id text PRIMARY KEY,
  purchase_order_id text NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  quantity_expected numeric NOT NULL,
  quantity_received numeric NOT NULL,
  quantity_rejected numeric NOT NULL DEFAULT 0,
  quality_notes text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (
    status IN ('pending', 'accepted', 'rejected', 'partially_accepted')
  ),
  rejection_item_name text,
  rejection_reason text,
  photo_urls text,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS deliveries_po_idx ON public.deliveries (purchase_order_id);

COMMENT ON TABLE public.deliveries IS 'Goods receipt; mirrors Delivery';
COMMENT ON COLUMN public.deliveries.quantity_received IS 'Quantity accepted into good stock (full or partial accept).';
COMMENT ON COLUMN public.deliveries.quantity_rejected IS 'Quantity rejected (damage, wrong item, etc.).';
COMMENT ON COLUMN public.deliveries.photo_urls IS 'Optional JSON array of image URLs for rejection reports.';
