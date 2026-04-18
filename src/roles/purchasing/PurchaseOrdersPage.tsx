import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { ProcessGuide } from '@/shared/components/ProcessGuide'
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
          Build POs from approved requests, submit for manager approval, then send to the selected
          supplier.
        </p>
      </header>
      <ProcessGuide guideId="pur-purchase-orders" />
      <section className="ui-panel p-6">
        <h2 className="text-sm font-semibold text-ink">Create PO (draft)</h2>
        {msg ? (
          <p className="mt-2 rounded-lg border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger-ink">{msg}</p>
        ) : null}
        {approvedPrs.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No approved purchase requests yet. Manager must approve an inventory request first.
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
                  {p.description.slice(0, 48)} (${p.quantity} {p.unit})
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
              Manager-maintained items appear here for consistent PO wording and tracking.
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
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.purchaseOrders.map((po) => {
              const cat = po.inventoryCatalogId
                ? state.inventory.find((i) => i.id === po.inventoryCatalogId)
                : undefined
              return (
              <tr key={po.id}>
                <td className="px-3 py-2">{po.itemsSummary}</td>
                <td className="px-3 py-2 text-xs text-ink-muted">{cat?.name ?? '—'}</td>
                <td className="px-3 py-2">{formatPhp(po.total)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={po.status} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {po.status === 'draft' ? (
                      <button
                        type="button"
                        className={`${uiBtnSecondary} ${uiBtnXs}`}
                        onClick={() => submitPOForApproval(po.id, actor)}
                      >
                        Submit for approval
                      </button>
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
