import { useMemo, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { uiBtnGhost, uiBtnSm } from '@/shared/ui/button'

function actionChipClass(action: string): string {
  const a = action.toLowerCase()
  if (
    a.includes('reject') ||
    a.includes('denied') ||
    a.includes('removed') ||
    a.includes('deactiv')
  ) {
    return 'bg-danger-muted/80 text-danger-ink ring-1 ring-danger/20'
  }
  if (
    a.includes('approv') ||
    a.includes('paid') ||
    a.includes('accept') ||
    a.includes('complet') ||
    a.includes('sent') ||
    a.includes('shipped')
  ) {
    return 'bg-success-muted text-success ring-1 ring-border/40'
  }
  if (a.includes('settings') || a.includes('updated') || a.includes('adjust')) {
    return 'bg-accent-muted text-ink ring-1 ring-accent/35'
  }
  if (a.includes('created') || a.includes('added') || a.includes('filed') || a.includes('scheduled')) {
    return 'bg-surface-muted text-ink ring-1 ring-border/70'
  }
  return 'bg-surface-deep/35 text-ink-muted ring-1 ring-border/60'
}

function formatWhen(iso: string): { short: string; full: string } {
  const d = new Date(iso)
  return {
    short: d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    full: d.toLocaleString(undefined, {
      dateStyle: 'full',
      timeStyle: 'medium',
    }),
  }
}

export function AuditLogPage() {
  const { usesSupabase } = useAuth()
  const { state } = useProcurement()
  const [query, setQuery] = useState('')

  const entries = state.auditLog

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        e.actorEmail.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q),
    )
  }, [entries, query])

  const stats = useMemo(() => {
    const actors = new Set(entries.map((e) => e.actorEmail.toLowerCase()))
    const latest = entries[0]
    return {
      total: entries.length,
      actors: actors.size,
      latestAt: latest ? formatWhen(latest.at).full : null,
    }
  }, [entries])

  return (
    <div className="space-y-8 pb-2">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface-card via-surface-card to-surface-muted/30 shadow-sm ring-1 ring-border/35">
        <div
          className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-accent/10 blur-2xl"
          aria-hidden
        />
        <div className="relative px-5 py-6 sm:px-8 sm:py-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Governance
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Audit log
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Chronological trail of procurement and configuration changes with actor and timestamp.
            {usesSupabase
              ? ' Events are stored in your linked database when using cloud mode.'
              : ' In local demo mode, events stay in this browser until you clear site data.'}
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="ui-panel p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Events</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{stats.total}</p>
          <p className="mt-1 text-xs text-ink-muted">Newest first (max 500 kept)</p>
        </div>
        <div className="ui-panel p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Actors</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{stats.actors}</p>
          <p className="mt-1 text-xs text-ink-muted">Distinct emails in the log</p>
        </div>
        <div className="ui-panel p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Latest entry</p>
          <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink">
            {stats.latestAt ?? '—'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">Most recent event time</p>
        </div>
      </div>

      <section className="ui-panel overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-border bg-surface-muted/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Activity stream</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Filter by action keyword, email, or detail text.
            </p>
          </div>
          <div className="flex w-full max-w-md flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="audit-search">
              Search audit log
            </label>
            <input
              id="audit-search"
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/25 placeholder:text-ink-muted/70 focus:border-accent focus:ring-2"
            />
            {query ? (
              <button
                type="button"
                className={`${uiBtnGhost} ${uiBtnSm} shrink-0`}
                onClick={() => setQuery('')}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-ink">
              {entries.length === 0 ? 'No audit events yet' : 'No matches for your search'}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-muted">
              {entries.length === 0
                ? 'Actions from workspaces (approvals, POs, settings, etc.) will appear here as users work in the hub.'
                : 'Try a shorter keyword or clear the filter to see all entries.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive max-h-[min(70vh,52rem)]">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-[1] bg-surface-card/95 shadow-[0_1px_0_var(--color-border)] backdrop-blur-sm">
                <tr className="text-[0.65rem] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="whitespace-nowrap px-4 py-3 sm:px-5">When</th>
                  <th className="px-4 py-3 sm:px-5">Actor</th>
                  <th className="whitespace-nowrap px-4 py-3 sm:px-5">Action</th>
                  <th className="min-w-[12rem] px-4 py-3 sm:px-5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface-card">
                {filtered.map((a) => {
                  const when = formatWhen(a.at)
                  return (
                    <tr
                      key={a.id}
                      className="transition-colors hover:bg-surface-muted/35"
                    >
                      <td
                        className="whitespace-nowrap px-4 py-3 align-top text-xs text-ink-muted sm:px-5"
                        title={when.full}
                      >
                        {when.short}
                      </td>
                      <td className="max-w-[10rem] px-4 py-3 align-top sm:max-w-[14rem] sm:px-5">
                        <span className="block truncate font-mono text-xs text-ink" title={a.actorEmail}>
                          {a.actorEmail}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top sm:px-5">
                        <span
                          className={`inline-flex max-w-[14rem] truncate rounded-full px-2.5 py-1 text-xs font-semibold ${actionChipClass(a.action)}`}
                          title={a.action}
                        >
                          {a.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-ink-muted sm:px-5">
                        <p className="line-clamp-3 text-xs leading-relaxed sm:text-sm" title={a.detail}>
                          {a.detail}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {query && filtered.length > 0 ? (
          <p className="border-t border-border px-4 py-2 text-center text-xs text-ink-muted sm:px-5">
            Showing {filtered.length} of {entries.length} entries
          </p>
        ) : null}
      </section>
    </div>
  )
}
