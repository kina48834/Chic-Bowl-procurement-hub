import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { roles } from '@/shared/roles/registry'
import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
import { ProcessGuide } from '@/shared/components/ProcessGuide'

export function AdminDashboardPage() {
  const { accounts } = useAuth()

  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Administration"
        subtitle="Keep identities, configuration, and observability aligned across every procurement role."
      />
      <ProcessGuide guideId="adm-dashboard" />
      <section className="rounded-2xl border border-border bg-surface-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Accounts by role</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const count = accounts.filter((a) => a.role === role.id).length
            return (
              <li
                key={role.id}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"
              >
                <span className="text-lg">{role.emoji}</span>
                <p className="mt-1 font-medium text-ink">{role.label}</p>
                <p className="text-2xl font-semibold tabular-nums text-accent">{count}</p>
                <p className="text-xs text-ink-muted">active profiles</p>
              </li>
            )
          })}
        </ul>
        <Link
          to="user-management"
          className="mt-6 inline-flex text-sm font-medium text-accent hover:underline"
        >
          Open user management →
        </Link>
      </section>
      <RoleDashboardGrid>
        <RoleDashboardCard
          to="user-management"
          title="User management"
          description="Provision accounts and assign any workspace role, including admin."
        />
        <RoleDashboardCard
          to="settings"
          title="System settings"
          description="Company name, system notes, and override log."
        />
        <RoleDashboardCard
          to="inventory"
          title="Stock catalog"
          description="Master SKUs and reorder levels—same data as Manager, with admin shortcuts."
        />
        <RoleDashboardCard
          to="suppliers"
          title="Suppliers"
          description="Full supplier master access for break-glass support."
        />
        <RoleDashboardCard
          to="reports"
          title="Reports"
          description="Cross-cutting analytics without role filters."
        />
        <RoleDashboardCard
          to="audit-log"
          title="Audit log"
          description="Immutable history for security and compliance reviews."
        />
      </RoleDashboardGrid>
    </div>
  )
}
