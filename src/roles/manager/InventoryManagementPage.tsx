import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import type { PRCategory } from '@/procurement/types'
import { STOCK_CATALOG_CATEGORY_OPTIONS } from '@/procurement/stock-catalog'
import { ProcessGuide } from '@/shared/components/ProcessGuide'
import type { ProcessGuideId } from '@/shared/guides/process-guides'
import {
  uiBtnDangerSoft,
  uiBtnPrimary,
  uiBtnSecondary,
  uiBtnSuccess,
  uiBtnXs,
} from '@/shared/ui/button'

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2'

function categoryLabel(slug: string): string {
  const o = STOCK_CATALOG_CATEGORY_OPTIONS.find((x) => x.value === slug)
  return o?.label ?? slug.replace(/_/g, ' ')
}

function StatCard({
  label,
  value,
  hint,
  barClass = 'bg-accent',
}: {
  label: string
  value: ReactNode
  hint?: string
  barClass?: string
}) {
  return (
    <div className="ui-panel flex gap-4 p-4 shadow-sm sm:p-5">
      <div className={`w-1 shrink-0 self-stretch rounded-full ${barClass}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-ink sm:text-2xl">{value}</p>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-ink-muted">{hint}</p> : null}
      </div>
    </div>
  )
}

type InventoryManagementPageProps = {
  /** Admin uses the same catalog CRUD with admin-scoped copy and guide. */
  inventoryContext?: 'manager' | 'admin'
}

export function InventoryManagementPage({
  inventoryContext = 'manager',
}: InventoryManagementPageProps) {
  const { user } = useAuth()
  const {
    state,
    createInventoryLine,
    updateInventoryLine,
    removeInventoryLine,
  } = useProcurement()
  const actor = user?.email ?? 'unknown'
  const isAdminUser = user?.role === 'admin'

  const [name, setName] = useState('')
  const [category, setCategory] = useState<PRCategory>('ingredients')
  const [quantity, setQuantity] = useState(0)
  const [unit, setUnit] = useState('kg')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState<PRCategory>('ingredients')
  const [editQty, setEditQty] = useState(0)
  const [editUnit, setEditUnit] = useState('')

  const rows = useMemo(
    () => [...state.inventory].sort((a, b) => a.name.localeCompare(b.name)),
    [state.inventory],
  )

  const stats = useMemo(() => {
    const inv = state.inventory
    const categories = new Set(inv.map((i) => i.category))
    const totalQty = inv.reduce((s, i) => s + Number(i.quantity) || 0, 0)
    const zeroQty = inv.filter((i) => (Number(i.quantity) || 0) === 0).length
    return {
      count: inv.length,
      categoryCount: categories.size,
      totalQty,
      zeroQty,
    }
  }, [state.inventory])

  const startEdit = (id: string) => {
    const row = state.inventory.find((r) => r.id === id)
    if (!row) return
    const cat = STOCK_CATALOG_CATEGORY_OPTIONS.some((o) => o.value === row.category)
      ? (row.category as PRCategory)
      : 'other'
    setEditId(id)
    setEditName(row.name)
    setEditCategory(cat)
    setEditQty(row.quantity)
    setEditUnit(row.unit)
  }

  const cancelEdit = () => {
    setEditId(null)
  }

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createInventoryLine(
      { name, category, quantity: Number(quantity) || 0, unit },
      actor,
    )
    setName('')
    setQuantity(0)
    setUnit('kg')
  }

  const handleSaveEdit = (id: string) => {
    updateInventoryLine(
      id,
      {
        name: editName,
        category: editCategory,
        quantity: editQty,
        unit: editUnit,
      },
      actor,
    )
    cancelEdit()
  }

  const guideId: ProcessGuideId =
    inventoryContext === 'admin'
      ? 'adm-inventory-management'
      : 'mgr-inventory-management'

  const eyebrow =
    inventoryContext === 'admin' ? 'Administration' : 'Manager workspace'
  const title =
    inventoryContext === 'admin' ? 'Master stock catalog' : 'Stock catalog'

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          {inventoryContext === 'admin' ? (
            <>
              Full admin access to the same catalog managers maintain. Add, edit, or remove lines here
              or under <strong className="font-medium text-ink">Manager → Stock catalog</strong>—data is
              shared. Purchasing links POs to these items; delete stays blocked while a PO references a
              line. Inventory staff receive goods and adjust exceptions on{' '}
              <strong className="font-medium text-ink">Inventory</strong> workflows.
            </>
          ) : (
            <>
              Maintain master stock items for every role: purchasing links POs to catalog lines; order
              monitoring shows the connection; inventory staff receive into stock and can adjust
              exceptions on <strong className="font-medium text-ink">Inventory</strong> pages.
            </>
          )}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-4 text-sm">
        {inventoryContext === 'admin' ? (
          <>
            <Link
              to="/manager/inventory"
              className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
            >
              Manager view (same catalog)
            </Link>
            <Link
              to="/admin/reports"
              className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
            >
              Executive reports
            </Link>
            <Link
              to="/purchasing/purchase-orders"
              className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
            >
              Purchase orders
            </Link>
            <Link
              to="/inventory/levels"
              className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
            >
              Inventory levels (staff)
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/manager/dashboard"
              className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
            >
              Manager dashboard
            </Link>
            <Link
              to="/manager/orders"
              className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
            >
              Order monitoring
            </Link>
            <Link
              to="/manager/approvals/requests"
              className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
            >
              Approve requests
            </Link>
            <Link
              to="/inventory/receiving"
              className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
            >
              Receiving (staff)
            </Link>
            {isAdminUser ? (
              <Link
                to="/admin/inventory"
                className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
              >
                Admin catalog (same data)
              </Link>
            ) : null}
          </>
        )}
      </nav>

      <ProcessGuide guideId={guideId} />

      <section aria-label="Catalog summary">
        <h2 className="sr-only">Catalog summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Catalog lines" value={stats.count} hint="Rows in this shared list" barClass="bg-accent" />
          <StatCard
            label="Categories in use"
            value={stats.categoryCount}
            hint="Distinct category values"
            barClass="bg-success"
          />
          <StatCard
            label="Total on-hand"
            value={stats.totalQty.toLocaleString()}
            hint="Sum of baseline quantities"
            barClass="bg-accent"
          />
          <StatCard
            label="Zero on-hand"
            value={stats.zeroQty}
            hint={stats.zeroQty > 0 ? 'Review planning or receiving' : 'No zero-qty lines'}
            barClass={stats.zeroQty > 0 ? 'bg-danger' : 'bg-success'}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-card p-6 shadow-sm ring-1 ring-border/35">
        <h2 className="text-sm font-semibold text-ink">Add catalog item</h2>
        <p className="mt-1 max-w-2xl text-xs text-ink-muted">
          Categories match purchase request types so PRs, POs, and reports use one vocabulary.
        </p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-12" onSubmit={handleAdd}>
          <div className="space-y-1 sm:col-span-2 lg:col-span-5">
            <label className="text-xs font-medium text-ink-muted" htmlFor="cat-name">
              Item name
            </label>
            <input
              id="cat-name"
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Whole chicken — premium cut"
              required
            />
          </div>
          <div className="space-y-1 lg:col-span-3">
            <label className="text-xs font-medium text-ink-muted" htmlFor="cat-cat">
              Category
            </label>
            <select
              id="cat-cat"
              className={input}
              value={category}
              onChange={(e) => setCategory(e.target.value as PRCategory)}
            >
              {STOCK_CATALOG_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-ink-muted" htmlFor="cat-unit">
              Unit
            </label>
            <input
              id="cat-unit"
              className={input}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-ink-muted" htmlFor="cat-qty">
              On-hand (baseline)
            </label>
            <input
              id="cat-qty"
              type="number"
              min={0}
              className={input}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end lg:col-span-1">
            <button type="submit" className={uiBtnPrimary}>
              Add
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">All catalog lines</h2>
          <p className="mt-1 max-w-2xl text-xs text-ink-muted">
            Delete is blocked if a purchase order still references an item (see Order monitoring or
            Purchasing purchase orders).
          </p>
        </div>
        <div className="table-responsive shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">On hand</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                    No catalog lines yet. Add your first item above—Purchasing can link POs to it once it
                    exists.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="bg-surface-card/80 odd:bg-surface-muted/15">
                    {editId === row.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            className={input}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className={input}
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as PRCategory)}
                          >
                            {STOCK_CATALOG_CATEGORY_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            className={input}
                            value={editQty}
                            onChange={(e) => setEditQty(Number(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className={input}
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">
                          {new Date(row.lastUpdated).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={`${uiBtnSuccess} ${uiBtnXs}`}
                              onClick={() => handleSaveEdit(row.id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className={`${uiBtnSecondary} ${uiBtnXs}`}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                        <td className="px-4 py-3 text-ink-muted">{categoryLabel(row.category)}</td>
                        <td className="px-4 py-3 tabular-nums text-ink">{row.quantity}</td>
                        <td className="px-4 py-3 text-ink-muted">{row.unit}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">
                          {new Date(row.lastUpdated).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={`${uiBtnSecondary} ${uiBtnXs}`}
                              onClick={() => startEdit(row.id)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`${uiBtnDangerSoft} ${uiBtnXs}`}
                              onClick={() => {
                                const r = removeInventoryLine(row.id, actor)
                                if (!r.ok) {
                                  window.alert(r.error)
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
