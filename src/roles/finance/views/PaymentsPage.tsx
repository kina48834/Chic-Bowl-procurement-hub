import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { formatPhp } from '@/shared/format/money'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { uiBtnPrimary, uiBtnSuccess, uiBtnXs } from '@/shared/ui/button'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function PaymentsPage() {
  const { user } = useAuth()
  const { state, createPayment, markPaymentPaid } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id ?? '')
  const [poId, setPoId] = useState('')
  const [amount, setAmount] = useState(0)
  const [reference, setReference] = useState('')

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    createPayment(
      {
        supplierId,
        purchaseOrderId: poId || undefined,
        amount,
        reference: reference.trim() || 'REF',
      },
      actor,
    )
    setAmount(0)
    setReference('')
    setPoId('')
  }

  const suppliers = state.suppliers.filter((s) => s.active)
  const completedPos = state.purchaseOrders.filter((p) => p.status === 'completed')

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Supplier payments</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Schedule payables against suppliers and completed POs; mark settlements when treasury
          executes.
        </p>
      </header>
      <section className="ui-panel p-6">
        <h2 className="text-sm font-semibold text-ink">Record payment</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleAdd}>
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
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Completed PO (optional)</label>
            <select className={input} value={poId} onChange={(e) => setPoId(e.target.value)}>
              <option value="">— None —</option>
              {completedPos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.itemsSummary} ({formatPhp(p.total)})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Amount</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={input}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Reference / invoice #</label>
            <input className={input} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className={uiBtnPrimary}>
              Add payable
            </button>
          </div>
        </form>
      </section>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-muted/50 text-xs text-ink-muted">
            <tr>
              <th className="px-3 py-2 text-left">Reference</th>
              <th className="px-3 py-2 text-left">Supplier</th>
              <th className="px-3 py-2 text-left">Amount</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Hold / notes</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.payments.map((pay) => {
              const sup = state.suppliers.find((s) => s.id === pay.supplierId)
              return (
                <tr key={pay.id}>
                  <td className="px-3 py-2 font-mono text-xs">{pay.reference}</td>
                  <td className="px-3 py-2">{sup?.name}</td>
                  <td className="px-3 py-2">{formatPhp(pay.amount)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={pay.status} />
                  </td>
                  <td className="max-w-[12rem] px-3 py-2 text-xs text-ink-muted">
                    {pay.holdReason ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    {pay.status === 'pending' ? (
                      <button
                        type="button"
                        className={`${uiBtnSuccess} ${uiBtnXs}`}
                        onClick={() => markPaymentPaid(pay.id, actor)}
                      >
                        Mark paid
                      </button>
                    ) : pay.status === 'on_hold' ? (
                      <span className="text-xs text-danger-ink">On hold — do not pay until receiving is resolved.</span>
                    ) : (
                      <span className="text-xs text-ink-muted">
                        {pay.paidAt ? new Date(pay.paidAt).toLocaleString() : '—'}
                      </span>
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
