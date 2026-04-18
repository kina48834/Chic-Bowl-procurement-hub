import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { canAccessWorkspace } from '@/auth/role-access'
import { roles } from '@/shared/roles/registry'

const cardClass =
  'flex h-full min-h-[11rem] flex-col rounded-2xl border-2 border-border bg-surface-card p-5 shadow-md transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg sm:p-6'

export function HomePage() {
  const { user } = useAuth()
  if (!user) {
    return null
  }
  const visible =
    user.role === 'admin'
      ? roles.filter((r) => r.id === 'admin')
      : roles.filter((role) => canAccessWorkspace(user, role.id))

  return (
    <div className="layout-shell-tight space-y-8 sm:space-y-10 lg:space-y-12">
      <header className="space-y-3 sm:space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted sm:text-sm">
          Role-based workspace
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          Chic Bowl procurement workspace
        </h1>
        <p className="max-w-2xl text-pretty text-sm leading-relaxed text-ink-muted sm:text-base lg:text-lg">
          Every workspace screen includes an embedded <strong className="font-semibold text-ink">process guide</strong> with step-by-step usage and the end-to-end procurement flow.
          {' '}
          Monetary values use consistent formatting for approvals and reporting.
          {' '}
          Signed in as <span className="font-semibold text-ink">{user.email}</span>.
          {user.role === 'admin' ? (
            <>
              {' '}
              Use the admin sidebar for system control, user management, stock catalog, suppliers,
              reports, and audits—operational workspaces stay reserved for their dedicated roles.
            </>
          ) : (
            <> Open your workspace dashboard below.</>
          )}
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 xl:gap-6">
        {visible.map((role) => (
          <li key={role.id} className="min-w-0">
            <Link to={`${role.basePath}/dashboard`} className={cardClass}>
              <span className="text-3xl sm:text-4xl" aria-hidden>
                {role.emoji}
              </span>
              <span className="mt-3 text-lg font-bold text-ink sm:text-xl">{role.label}</span>
              <span className="mt-2 text-sm leading-snug text-ink-muted">{role.focus}</span>
              <span className="mt-auto pt-4 text-sm font-bold text-ink">
                Open workspace →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
