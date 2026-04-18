-- 04_suppliers.sql — suppliers (mirrors Supplier in src/procurement/types.ts).

CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  pricing_notes text NOT NULL DEFAULT '',
  reliability smallint NOT NULL CHECK (reliability BETWEEN 1 AND 5),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_active_idx ON public.suppliers (active) WHERE active = true;

COMMENT ON TABLE public.suppliers IS 'Vendor master; mirrors Supplier type';
