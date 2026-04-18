import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { ProcessGuide } from '@/shared/components/ProcessGuide'
import { formatPhpWhole } from '@/shared/format/money'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { uiBtnDangerSoft, uiBtnPrimary, uiBtnSuccess } from '@/shared/ui/button'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function BudgetReviewPage() {
  const { user } = useAuth()
  const { state, createBudgetRequest, reviewBudgetRequest } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [prId, setPrId] = useState('')

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createBudgetRequest(
      {
        title: title.trim(),
        amount,
        notes: notes.trim(),
        purchaseRequestId: prId || undefined,
      },
      actor,
    )
    setTitle('')
    setAmount(0)
    setNotes('')
    setPrId('')
  }

  const pending = state.budgetRequests.filter((b) => b.status === 'pending')

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Budget review</h1>
        <p className="mt-1 text-sm text-ink-muted">
          File and decide funding envelopes tied to purchase activity.
        </p>
      </header>
      <ProcessGuide guideId="fin-budget" />
      <section className="ui-panel p-6">
        <h2 className="text-sm font-semibold text-ink">New budget request</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-ink-muted">Title</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Amount</label>
            <input
              type="number"
              min={0}
              className={input}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Link to PR (optional)</label>
            <select className={input} value={prId} onChange={(e) => setPrId(e.target.value)}>
              <option value="">— None —</option>
              {state.purchaseRequests.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.description.slice(0, 40)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-ink-muted">Notes</label>
            <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <button type="submit" className={uiBtnPrimary}>
              Submit budget request
            </button>
          </div>
        </form>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-ink">Pending approval</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No open budget requests.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((b) => (
              <li key={b.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{b.title}</p>
                    <p className="text-sm text-ink-muted">{formatPhpWhole(b.amount)}</p>
                    <p className="text-xs text-ink-muted">{b.notes}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={uiBtnSuccess}
                    onClick={() => reviewBudgetRequest(b.id, 'approved', actor)}
                  >
                    Approve funding
                  </button>
                  <button
                    type="button"
                    className={uiBtnDangerSoft}
                    onClick={() => reviewBudgetRequest(b.id, 'denied', actor)}
                  >
                    Deny
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-sm font-semibold text-ink">All budget requests</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted/50 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.budgetRequests.map((b) => (
                <tr key={b.id}>
                  <td className="px-3 py-2">{b.title}</td>
                  <td className="px-3 py-2">{formatPhpWhole(b.amount)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
