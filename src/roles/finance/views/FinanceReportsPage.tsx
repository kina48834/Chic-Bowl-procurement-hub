import { useMemo } from 'react'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { formatPhp, formatPhpWhole } from '@/shared/format/money'
import { StatusBadge } from '@/shared/components/StatusBadge'

export function FinanceReportsPage() {
  const { state } = useProcurement()

  const { paid, pendingPay } = useMemo(() => {
    let paid = 0
    let pendingPay = 0
    for (const p of state.payments) {
      if (p.status === 'paid') paid += p.amount
      else pendingPay += p.amount
    }
    return { paid, pendingPay }
  }, [state.payments])

  const openLiabilities = useMemo(() => {
    return state.purchaseOrders
      .filter((po) => ['sent', 'shipped', 'approved'].includes(po.status))
      .reduce((s, po) => s + po.total, 0)
  }, [state.purchaseOrders])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Financial reports</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cash movements, scheduled payables, and outstanding commercial liabilities.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-ink-muted">Paid (recorded)</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{formatPhp(paid)}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-ink-muted">Payables pending</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{formatPhp(pendingPay)}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-ink-muted">Open PO exposure</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{formatPhp(openLiabilities)}</p>
          <p className="mt-1 text-xs text-ink-muted">Sent/shipped/approved PO totals</p>
        </div>
      </div>
      <section>
        <h2 className="text-sm font-semibold text-ink">Budget posture</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted/50 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">Envelope</th>
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
      <section>
        <h2 className="text-sm font-semibold text-ink">Payment register</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted/50 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">Ref</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Paid at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{p.reference}</td>
                  <td className="px-3 py-2">{formatPhp(p.amount)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-3 py-2 text-ink-muted">
                    {p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}
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
