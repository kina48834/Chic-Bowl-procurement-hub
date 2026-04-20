import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { formatPhp } from '@/shared/format/money'
import { uiBtnPrimary } from '@/shared/ui/button'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function QuotationsPage() {
  const { user } = useAuth()
  const { state, addQuotation } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState(0)
  const [qualityNote, setQualityNote] = useState('')
  const [deliveryTerms, setDeliveryTerms] = useState('')

  const suppliers = state.suppliers.filter((s) => s.active)

  const byTitle = useMemo(() => {
    const map = new Map<string, typeof state.quotations>()
    for (const q of state.quotations) {
      const k = q.title.toLowerCase()
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(q)
    }
    return map
  }, [state])

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !supplierId) return
    addQuotation(
      {
        supplierId,
        title: title.trim(),
        price,
        qualityNote: qualityNote.trim(),
        deliveryTerms: deliveryTerms.trim(),
      },
      actor,
    )
    setTitle('')
    setPrice(0)
    setQualityNote('')
    setDeliveryTerms('')
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Supplier quotations</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Record RFQ responses and compare price, quality notes, and delivery terms side by side.
        </p>
      </header>
      <section className="ui-panel p-6">
        <h2 className="text-sm font-semibold text-ink">Add quotation</h2>
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
            <label className="text-xs text-ink-muted">Title / RFQ</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={input}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-ink-muted">Quality</label>
            <input className={input} value={qualityNote} onChange={(e) => setQualityNote(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-ink-muted">Delivery terms</label>
            <input
              className={input}
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
            />
          </div>
          <div>
            <button type="submit" className={uiBtnPrimary}>
              Save quotation
            </button>
          </div>
        </form>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-ink">Compare by RFQ title</h2>
        <div className="mt-3 space-y-6">
          {byTitle.size === 0 ? (
            <p className="text-sm text-ink-muted">Add quotations with the same title to compare suppliers.</p>
          ) : null}
          {[...byTitle.entries()].map(([key, quotes]) => {
            const sorted = [...quotes].sort((a, b) => a.price - b.price)
            const best = sorted[0]
            return (
              <div key={key} className="rounded-xl border border-border p-4">
                <h3 className="font-medium text-ink capitalize">{key}</h3>
                <table className="mt-2 min-w-full text-sm">
                  <thead className="text-left text-xs text-ink-muted">
                    <tr>
                      <th className="py-1">Supplier</th>
                      <th className="py-1">Price</th>
                      <th className="py-1">Quality</th>
                      <th className="py-1">Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((q) => {
                      const sup = state.suppliers.find((s) => s.id === q.supplierId)
                      const isBest = best && q.id === best.id && sorted.length > 1
                      return (
                        <tr key={q.id} className={isBest ? 'bg-success-muted' : ''}>
                          <td className="py-1">
                            {sup?.name}
                            {isBest ? (
                              <span className="ml-2 text-xs font-medium text-success">
                                Lowest price
                              </span>
                            ) : null}
                          </td>
                          <td className="py-1">{formatPhp(q.price)}</td>
                          <td className="py-1 text-ink-muted">{q.qualityNote}</td>
                          <td className="py-1 text-ink-muted">{q.deliveryTerms}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
