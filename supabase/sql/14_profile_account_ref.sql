-- 14_profile_account_ref.sql — add public account_ref for profiles created before this column existed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_ref text;

UPDATE public.profiles
SET account_ref = gen_random_uuid()::text
WHERE account_ref IS NULL OR btrim(account_ref) = '';

ALTER TABLE public.profiles
  ALTER COLUMN account_ref SET DEFAULT (gen_random_uuid()::text),
  ALTER COLUMN account_ref SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_account_ref_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_ref_key UNIQUE (account_ref);
  END IF;
END;
$$;

COMMENT ON COLUMN public.profiles.account_ref IS 'Random public account id for display; distinct from auth.users id.';
