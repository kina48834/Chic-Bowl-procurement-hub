import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { roles } from '@/shared/roles/registry'
import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
export function AdminDashboardPage() {
  const { accounts } = useAuth()

  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Administration"
        subtitle="Users, system settings, catalog, suppliers, reports, and audit log."
      />
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
          description="Create accounts and assign roles."
        />
        <RoleDashboardCard
          to="settings"
          title="System settings"
          description="Company profile and system notes."
        />
        <RoleDashboardCard
          to="inventory"
          title="Stock catalog"
          description="Shared catalog and reorder thresholds."
        />
        <RoleDashboardCard
          to="suppliers"
          title="Suppliers"
          description="Supplier master data."
        />
        <RoleDashboardCard
          to="reports"
          title="Reports"
          description="Executive and operational summaries."
        />
        <RoleDashboardCard
          to="audit-log"
          title="Audit log"
          description="Change history by actor and time."
        />
      </RoleDashboardGrid>
    </div>
  )
}
