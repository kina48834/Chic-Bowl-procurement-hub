import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { formatPhp } from '@/shared/format/money'
import { uiBtnPrimary, uiBtnSecondary, uiBtnXs } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/components/StatusBadge'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function PurchaseOrdersPage() {
  const { user } = useAuth()
  const {
    state,
    createPurchaseOrder,
    submitPOForApproval,
    sendPurchaseOrder,
    updatePurchaseOrderDraft,
  } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const approvedPrs = state.purchaseRequests.filter((p) => p.status === 'approved')
  const [prId, setPrId] = useState('')
  const effectivePrId = prId || approvedPrs[0]?.id || ''
  const [supplierId, setSupplierId] = useState(
    state.suppliers.find((s) => s.active)?.id ?? '',
  )
  const [summary, setSummary] = useState('')
  const [total, setTotal] = useState(0)
  const [catalogId, setCatalogId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const [editSummary, setEditSummary] = useState<Record<string, string>>({})
  const [editTotal, setEditTotal] = useState<Record<string, string>>({})

  const suppliers = state.suppliers.filter((s) => s.active)

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    const r = createPurchaseOrder(
      {
        purchaseRequestId: effectivePrId,
        supplierId,
        itemsSummary: summary.trim() || 'Line items',
        total,
        inventoryCatalogId: catalogId || undefined,
      },
      actor,
    )
    if (!r.ok) {
      setMsg(r.error)
      return
    }
    setSummary('')
    setTotal(0)
    setCatalogId('')
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Purchase orders</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Build POs from manager-approved requests, submit to Finance for approval, then send to the
          supplier. If Finance returns a PO, read the note, adjust the order, and resubmit.
        </p>
      </header>
      <section className="ui-panel p-6">
        <h2 className="text-sm font-semibold text-ink">Create PO (draft)</h2>
        {msg ? (
          <p className="mt-2 rounded-lg border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger-ink">{msg}</p>
        ) : null}
        {approvedPrs.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No approved purchase requests yet. Inventory submits requests and the Manager approves them first.
          </p>
        ) : null}
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Approved request</label>
            <select
              className={input}
              value={effectivePrId}
              onChange={(e) => setPrId(e.target.value)}
            >
              {approvedPrs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.description.slice(0, 48)} ({p.quantity} {p.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Supplier</label>
            <select
              className={input}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-ink-muted">Stock catalog (optional)</label>
            <select
              className={input}
              value={catalogId}
              onChange={(e) => {
                const id = e.target.value
                setCatalogId(id)
                const item = state.inventory.find((i) => i.id === id)
                if (item) {
                  setSummary(
                    `${item.name} — reorder (catalog · ${item.quantity} ${item.unit} on hand)`,
                  )
                }
              }}
            >
              <option value="">— Custom line / no catalog link —</option>
              {state.inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.category})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-muted">
              Inventory-maintained items appear here for consistent PO wording and tracking.
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-ink-muted">Items summary</label>
            <input className={input} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Total</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={input}
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className={uiBtnPrimary}>
              Create draft PO
            </button>
          </div>
        </form>
      </section>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted/50 text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-3 py-2">Summary</th>
              <th className="px-3 py-2">Catalog</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Finance / actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.purchaseOrders.map((po) => {
              const cat = po.inventoryCatalogId
                ? state.inventory.find((i) => i.id === po.inventoryCatalogId)
                : undefined
              const sumVal = editSummary[po.id] ?? po.itemsSummary
              const totVal = editTotal[po.id] ?? String(po.total)
              return (
              <tr key={po.id}>
                <td className="px-3 py-2 align-top">
                  {po.status === 'returned_by_finance' ? (
                    <input
                      className={input}
                      value={sumVal}
                      onChange={(e) =>
                        setEditSummary((m) => ({ ...m, [po.id]: e.target.value }))
                      }
                    />
                  ) : (
                    po.itemsSummary
                  )}
                </td>
                <td className="px-3 py-2 align-top text-xs text-ink-muted">{cat?.name ?? '—'}</td>
                <td className="px-3 py-2 align-top">
                  {po.status === 'returned_by_finance' ? (
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={input}
                      value={totVal}
                      onChange={(e) =>
                        setEditTotal((m) => ({ ...m, [po.id]: e.target.value }))
                      }
                    />
                  ) : (
                    formatPhp(po.total)
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <StatusBadge status={po.status} />
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex max-w-md flex-col gap-2">
                    {po.status === 'returned_by_finance' && po.financeNote ? (
                      <p className="rounded-lg border border-accent/25 bg-accent-muted/20 px-2 py-1.5 text-xs text-ink">
                        <span className="font-medium text-ink-muted">Finance note: </span>
                        {po.financeNote}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                    {po.status === 'draft' ? (
                      <button
                        type="button"
                        className={`${uiBtnSecondary} ${uiBtnXs}`}
                        onClick={() => submitPOForApproval(po.id, actor)}
                      >
                        Submit for Finance approval
                      </button>
                    ) : null}
                    {po.status === 'returned_by_finance' ? (
                      <>
                        <button
                          type="button"
                          className={`${uiBtnSecondary} ${uiBtnXs}`}
                          onClick={() => {
                            updatePurchaseOrderDraft(
                              po.id,
                              {
                                itemsSummary: sumVal.trim() || po.itemsSummary,
                                total: Number(totVal) || po.total,
                              },
                              actor,
                            )
                          }}
                        >
                          Save changes
                        </button>
                        <button
                          type="button"
                          className={`${uiBtnPrimary} ${uiBtnXs}`}
                          onClick={() => submitPOForApproval(po.id, actor)}
                        >
                          Resubmit to Finance
                        </button>
                      </>
                    ) : null}
                    {po.status === 'approved' ? (
                      <button
                        type="button"
                        className={`${uiBtnPrimary} ${uiBtnXs}`}
                        onClick={() => sendPurchaseOrder(po.id, actor)}
                      >
                        Send to supplier
                      </button>
                    ) : null}
                    </div>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
