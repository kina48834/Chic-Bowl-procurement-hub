-- 16_procurement_workflow_migration.sql — additive migration for existing databases that already ran 01–15.
-- Safe to re-run: uses IF NOT EXISTS / guarded ALTERs where possible.
--
-- After this file:
--   • Purchase requests: request_reason; status only pending|approved (legacy rejected rows become pending).
--   • Purchase orders: finance_note; status includes returned_by_finance, waiting_replacement.
--   • Deliveries: quantity_rejected, rejection fields, partially_accepted status.
--   • Inventory lines: reorder_threshold.
--   • Payments: on_hold, hold_reason.

-- ---- purchase_requests ----
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS request_reason text NOT NULL DEFAULT '';

ALTER TABLE public.purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_status_check;
UPDATE public.purchase_requests SET status = 'pending' WHERE status = 'rejected';
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_status_check CHECK (
  status IN ('pending', 'approved')
);

-- ---- purchase_orders ----
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS finance_note text;

ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_status_check CHECK (
  status IN (
    'draft',
    'pending_approval',
    'approved',
    'returned_by_finance',
    'sent',
    'shipped',
    'waiting_replacement',
    'completed',
    'rejected'
  )
);

-- ---- deliveries ----
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS quantity_rejected numeric NOT NULL DEFAULT 0;
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS rejection_item_name text;
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS photo_urls text;

UPDATE public.deliveries SET quantity_rejected = 0 WHERE quantity_rejected IS NULL;

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check CHECK (
  status IN ('pending', 'accepted', 'rejected', 'partially_accepted')
);

-- ---- inventory_lines ----
ALTER TABLE public.inventory_lines
  ADD COLUMN IF NOT EXISTS reorder_threshold numeric NOT NULL DEFAULT 20;

-- ---- payments ----
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS hold_reason text;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (
  status IN ('pending', 'paid', 'on_hold')
);
