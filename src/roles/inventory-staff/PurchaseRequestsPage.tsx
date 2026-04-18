import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { STOCK_CATALOG_CATEGORY_OPTIONS } from '@/procurement/stock-catalog'
import type { PRCategory } from '@/procurement/types'
import { ProcessGuide } from '@/shared/components/ProcessGuide'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { uiBtnPrimary } from '@/shared/ui/button'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

export function PurchaseRequestsPage() {
  const { user } = useAuth()
  const { state, createPurchaseRequest } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [category, setCategory] = useState<PRCategory>('chicken')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('kg')

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    createPurchaseRequest(
      { category, description: description.trim(), quantity, unit: unit.trim() || 'unit' },
      actor,
    )
    setDescription('')
    setQuantity(1)
  }

  const rows = [...state.purchaseRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Purchase request management</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Create requests using the same category list the manager maintains in Stock catalog; track
          pending, approved, and rejected outcomes.
        </p>
      </header>
      <ProcessGuide guideId="inv-purchase-requests" />
      <section className="ui-panel p-6">
        <h2 className="text-sm font-semibold text-ink">New request</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted" htmlFor="pr-cat">
              Category
            </label>
            <select
              id="pr-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as PRCategory)}
              className={input}
            >
              {STOCK_CATALOG_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted" htmlFor="pr-unit">
              Unit
            </label>
            <input
              id="pr-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={input}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-ink-muted" htmlFor="pr-desc">
              Description
            </label>
            <input
              id="pr-desc"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Whole chicken — weekly run"
              className={input}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted" htmlFor="pr-qty">
              Quantity
            </label>
            <input
              id="pr-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={input}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className={uiBtnPrimary}>
              Submit request
            </button>
          </div>
        </form>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-ink">All requests</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted/50 text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Requested by</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 capitalize">{r.category}</td>
                  <td className="px-3 py-2">{r.description}</td>
                  <td className="px-3 py-2">
                    {r.quantity} {r.unit}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2 text-ink-muted">{r.requestedByEmail}</td>
                  <td className="px-3 py-2 text-ink-muted">
                    {new Date(r.createdAt).toLocaleString()}
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
