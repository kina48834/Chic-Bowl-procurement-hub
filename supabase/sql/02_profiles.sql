-- 02_profiles.sql — app identity & roles (links to auth.users).
-- Mirrors src/auth/types.ts (SessionUser + role).

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  account_ref text NOT NULL DEFAULT (gen_random_uuid()::text) UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (
    role IN (
      'admin',
      'finance',
      'manager',
      'inventory-staff',
      'purchasing'
    )
  ),
  source text NOT NULL DEFAULT 'provisioned' CHECK (source IN ('seed', 'registration', 'provisioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_idx ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- Auto-create a profile row when a user signs up via Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
  meta_role text;
  meta_name text;
BEGIN
  meta_role := COALESCE(NEW.raw_user_meta_data ->> 'role', '');
  meta_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', '');

  r := CASE lower(trim(meta_role))
    WHEN 'admin' THEN 'admin'
    WHEN 'finance' THEN 'finance'
    WHEN 'manager' THEN 'manager'
    WHEN 'inventory-staff' THEN 'inventory-staff'
    WHEN 'purchasing' THEN 'purchasing'
    ELSE 'inventory-staff'
  END;

  INSERT INTO public.profiles (id, email, display_name, role, source)
  VALUES (
    NEW.id,
    lower(trim(NEW.email)),
    COALESCE(NULLIF(trim(meta_name), ''), initcap(split_part(lower(trim(NEW.email)), '@', 1))),
    r,
    'registration'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE public.profiles IS 'Application user profile; mirrors RoleId in src/shared/types/nav.ts';
COMMENT ON COLUMN public.profiles.account_ref IS 'Random public account id for display; distinct from auth.users id.';

-- Admin UI (User management → Add user): when VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
-- are set, the app creates auth.users via signUp, then updates this table (role, display_name, source).
-- Without both env vars, provisioning is local-browser only (see 15_admin_provision_notes.sql).
-- Passwords are never stored in this table; they are handled by Supabase Auth (auth.users) or local demo storage.
