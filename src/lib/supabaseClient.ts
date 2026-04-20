import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Trim and strip trailing slashes so REST calls don’t hit malformed URLs. */
export const supabaseUrl =
  typeof rawUrl === 'string' ? rawUrl.trim().replace(/\/+$/, '') : ''
export const supabasePublishableKey =
  typeof rawKey === 'string' ? rawKey.trim() : ''

if (import.meta.env.DEV && supabaseUrl && supabasePublishableKey) {
  try {
    const u = new URL(supabaseUrl)
    const ok =
      u.protocol === 'https:' ||
      (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost'))
    if (!ok) {
      console.warn(
        '[supabase] VITE_SUPABASE_URL should be https://…supabase.co (or http://127.0.0.1 for local).',
      )
    }
  } catch {
    console.warn('[supabase] VITE_SUPABASE_URL is not a valid URL.')
  }
}

/**
 * Supabase browser client. Null only when env vars are missing (see `SupabaseRequiredGate`).
 * Use the publishable key only; RLS applies to all hub tables.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null

/** True when both Vite env vars are set — required for this app to run. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey)
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local',
    )
  }
  return supabase
}
