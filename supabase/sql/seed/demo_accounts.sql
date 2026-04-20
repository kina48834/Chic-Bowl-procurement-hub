-- seed/demo_accounts.sql — Chic Bowl demo Auth users + public.profiles (mirrors src/auth/seed-users.ts).
-- Run in Supabase SQL Editor (postgres role). Safe to re-run: resets passwords for the five demo emails,
-- ensures auth.identities rows, then upserts public.profiles.
--
-- Passwords / roles (same as STEP 1 table below; local SPA uses seed-users.ts when Supabase is unset):
--   admin@gmail.com            admin1919             admin
--   inventorystaff@gmail.com   inventorystaff1919    inventory-staff
--   purchasing@gmail.com       purchasing1919        purchasing
--   manager@gmail.com          manager1919           manager
--   finance@gmail.com          finance1919           finance
--
-- UUIDs for *new* inserts match src/auth/seed-users.ts. If a demo email already exists in auth.users,
-- that row is updated (password, confirmation, metadata) and its existing id is kept.
--
-- Requires: pgcrypto (below). RLS on profiles: run full 13_row_level_security.sql if you see policy errors.
--
-- =============================================================================
-- STEP 1 — pgcrypto + auth.users + auth.identities
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_instance uuid;
  rec RECORD;
  v_uid uuid;
BEGIN
  SELECT u.instance_id
  INTO v_instance
  FROM auth.users AS u
  WHERE u.instance_id IS NOT NULL
  LIMIT 1;

  IF v_instance IS NULL THEN
    v_instance := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  FOR rec IN
    SELECT * FROM (
      VALUES
        ('admin@gmail.com'::text, 'admin1919'::text, 'Admin'::text, 'admin'::text, 'f1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5061'::uuid),
        ('inventorystaff@gmail.com', 'inventorystaff1919', 'Inventory Staff', 'inventory-staff', 'f2b3c4d5-e6f7-48a9-b1c2-d3e4f5061728'::uuid),
        ('purchasing@gmail.com', 'purchasing1919', 'Purchasing Staff', 'purchasing', 'f3c4d5e6-f7a8-49b0-c2d3-e4f506172839'::uuid),
        ('manager@gmail.com', 'manager1919', 'Manager', 'manager', 'f4d5e6f7-a8b9-40c1-d3e4-f50617283940'::uuid),
        ('finance@gmail.com', 'finance1919', 'Finance', 'finance', 'f5e6f8a0-b9c1-41d2-a3f4-506172839415'::uuid)
    ) AS t(email, pw, dname, app_role, seed_id)
  LOOP
    SELECT u.id
    INTO v_uid
    FROM auth.users AS u
    WHERE lower(trim(u.email)) = lower(trim(rec.email));

    IF v_uid IS NULL THEN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      VALUES (
        v_instance,
        rec.seed_id,
        'authenticated',
        'authenticated',
        lower(trim(rec.email)),
        crypt(rec.pw, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('display_name', rec.dname, 'role', rec.app_role),
        now(),
        now()
      );
      v_uid := rec.seed_id;
    ELSE
      UPDATE auth.users
      SET
        encrypted_password = crypt(rec.pw, gen_salt('bf')),
        email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
        raw_app_meta_data = COALESCE(auth.users.raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = jsonb_build_object('display_name', rec.dname, 'role', rec.app_role),
        updated_at = now()
      WHERE id = v_uid;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM auth.identities AS i
      WHERE i.user_id = v_uid
        AND i.provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', lower(trim(rec.email))),
        'email',
        v_uid::text,
        now(),
        now(),
        now()
      );
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- STEP 2 — public.profiles (sync roles; matches app + RLS)
-- =============================================================================
-- handle_new_user() may have inserted a profile; this upserts display_name, role, source = seed.

INSERT INTO public.profiles (id, email, display_name, role, source)
SELECT
  u.id,
  lower(trim(u.email)),
  CASE lower(trim(u.email))
    WHEN 'admin@gmail.com' THEN 'Admin'
    WHEN 'inventorystaff@gmail.com' THEN 'Inventory Staff'
    WHEN 'purchasing@gmail.com' THEN 'Purchasing Staff'
    WHEN 'manager@gmail.com' THEN 'Manager'
    WHEN 'finance@gmail.com' THEN 'Finance'
    ELSE initcap(split_part(lower(trim(u.email)), '@', 1))
  END,
  CASE lower(trim(u.email))
    WHEN 'admin@gmail.com' THEN 'admin'
    WHEN 'inventorystaff@gmail.com' THEN 'inventory-staff'
    WHEN 'purchasing@gmail.com' THEN 'purchasing'
    WHEN 'manager@gmail.com' THEN 'manager'
    WHEN 'finance@gmail.com' THEN 'finance'
    ELSE 'inventory-staff'
  END,
  'seed'
FROM auth.users AS u
WHERE lower(trim(u.email)) IN (
  'admin@gmail.com',
  'inventorystaff@gmail.com',
  'purchasing@gmail.com',
  'manager@gmail.com',
  'finance@gmail.com'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  source = EXCLUDED.source,
  updated_at = now();

-- =============================================================================
-- STEP 3 — diagnostics
-- =============================================================================
DO $$
DECLARE
  auth_n int;
  prof_n int;
BEGIN
  SELECT COUNT(*) INTO auth_n
  FROM auth.users
  WHERE lower(trim(email)) IN (
    'admin@gmail.com',
    'inventorystaff@gmail.com',
    'purchasing@gmail.com',
    'manager@gmail.com',
    'finance@gmail.com'
  );

  SELECT COUNT(*) INTO prof_n
  FROM public.profiles
  WHERE lower(trim(email)) IN (
    'admin@gmail.com',
    'inventorystaff@gmail.com',
    'purchasing@gmail.com',
    'manager@gmail.com',
    'finance@gmail.com'
  );

  IF auth_n < 5 THEN
    RAISE WARNING 'demo_accounts.sql: expected 5 demo auth users, found %. Check STEP 1 errors above.', auth_n;
  END IF;

  IF prof_n < 5 THEN
    RAISE WARNING 'demo_accounts.sql: expected 5 demo profiles, found %. Run 02_profiles + 13_row_level_security if inserts failed.', prof_n;
  END IF;

  RAISE NOTICE 'demo_accounts.sql: demo auth users = %, profiles = %.', auth_n, prof_n;
END;
$$;
