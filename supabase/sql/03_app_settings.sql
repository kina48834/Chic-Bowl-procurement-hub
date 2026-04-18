-- 03_app_settings.sql — singleton settings (mirrors AppSettings in src/procurement/types.ts).

CREATE TABLE IF NOT EXISTS public.app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL DEFAULT '',
  system_notes text NOT NULL DEFAULT '',
  last_override_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id, company_name, system_notes, last_override_note)
VALUES (
  1,
  'Chic Bowl by 3rd Jen Kitchens',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.app_settings IS 'Single-row app configuration; mirrors ProcurementState.settings';
