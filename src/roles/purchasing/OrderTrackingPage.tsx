import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { ProcessGuide } from '@/shared/components/ProcessGuide'
import { formatPhp } from '@/shared/format/money'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { uiBtnSecondary, uiBtnXs } from '@/shared/ui/button'

export function OrderTrackingPage() {
  const { user } = useAuth()
  const { state, shipPurchaseOrder } = useProcurement()
  const actor = user?.email ?? 'unknown'

  const flow: { label: string; statuses: string[] }[] = [
    { label: 'Draft / approval', statuses: ['draft', 'pending_approval', 'approved'] },
    { label: 'With supplier', statuses: ['sent'] },
    { label: 'In transit', statuses: ['shipped'] },
    { label: 'Done', statuses: ['completed', 'rejected'] },
  ]

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Order tracking</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Track PO lifecycle: pending → sent → shipped → completed. Mark shipped when the vendor
          dispatches goods (opens receiving).
        </p>
      </header>
      <ProcessGuide guideId="pur-order-tracking" />
      <div className="grid gap-2 sm:grid-cols-4">
        {flow.map((col) => (
          <div key={col.label} className="ui-panel-soft p-3">
            <p className="text-xs font-medium text-ink-muted">{col.label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">
              {
                state.purchaseOrders.filter((p) => col.statuses.includes(p.status))
                  .length
              }
            </p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted/50 text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-3 py-2">PO</th>
              <th className="px-3 py-2">Catalog</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Milestones</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.purchaseOrders.map((po) => {
              const sup = state.suppliers.find((s) => s.id === po.supplierId)
              const cat = po.inventoryCatalogId
                ? state.inventory.find((i) => i.id === po.inventoryCatalogId)
                : undefined
              return (
                <tr key={po.id}>
                  <td className="px-3 py-2">{po.itemsSummary}</td>
                  <td className="px-3 py-2 text-xs text-ink-muted">{cat?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-ink-muted">{sup?.name}</td>
                  <td className="px-3 py-2">{formatPhp(po.total)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-muted">
                    {po.sentAt ? `Sent ${new Date(po.sentAt).toLocaleDateString()}` : '—'}
                    <br />
                    {po.shippedAt
                      ? `Shipped ${new Date(po.shippedAt).toLocaleDateString()}`
                      : ''}
                    <br />
                    {po.completedAt
                      ? `Completed ${new Date(po.completedAt).toLocaleDateString()}`
                      : ''}
                  </td>
                  <td className="px-3 py-2">
                    {po.status === 'sent' ? (
                      <button
                        type="button"
                        className={`${uiBtnSecondary} ${uiBtnXs}`}
                        onClick={() => shipPurchaseOrder(po.id, actor)}
                      >
                        Mark shipped
                      </button>
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
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
