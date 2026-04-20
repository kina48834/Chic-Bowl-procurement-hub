import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { uiBtnSecondary, uiBtnXs } from '@/shared/ui/button'

const input =
  'w-24 rounded border border-border bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export function InventoryLevelsPage() {
  const { user } = useAuth()
  const { state, adjustInventoryQuantity } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const [editQty, setEditQty] = useState<Record<string, string>>({})

  const rows = [...state.inventory].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Inventory integration</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Stock updates after accepted receiving appear here. Adjust quantities only when an
          exception is justified (cycle count, spoilage).
        </p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted/50 text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">On hand</th>
              <th className="px-3 py-2">Reorder alert at</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Last updated</th>
              <th className="px-3 py-2">Adjust (exception)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const low = Number(row.quantity) <= Number(row.reorderThreshold ?? 0)
              return (
              <tr key={row.id} className={low ? 'bg-danger-muted/10' : undefined}>
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 capitalize text-ink-muted">{row.category}</td>
                <td className="px-3 py-2">{row.quantity}</td>
                <td className="px-3 py-2 tabular-nums text-ink-muted">{row.reorderThreshold}</td>
                <td className="px-3 py-2">{row.unit}</td>
                <td className="px-3 py-2 text-ink-muted">
                  {new Date(row.lastUpdated).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      className={input}
                      value={editQty[row.id] ?? String(row.quantity)}
                      onChange={(e) =>
                        setEditQty((m) => ({ ...m, [row.id]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className={`${uiBtnSecondary} ${uiBtnXs}`}
                      onClick={() => {
                        const n = Number(editQty[row.id] ?? row.quantity)
                        if (Number.isFinite(n) && n >= 0) {
                          adjustInventoryQuantity(row.id, n, actor)
                        }
                      }}
                    >
                      Save
                    </button>
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
