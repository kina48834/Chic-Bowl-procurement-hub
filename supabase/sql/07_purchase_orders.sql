-- 07_purchase_orders.sql — purchase orders (mirrors PurchaseOrder).

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id text PRIMARY KEY,
  purchase_request_id text NOT NULL REFERENCES public.purchase_requests (id) ON DELETE RESTRICT,
  supplier_id text NOT NULL REFERENCES public.suppliers (id) ON DELETE RESTRICT,
  items_summary text NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL CHECK (
    status IN (
      'draft',
      'pending_approval',
      'approved',
      'sent',
      'shipped',
      'completed',
      'rejected'
    )
  ),
  created_at timestamptz NOT NULL,
  sent_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  manager_note text,
  inventory_catalog_id text
);

CREATE INDEX IF NOT EXISTS purchase_orders_pr_idx ON public.purchase_orders (purchase_request_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_idx ON public.purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON public.purchase_orders (status);

COMMENT ON TABLE public.purchase_orders IS 'PO lifecycle; inventory_catalog_id links to inventory_lines when set';
