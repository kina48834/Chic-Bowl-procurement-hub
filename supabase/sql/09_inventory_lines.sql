-- 09_inventory_lines.sql — stock catalog + on-hand lines (mirrors src/procurement/types.ts InventoryLine).
--
-- SPA (Vite): same catalog UX at /inventory/catalog and /admin/inventory (shared data via ProcurementProvider).
-- Executive cross-cuts (PO book, spend by supplier, catalog counts) live at /admin/reports.
-- Category text must stay aligned with public.purchase_requests (05_purchase_requests.sql) and
-- src/procurement/stock-catalog.ts (PRCategory) so PRs, POs, and the stock catalog dropdowns stay one vocabulary.

CREATE TABLE IF NOT EXISTS public.inventory_lines (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  last_updated timestamptz NOT NULL,
  reorder_threshold numeric NOT NULL DEFAULT 20,
  source_delivery_id text
);

CREATE INDEX IF NOT EXISTS inventory_lines_category_idx ON public.inventory_lines (category);

-- Idempotent: (re)applies if the table already existed from an older export without this check.
-- Normalize legacy categories (e.g. "received", mixed case, extra spaces) before adding the CHECK.
UPDATE public.inventory_lines
SET category = CASE
  WHEN lower(trim(category)) IN (
    'chicken',
    'ingredients',
    'packaging',
    'equipment',
    'beverages',
    'cleaning',
    'frozen',
    'dry_goods',
    'other'
  ) THEN lower(trim(category))
  ELSE 'other'
END;

ALTER TABLE public.inventory_lines DROP CONSTRAINT IF EXISTS inventory_lines_category_check;
ALTER TABLE public.inventory_lines ADD CONSTRAINT inventory_lines_category_check CHECK (
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
);

COMMENT ON TABLE public.inventory_lines IS
  'Inventory staff/admin stock catalog; purchase_orders.inventory_catalog_id may reference id; mirrors InventoryLine in the app.';

COMMENT ON COLUMN public.inventory_lines.category IS
  'Same closed set as purchase_requests.category (see 05_purchase_requests.sql); UI labels in src/procurement/stock-catalog.ts.';

COMMENT ON COLUMN public.inventory_lines.quantity IS
  'Baseline on-hand quantity shown as “On-hand” in Inventory/Admin stock catalog screens.';

COMMENT ON COLUMN public.inventory_lines.reorder_threshold IS
  'When on-hand is at or below this value, the app shows a low-stock alert for Inventory Staff.';

COMMENT ON COLUMN public.inventory_lines.source_delivery_id IS
  'Optional link to a receiving/delivery record when the app tracks provenance.';

-- Enforce PO → catalog FK after both tables exist.
ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_inventory_catalog_id_fkey;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_inventory_catalog_id_fkey
  FOREIGN KEY (inventory_catalog_id) REFERENCES public.inventory_lines (id) ON DELETE SET NULL;
