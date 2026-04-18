import { useMemo } from 'react'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { ProcessGuide } from '@/shared/components/ProcessGuide'
import { formatPhp } from '@/shared/format/money'
import { StatusBadge } from '@/shared/components/StatusBadge'

export function ReportsPage() {
  const { state } = useProcurement()

  const spendBySupplier = useMemo(() => {
    const m = new Map<string, number>()
    for (const po of state.purchaseOrders) {
      if (po.status === 'rejected') continue
      const cur = m.get(po.supplierId) ?? 0
      m.set(po.supplierId, cur + po.total)
    }
    return [...m.entries()]
      .map(([supplierId, total]) => ({
        supplierId,
        name: state.suppliers.find((s) => s.id === supplierId)?.name ?? supplierId,
        total,
      }))
      .sort((a, b) => b.total - a.total)
  }, [state.purchaseOrders, state.suppliers])

  const prByStatus = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of state.purchaseRequests) {
      m[p.status] = (m[p.status] ?? 0) + 1
    }
    return m
  }, [state.purchaseRequests])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Reports & audit trail</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Spending concentration, supplier load, and purchase request history for leadership
          reviews.
        </p>
      </header>
      <ProcessGuide guideId="mgr-reports" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-ink-muted">Open PO value</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {formatPhp(
              state.purchaseOrders
                .filter((p) => !['completed', 'rejected'].includes(p.status))
                .reduce((s, p) => s + p.total, 0),
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-ink-muted">Completed PO value</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {formatPhp(
              state.purchaseOrders
                .filter((p) => p.status === 'completed')
                .reduce((s, p) => s + p.total, 0),
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-ink-muted">Purchase requests</p>
          <p className="mt-1 flex flex-wrap gap-2">
            {Object.entries(prByStatus).map(([st, n]) => (
              <span key={st} className="text-sm">
                {st}: <strong>{n}</strong>
              </span>
            ))}
          </p>
        </div>
      </div>
      <section>
        <h2 className="text-sm font-semibold text-ink">Spend by supplier</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted/50 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">Supplier</th>
                <th className="px-3 py-2 text-left">Attributed PO total</th>
                <th className="px-3 py-2 text-left">Reliability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {spendBySupplier.map((row) => {
                const sup = state.suppliers.find((s) => s.id === row.supplierId)
                return (
                  <tr key={row.supplierId}>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{formatPhp(row.total)}</td>
                    <td className="px-3 py-2">{sup?.reliability ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-ink">Request history</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted/50 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Requester</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...state.purchaseRequests]
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                )
                .map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2">{p.description}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-2 text-ink-muted">{p.requestedByEmail}</td>
                    <td className="px-3 py-2 text-ink-muted">
                      {new Date(p.createdAt).toLocaleDateString()}
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
