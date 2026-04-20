import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { uiBtnDangerSoft, uiBtnSuccess } from '@/shared/ui/button'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { formatPhp } from '@/shared/format/money'
import { StatusBadge } from '@/shared/components/StatusBadge'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function FinancePurchaseOrderApprovalsPage() {
  const { user } = useAuth()
  const { state, reviewPurchaseOrder } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [noteById, setNoteById] = useState<Record<string, string>>({})

  const pending = state.purchaseOrders.filter((p) => p.status === 'pending_approval')

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Purchase order approval (Finance)</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Approve commitment to the supplier, or return the PO to Purchasing with a clear reason.
          Returned POs can be edited and resubmitted for another Finance review.
        </p>
      </header>
      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-ink-muted">
          No purchase orders are waiting for Finance approval.
        </p>
      ) : (
        <ul className="space-y-4">
          {pending.map((po) => {
            const sup = state.suppliers.find((s) => s.id === po.supplierId)
            const cat = po.inventoryCatalogId
              ? state.inventory.find((i) => i.id === po.inventoryCatalogId)
              : undefined
            const pr = state.purchaseRequests.find((r) => r.id === po.purchaseRequestId)
            return (
              <li key={po.id} className="ui-panel-soft p-5">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{po.itemsSummary}</p>
                    {cat ? (
                      <p className="text-xs text-ink-muted">
                        Stock catalog: <span className="font-medium text-ink">{cat.name}</span>
                      </p>
                    ) : null}
                    {pr?.requestReason ? (
                      <p className="mt-1 text-xs text-ink-muted">
                        Request reason: <span className="text-ink">{pr.requestReason}</span>
                      </p>
                    ) : null}
                    <p className="text-sm text-ink-muted">
                      {sup?.name} · {formatPhp(po.total)}
                    </p>
                  </div>
                  <StatusBadge status={po.status} />
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-xs text-ink-muted">Note for audit / Purchasing</label>
                  <input
                    className={input}
                    value={noteById[po.id] ?? ''}
                    onChange={(e) =>
                      setNoteById((m) => ({ ...m, [po.id]: e.target.value }))
                    }
                    placeholder="Approval comment or return reason"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={uiBtnSuccess}
                    onClick={() =>
                      reviewPurchaseOrder(po.id, 'approved', noteById[po.id] ?? '', actor)
                    }
                  >
                    Approve PO
                  </button>
                  <button
                    type="button"
                    className={uiBtnDangerSoft}
                    onClick={() =>
                      reviewPurchaseOrder(
                        po.id,
                        'returned_by_finance',
                        noteById[po.id] ?? '',
                        actor,
                      )
                    }
                  >
                    Return to Purchasing
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
