import { useProcurement } from '@/procurement/ProcurementProvider'
import { formatPhp } from '@/shared/format/money'
import { StatusBadge } from '@/shared/components/StatusBadge'

export function OrderMonitoringPage() {
  const { state } = useProcurement()

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Order monitoring</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Read-only visibility across every purchase order and its current fulfillment state.
        </p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted/50 text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-3 py-2">PO</th>
              <th className="px-3 py-2">Catalog</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Linked PR</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Timeline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.purchaseOrders.map((po) => {
              const sup = state.suppliers.find((s) => s.id === po.supplierId)
              const pr = state.purchaseRequests.find((p) => p.id === po.purchaseRequestId)
              const cat = po.inventoryCatalogId
                ? state.inventory.find((i) => i.id === po.inventoryCatalogId)
                : undefined
              return (
                <tr key={po.id}>
                  <td className="px-3 py-2">{po.itemsSummary}</td>
                  <td className="px-3 py-2 text-xs text-ink-muted">{cat?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-ink-muted">{sup?.name}</td>
                  <td className="px-3 py-2 text-xs text-ink-muted">
                    {pr?.description.slice(0, 40) ?? '—'}
                  </td>
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
