import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { uiBtnPrimary } from '@/shared/ui/button'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { formatPhp } from '@/shared/format/money'
import { StatusBadge } from '@/shared/components/StatusBadge'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

type ReceiptMode = 'full_accept' | 'full_reject' | 'partial'

export function ReceivingPage() {
  const { user } = useAuth()
  const { state, receiveDelivery } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [qtyAcceptedById, setQtyAcceptedById] = useState<Record<string, string>>({})
  const [qtyRejectedById, setQtyRejectedById] = useState<Record<string, string>>({})
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [modeById, setModeById] = useState<Record<string, ReceiptMode>>({})
  const [itemNameById, setItemNameById] = useState<Record<string, string>>({})
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({})
  const [photosById, setPhotosById] = useState<Record<string, string>>({})

  const pending = state.deliveries.filter((d) => d.status === 'pending')
  const poById = Object.fromEntries(state.purchaseOrders.map((p) => [p.id, p]))

  const parsePhotos = (raw: string): string[] | undefined => {
    const parts = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    return parts.length ? parts : undefined
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Receiving & verification</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Inspect quantity and condition. Accept good stock into inventory, record full rejection
          (supplier replacement — PO stays open), or partial rejection (accept good units only).
          Finance holds supplier payment when goods are rejected or until replacement arrives.
        </p>
      </header>
      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface-card p-6 shadow-inner text-sm text-ink-muted">
          No open deliveries. Purchasing marks a PO as shipped to open a receiving task.
        </p>
      ) : (
        <ul className="space-y-4">
          {pending.map((d) => {
            const po = poById[d.purchaseOrderId]
            const mode = modeById[d.id] ?? 'full_accept'
            const catName = po?.inventoryCatalogId
              ? state.inventory.find((i) => i.id === po.inventoryCatalogId)?.name
              : undefined
            return (
              <li key={d.id} className="ui-panel-soft space-y-3 p-5">
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
                <div className="space-y-1">
                  <label className="text-xs text-ink-muted">Receipt outcome</label>
                  <select
                    className={input}
                    value={mode}
                    onChange={(e) =>
                      setModeById((m) => ({
                        ...m,
                        [d.id]: e.target.value as ReceiptMode,
                      }))
                    }
                  >
                    <option value="full_accept">Full accept (good condition)</option>
                    <option value="partial">Partial — accept good quantity, reject damaged / wrong</option>
                    <option value="full_reject">Full reject — do not receive; replacement from supplier</option>
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-ink-muted">Quantity accepted (good)</label>
                    <input
                      type="number"
                      min={0}
                      className={input}
                      value={qtyAcceptedById[d.id] ?? ''}
                      onChange={(e) =>
                        setQtyAcceptedById((m) => ({ ...m, [d.id]: e.target.value }))
                      }
                      placeholder="e.g. 800"
                      disabled={mode === 'full_reject'}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-ink-muted">Quantity rejected</label>
                    <input
                      type="number"
                      min={0}
                      className={input}
                      value={qtyRejectedById[d.id] ?? ''}
                      onChange={(e) =>
                        setQtyRejectedById((m) => ({ ...m, [d.id]: e.target.value }))
                      }
                      placeholder="0 for full accept"
                      disabled={mode === 'full_accept'}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs text-ink-muted">Inspection notes</label>
                    <input
                      className={input}
                      value={notesById[d.id] ?? ''}
                      onChange={(e) =>
                        setNotesById((m) => ({ ...m, [d.id]: e.target.value }))
                      }
                      placeholder="Temperature, labeling, packaging condition…"
                    />
                  </div>
                  {(mode === 'full_reject' || mode === 'partial') && (
                    <>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs text-ink-muted">Rejection report — item name</label>
                        <input
                          className={input}
                          value={itemNameById[d.id] ?? catName ?? ''}
                          onChange={(e) =>
                            setItemNameById((m) => ({ ...m, [d.id]: e.target.value }))
                          }
                          placeholder="Item as labeled on the delivery"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs text-ink-muted">Rejection reason</label>
                        <input
                          className={input}
                          value={rejectReasonById[d.id] ?? ''}
                          onChange={(e) =>
                            setRejectReasonById((m) => ({ ...m, [d.id]: e.target.value }))
                          }
                          placeholder="e.g. Damaged cartons, expired batch, wrong SKU"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs text-ink-muted">
                          Photo URLs (optional, comma or newline separated)
                        </label>
                        <textarea
                          className={`${input} min-h-[4rem]`}
                          value={photosById[d.id] ?? ''}
                          onChange={(e) =>
                            setPhotosById((m) => ({ ...m, [d.id]: e.target.value }))
                          }
                          placeholder="https://…"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={uiBtnPrimary}
                    onClick={() => {
                      const qa = Number(qtyAcceptedById[d.id] ?? 0)
                      const qr = Number(qtyRejectedById[d.id] ?? 0)
                      const notes = notesById[d.id] ?? ''
                      const photos = parsePhotos(photosById[d.id] ?? '')
                      if (mode === 'full_accept') {
                        receiveDelivery(
                          d.id,
                          {
                            quantityAccepted: qa,
                            quantityRejected: 0,
                            qualityNotes: notes,
                            outcome: 'accepted',
                          },
                          actor,
                        )
                      } else if (mode === 'full_reject') {
                        receiveDelivery(
                          d.id,
                          {
                            quantityAccepted: 0,
                            quantityRejected: qr,
                            qualityNotes: notes,
                            outcome: 'rejected',
                            rejectionItemName: itemNameById[d.id] || catName,
                            rejectionReason: rejectReasonById[d.id] ?? '',
                            photoUrls: photos,
                          },
                          actor,
                        )
                      } else {
                        receiveDelivery(
                          d.id,
                          {
                            quantityAccepted: qa,
                            quantityRejected: qr,
                            qualityNotes: notes,
                            outcome: 'partially_accepted',
                            rejectionItemName: itemNameById[d.id] || catName,
                            rejectionReason: rejectReasonById[d.id] ?? '',
                            photoUrls: photos,
                          },
                          actor,
                        )
                      }
                    }}
                  >
                    Submit receipt
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
                <th className="px-3 py-2">Accepted</th>
                <th className="px-3 py-2">Rejected</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Notes / report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.deliveries
                .filter((d) => d.status !== 'pending')
                .map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 font-mono text-xs">{d.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">{d.quantityReceived}</td>
                    <td className="px-3 py-2">{d.quantityRejected}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-3 py-2 text-ink-muted">
                      {d.rejectionReason
                        ? `${d.rejectionReason}${d.qualityNotes ? ` · ${d.qualityNotes}` : ''}`
                        : d.qualityNotes || '—'}
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
