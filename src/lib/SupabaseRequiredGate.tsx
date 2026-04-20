import type { ReactNode } from 'react'
import { isSupabaseConfigured } from '@/lib/supabaseClient'

/**
 * This app is Supabase-only: no browser-local procurement or auth fallback.
 * Render children only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set.
 */
export function SupabaseRequiredGate({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface px-6 py-12 text-center">
        <div className="max-w-lg space-y-3 rounded-2xl border border-border bg-surface-card p-8 shadow-md">
          <h1 className="text-lg font-semibold text-ink">Supabase is required</h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            Copy <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">.env.example</code> to{' '}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">.env.local</code> and set{' '}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code>{' '}
            and{' '}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">
              VITE_SUPABASE_PUBLISHABLE_KEY
            </code>{' '}
            from your project&apos;s{' '}
            <span className="font-medium text-ink">Connect</span> / API settings. Then restart{' '}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">npm run dev</code>.
          </p>
        </div>
      </div>
    )
  }
  return children
}
