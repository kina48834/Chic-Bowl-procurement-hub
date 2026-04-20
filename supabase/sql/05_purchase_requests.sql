-- 05_purchase_requests.sql — purchase requests (mirrors PurchaseRequest).

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (
    category IN (
      'chicken',
      'ingredients',
      'packaging',
      'equipment',
      'beverages',
      'cleaning',
      'frozen',
      'dry_goods',
      'other'
    )
  ),
  description text NOT NULL,
  request_reason text NOT NULL DEFAULT '',
  quantity numeric NOT NULL,
  unit text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved')),
  requested_by_email text NOT NULL,
  created_at timestamptz NOT NULL,
  reviewed_at timestamptz,
  review_note text
);

CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON public.purchase_requests (status);
CREATE INDEX IF NOT EXISTS purchase_requests_requested_by_idx ON public.purchase_requests (lower(requested_by_email));

-- Existing databases: CREATE TABLE IF NOT EXISTS does not add new columns. Keep in sync with 16_procurement_workflow_migration.sql.
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS request_reason text NOT NULL DEFAULT '';

COMMENT ON TABLE public.purchase_requests IS 'PR workflow; mirrors PurchaseRequest';
COMMENT ON COLUMN public.purchase_requests.request_reason IS 'Why inventory needs the item; required in the app for traceability.';
