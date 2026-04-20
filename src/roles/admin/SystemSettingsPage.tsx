import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { uiBtnPrimary, uiBtnSecondary } from '@/shared/ui/button'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function SystemSettingsPage() {
  const { user } = useAuth()
  const { state, updateSettings, adminOverrideNote } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [companyName, setCompanyName] = useState(state.settings.companyName)
  const [systemNotes, setSystemNotes] = useState(state.settings.systemNotes)
  const [override, setOverride] = useState('')

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    updateSettings(
      {
        companyName: companyName.trim(),
        systemNotes: systemNotes.trim(),
      },
      actor,
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-ink">System settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Edits are saved to the audit log.
        </p>
      </header>
      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-border bg-surface-card p-5 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-muted" htmlFor="co">
            Company name
          </label>
          <input
            id="co"
            className={input}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="organization"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-muted" htmlFor="sys-notes">
            System notes
          </label>
          <textarea
            id="sys-notes"
            rows={5}
            className={input}
            value={systemNotes}
            onChange={(e) => setSystemNotes(e.target.value)}
            spellCheck
            aria-describedby="sys-notes-hint"
          />
          <p id="sys-notes-hint" className="text-xs text-ink-muted">
            Optional reference: access, data residency, catalog rules.
          </p>
        </div>
        <button type="submit" className={uiBtnPrimary}>
          Save
        </button>
      </form>

      <section className="rounded-xl border border-border border-l-4 border-l-danger/60 bg-surface-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Override log</h2>
        <p className="mt-0.5 text-xs text-ink-muted">Timestamped note for auditors.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            className={input}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder="Justification…"
            aria-label="Override justification"
          />
          <button
            type="button"
            className={`${uiBtnSecondary} shrink-0`}
            onClick={() => {
              if (!override.trim()) return
              adminOverrideNote(override.trim(), actor)
              setOverride('')
            }}
          >
            Log
          </button>
        </div>
        {state.settings.lastOverrideNote ? (
          <p className="mt-3 text-xs text-ink-muted">
            <span className="font-medium text-ink">Last:</span> {state.settings.lastOverrideNote}
          </p>
        ) : null}
      </section>
    </div>
  )
}
