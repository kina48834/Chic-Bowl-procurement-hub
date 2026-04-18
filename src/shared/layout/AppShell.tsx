import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { canAccessWorkspace } from '@/auth/role-access'
import { BrandLogo } from '@/shared/components/BrandLogo'
import { getRoleLabel, roles } from '@/shared/roles/registry'
import { uiBtnSecondary } from '@/shared/ui/button'

const btnHeader = `${uiBtnSecondary} text-xs font-semibold px-2.5 py-1.5 min-h-9 sm:min-h-9 sm:px-3 sm:text-sm hover:border-danger/35`

const navPill =
  'rounded-lg px-2 py-1.5 text-xs font-medium transition sm:px-2.5 sm:py-1.5 sm:text-sm min-h-9 inline-flex items-center justify-center'

function HeaderLogoLink() {
  return (
    <NavLink
      to="/app"
      className="flex min-w-0 shrink-0 items-center transition hover:opacity-90"
      aria-label="Chic Bowl procurement — workspace home"
    >
      <BrandLogo height={30} className="max-w-[min(100%,200px)] sm:max-w-[240px]" />
    </NavLink>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  if (!user) {
    return null
  }
  const roleLabel = getRoleLabel(user.role)
  const workspaceNav =
    user.role === 'admin'
      ? []
      : roles.filter((role) => canAccessWorkspace(user, role.id))

  const workspaceNavEl =
    workspaceNav.length > 0 ? (
      <nav
        className="flex flex-wrap gap-1 sm:gap-1.5"
        aria-label="Workspace shortcuts"
      >
        {workspaceNav.map((r) => (
          <NavLink
            key={r.id}
            to={`${r.basePath}/dashboard`}
            className={({ isActive }) =>
              [
                navPill,
                isActive
                  ? 'border border-accent/40 bg-accent text-on-accent shadow-md ring-1 ring-border-strong/20'
                  : 'border border-border/70 bg-surface-card text-ink-muted hover:border-accent/40 hover:bg-accent-muted hover:text-ink',
              ].join(' ')
            }
          >
            <span className="mr-1 shrink-0">{r.emoji}</span>
            <span className="truncate">{r.label}</span>
          </NavLink>
        ))}
      </nav>
    ) : null

  return (
    <div className="min-h-dvh min-h-svh text-ink">
      <header className="sticky top-0 z-20 border-b-2 border-danger/25 bg-surface-card/95 shadow-md backdrop-blur-md">
        <div className="layout-shell flex flex-col gap-1.5 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:py-2.5">
          <div className="flex items-center justify-between gap-2 sm:hidden">
            <HeaderLogoLink />
            <button
              type="button"
              onClick={() => {
                void logout()
              }}
              className={btnHeader}
            >
              Sign out
            </button>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 lg:gap-4">
            <div className="hidden sm:block">
              <HeaderLogoLink />
            </div>
            {workspaceNavEl}
          </div>

          {user ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-2.5">
              <div className="min-w-0 flex-1 sm:max-w-[14rem] sm:flex-none sm:text-right lg:max-w-none">
                <p className="truncate text-[11px] leading-tight text-ink-muted sm:hidden">
                  <span className="font-semibold text-ink">{user.displayName}</span>
                  {' · '}
                  {roleLabel} · {user.email}
                </p>
                <p className="hidden truncate text-sm font-semibold text-ink sm:block">
                  {user.displayName}
                </p>
                <p className="hidden truncate text-xs text-ink-muted sm:block">
                  {user.email} · {roleLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void logout()
                }}
                className={`${btnHeader} hidden sm:inline-flex`}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <div className="w-full pb-6 pt-3 sm:pb-10 sm:pt-5 lg:pb-12 lg:pt-6">
        <Outlet />
      </div>
    </div>
  )
}
