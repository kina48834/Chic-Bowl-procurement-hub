import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { uiBtnDangerSoft, uiBtnSuccess } from '@/shared/ui/button'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { ProcessGuide } from '@/shared/components/ProcessGuide'
import { StatusBadge } from '@/shared/components/StatusBadge'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function RequestApprovalsPage() {
  const { user } = useAuth()
  const { state, reviewPurchaseRequest } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [noteById, setNoteById] = useState<Record<string, string>>({})

  const pending = state.purchaseRequests.filter((p) => p.status === 'pending')

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Purchase request approvals</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Approve or reject operational requests before procurement spends time sourcing.
        </p>
      </header>
      <ProcessGuide guideId="mgr-approve-requests" />
      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-ink-muted">
          No pending purchase requests.
        </p>
      ) : (
        <ul className="space-y-4">
          {pending.map((p) => (
            <li key={p.id} className="ui-panel-soft p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{p.description}</p>
                  <p className="text-xs text-ink-muted">
                    {p.category} · {p.quantity} {p.unit} · {p.requestedByEmail}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-3 space-y-2">
                <label className="text-xs text-ink-muted">Decision note</label>
                <input
                  className={input}
                  value={noteById[p.id] ?? ''}
                  onChange={(e) =>
                    setNoteById((m) => ({ ...m, [p.id]: e.target.value }))
                  }
                  placeholder="Reason for approvers / audit"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={uiBtnSuccess}
                  onClick={() =>
                    reviewPurchaseRequest(p.id, 'approved', noteById[p.id] ?? '', actor)
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className={uiBtnDangerSoft}
                  onClick={() =>
                    reviewPurchaseRequest(p.id, 'rejected', noteById[p.id] ?? '', actor)
                  }
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <section>
        <h2 className="text-sm font-semibold text-ink">Recent decisions</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted/50 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">Request</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.purchaseRequests
                .filter((p) => p.status !== 'pending')
                .map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2">{p.description}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-2 text-ink-muted">{p.reviewNote || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
