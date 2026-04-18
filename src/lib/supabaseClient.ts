import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Supabase browser client. Null when env vars are missing (local demo without cloud).
 * Use the publishable key only; enable RLS on all tables in production.
 */
export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null

/** True when Vite env is set — app uses Supabase Auth + Postgres for procurement data. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && publishableKey)
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local',
    )
  }
  return supabase
}
