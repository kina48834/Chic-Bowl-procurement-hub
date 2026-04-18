import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useProcurement } from '@/procurement/ProcurementProvider'
import { ProcessGuide } from '@/shared/components/ProcessGuide'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatPhp } from '@/shared/format/money'
import { roles } from '@/shared/roles/registry'

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
    <div className="ui-panel flex gap-4 p-5 shadow-sm">
      <div className={`w-1 shrink-0 self-stretch rounded-full ${barClass}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
        {hint ? <p className="mt-2 text-xs leading-relaxed text-ink-muted">{hint}</p> : null}
      </div>
    </div>
  )
}

function PulseCard({
  title,
  value,
  sub,
}: {
  title: string
  value: ReactNode
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/35 p-4 ring-1 ring-border/40">
      <p className="text-xs font-medium text-ink-muted">{title}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{value}</p>
      {sub ? <p className="mt-1 text-xs text-ink-muted">{sub}</p> : null}
    </div>
  )
}

export function ReportsAdminPage() {
  const { accounts } = useAuth()
  const { state } = useProcurement()

  const metrics = useMemo(() => {
    const pos = state.purchaseOrders
    const poValueAll = pos.reduce((s, p) => s + p.total, 0)
    const openPipeline = pos
      .filter((p) => !['completed', 'rejected'].includes(p.status))
      .reduce((s, p) => s + p.total, 0)
    const completedValue = pos.filter((p) => p.status === 'completed').reduce((s, p) => s + p.total, 0)
    const poByStatus: Record<string, number> = {}
    for (const p of pos) {
      poByStatus[p.status] = (poByStatus[p.status] ?? 0) + 1
    }
    const pendingPr = state.purchaseRequests.filter((p) => p.status === 'pending').length
    const pendingPoApproval = pos.filter((p) => p.status === 'pending_approval').length
    const pendingBudgets = state.budgetRequests.filter((b) => b.status === 'pending').length
    const activeSuppliers = state.suppliers.filter((s) => s.active).length

    const spendBySupplier = (() => {
      const m = new Map<string, number>()
      for (const po of pos) {
        if (po.status === 'rejected') continue
        m.set(po.supplierId, (m.get(po.supplierId) ?? 0) + po.total)
      }
      return [...m.entries()]
        .map(([supplierId, total]) => ({
          supplierId,
          name: state.suppliers.find((s) => s.id === supplierId)?.name ?? supplierId,
          total,
          reliability: state.suppliers.find((s) => s.id === supplierId)?.reliability,
        }))
        .sort((a, b) => b.total - a.total)
    })()

    const recentAudit = [...state.auditLog]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6)

    return {
      poValueAll,
      openPipeline,
      completedValue,
      poByStatus,
      pendingPr,
      pendingPoApproval,
      pendingBudgets,
      activeSuppliers,
      invSku: state.inventory.length,
      auditEntries: state.auditLog.length,
      quotations: state.quotations.length,
      deliveries: state.deliveries.length,
      spendBySupplier,
      recentAudit,
    }
  }, [state])

  const accountsByRole = useMemo(() => {
    return roles.map((role) => ({
      ...role,
      count: accounts.filter((a) => a.role === role.id).length,
    }))
  }, [accounts])

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Administration</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Executive reports</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          Unfiltered snapshot across identities, spend, master data, and control events—use it for
          stand-ups and governance reviews before drilling into role-specific workspaces.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-4 text-sm">
        <Link
          to="/admin/audit-log"
          className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
        >
          Audit log
        </Link>
        <Link
          to="/admin/user-management"
          className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
        >
          User management
        </Link>
        <Link
          to="/admin/suppliers"
          className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
        >
          Suppliers
        </Link>
        <Link
          to="/admin/settings"
          className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
        >
          System settings
        </Link>
      </nav>

      <ProcessGuide guideId="adm-reports" />

      <section aria-label="Key metrics">
        <h2 className="sr-only">Key metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="User accounts"
            value={accounts.length}
            hint="Profiles with a workspace role"
            barClass="bg-accent"
          />
          <StatCard
            label="PO book (all statuses)"
            value={formatPhp(metrics.poValueAll)}
            hint={`${state.purchaseOrders.length} purchase orders`}
            barClass="bg-success"
          />
          <StatCard
            label="Inventory SKUs"
            value={metrics.invSku}
            hint="Lines in the stock catalog"
            barClass="bg-accent"
          />
          <StatCard
            label="Audit events"
            value={metrics.auditEntries}
            hint="Rows stored in the immutable log"
            barClass="bg-danger"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-card p-6 shadow-sm ring-1 ring-border/35">
        <h2 className="text-sm font-semibold text-ink">Financial pulse</h2>
        <p className="mt-1 max-w-2xl text-xs text-ink-muted">
          Open pipeline excludes completed and rejected POs. Totals use the same currency formatting as
          the rest of the app.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <PulseCard
            title="Open pipeline value"
            value={formatPhp(metrics.openPipeline)}
            sub="Not completed or rejected"
          />
          <PulseCard title="Completed PO value" value={formatPhp(metrics.completedValue)} />
          <PulseCard
            title="Quotations on file"
            value={metrics.quotations}
            sub={`${metrics.activeSuppliers} active suppliers`}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {Object.entries(metrics.poByStatus).map(([st, n]) => (
            <span key={st} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted/50 px-2.5 py-1 text-xs text-ink">
              <StatusBadge status={st} />
              <span className="tabular-nums font-semibold text-ink">{n}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Spend by supplier</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Attributed PO totals (rejected POs excluded)</p>
            </div>
          </div>
          <div className="table-responsive shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium">PO total</th>
                  <th className="px-4 py-3 text-left font-medium">Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.spendBySupplier.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-ink-muted">
                      No purchase orders yet—spend will appear here once the PO book has data.
                    </td>
                  </tr>
                ) : (
                  metrics.spendBySupplier.map((row) => (
                    <tr key={row.supplierId} className="bg-surface-card/80">
                      <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                      <td className="px-4 py-3 tabular-nums text-ink">{formatPhp(row.total)}</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {row.reliability != null ? `${row.reliability} / 5` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Accounts by role</h2>
          <p className="text-xs text-ink-muted">Mirrors the admin dashboard breakdown—full detail in User management.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {accountsByRole.map((role) => (
              <li
                key={role.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/25 px-4 py-3 ring-1 ring-border/30"
              >
                <span className="flex items-center gap-2 text-sm text-ink">
                  <span className="text-lg" aria-hidden>
                    {role.emoji}
                  </span>
                  <span className="font-medium">{role.label}</span>
                </span>
                <span className="text-xl font-semibold tabular-nums text-accent">{role.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface-card p-6 shadow-sm ring-1 ring-border/35">
          <h2 className="text-sm font-semibold text-ink">Supplier roster</h2>
          <p className="mt-1 text-xs text-ink-muted">Master list status—same records as Purchasing and Admin suppliers.</p>
          <ul className="mt-4 divide-y divide-border">
            {state.suppliers.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div>
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-ink-muted">{s.contact}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted">Rel. {s.reliability}/5</span>
                  <StatusBadge status={s.active ? 'active' : 'inactive'} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-surface-card p-6 shadow-sm ring-1 ring-border/35">
          <h2 className="text-sm font-semibold text-ink">Open governance</h2>
          <p className="mt-1 text-xs text-ink-muted">Queue depth for approvals and budgets across the org.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-accent/25 bg-accent-muted/25 p-4 text-center">
              <p className="text-3xl font-semibold tabular-nums text-ink">{metrics.pendingPr}</p>
              <p className="mt-1 text-xs font-medium text-ink-muted">Pending PRs</p>
            </div>
            <div className="rounded-xl border border-accent/25 bg-accent-muted/25 p-4 text-center">
              <p className="text-3xl font-semibold tabular-nums text-ink">{metrics.pendingPoApproval}</p>
              <p className="mt-1 text-xs font-medium text-ink-muted">PO approvals</p>
            </div>
            <div className="rounded-xl border border-accent/25 bg-accent-muted/25 p-4 text-center">
              <p className="text-3xl font-semibold tabular-nums text-ink">{metrics.pendingBudgets}</p>
              <p className="mt-1 text-xs font-medium text-ink-muted">Budget requests</p>
            </div>
          </div>
          <p className="mt-5 text-xs text-ink-muted">
            Deliveries tracked: <strong className="text-ink">{metrics.deliveries}</strong> · Link to{' '}
            <Link className="font-medium text-accent underline-offset-2 hover:underline" to="/manager/approvals/requests">
              Manager approvals
            </Link>{' '}
            for workflow context.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface-card p-6 shadow-sm ring-1 ring-border/35">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Recent audit activity</h2>
            <p className="mt-1 text-xs text-ink-muted">Latest entries—full history under Audit log.</p>
          </div>
          <Link
            to="/admin/audit-log"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            Open full log →
          </Link>
        </div>
        <div className="mt-4 table-responsive">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">When</th>
                <th className="px-4 py-2.5 text-left font-medium">Actor</th>
                <th className="px-4 py-2.5 text-left font-medium">Action</th>
                <th className="px-4 py-2.5 text-left font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics.recentAudit.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                    No audit entries yet.
                  </td>
                </tr>
              ) : (
                metrics.recentAudit.map((e) => (
                  <tr key={e.id} className="bg-surface-card/80">
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">
                      {new Date(e.at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-ink">{e.actorEmail}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{e.action}</td>
                    <td className="max-w-[14rem] truncate px-4 py-2.5 text-ink-muted" title={e.detail}>
                      {e.detail}
                    </td>
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
