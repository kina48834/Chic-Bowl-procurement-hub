import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { uiBtnDangerSoft, uiBtnSuccess } from '@/shared/ui/button'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { ProcessGuide } from '@/shared/components/ProcessGuide'
import { formatPhp } from '@/shared/format/money'
import { StatusBadge } from '@/shared/components/StatusBadge'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function ReceivingPage() {
  const { user } = useAuth()
  const { state, receiveDelivery } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [qtyById, setQtyById] = useState<Record<string, string>>({})
  const [notesById, setNotesById] = useState<Record<string, string>>({})

  const pending = state.deliveries.filter((d) => d.status === 'pending')
  const poById = Object.fromEntries(state.purchaseOrders.map((p) => [p.id, p]))

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Receiving & verification</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Verify quantity and quality against the purchase order; accept or reject into inventory
          integration.
        </p>
      </header>
      <ProcessGuide guideId="inv-receiving" />
      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface-card p-6 shadow-inner text-sm text-ink-muted">
          No open deliveries. Purchasing marks a PO as shipped to open a receiving task.
        </p>
      ) : (
        <ul className="space-y-4">
          {pending.map((d) => {
            const po = poById[d.purchaseOrderId]
            return (
              <li
                key={d.id}
                className="ui-panel-soft space-y-3 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">
                    Delivery · PO {po?.itemsSummary ?? d.purchaseOrderId.slice(0, 8)}
                  </span>
                  <StatusBadge status={d.status} />
                </div>
                {po ? (
                  <p className="text-xs text-ink-muted">
                    Total PO value: {formatPhp(po.total)} · Status{' '}
                    <StatusBadge status={po.status} />
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-ink-muted">Quantity received</label>
                    <input
                      type="number"
                      min={0}
                      className={input}
                      value={qtyById[d.id] ?? ''}
                      onChange={(e) =>
                        setQtyById((m) => ({ ...m, [d.id]: e.target.value }))
                      }
                      placeholder="e.g. 800"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs text-ink-muted">Quality notes</label>
                    <input
                      className={input}
                      value={notesById[d.id] ?? ''}
                      onChange={(e) =>
                        setNotesById((m) => ({ ...m, [d.id]: e.target.value }))
                      }
                      placeholder="Visual inspection, temperature log…"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={uiBtnSuccess}
                    onClick={() => {
                      const q = Number(qtyById[d.id] ?? 0)
                      receiveDelivery(
                        d.id,
                        q,
                        notesById[d.id] ?? '',
                        'accepted',
                        actor,
                      )
                    }}
                  >
                    Accept delivery
                  </button>
                  <button
                    type="button"
                    className={uiBtnDangerSoft}
                    onClick={() => {
                      receiveDelivery(
                        d.id,
                        Number(qtyById[d.id] ?? 0),
                        notesById[d.id] ?? '',
                        'rejected',
                        actor,
                      )
                    }}
                  >
                    Reject delivery
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <section>
        <h2 className="text-sm font-semibold text-ink">History</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted/50 text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-2">Delivery</th>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.deliveries
                .filter((d) => d.status !== 'pending')
                .map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 font-mono text-xs">{d.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">{d.quantityReceived}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-3 py-2 text-ink-muted">{d.qualityNotes || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
