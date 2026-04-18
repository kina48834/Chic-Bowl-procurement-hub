import { Link, NavLink, Outlet } from 'react-router-dom'
import { BrandLogo } from '@/shared/components/BrandLogo'

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh min-h-svh flex-col text-ink">
      <header className="shrink-0 border-b border-border bg-surface-card/95 px-3 py-3.5 shadow-sm backdrop-blur-md sm:px-6 sm:py-4">
        <div className="layout-shell-tight flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link
              to="/"
              className="flex min-w-0 items-center transition hover:opacity-90"
              aria-label="Chic Bowl procurement — home"
            >
              <BrandLogo height={40} className="max-w-[min(100%,260px)]" />
            </Link>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                [
                  'rounded-lg border-2 px-3 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'border-accent bg-accent-muted text-ink'
                    : 'border-border bg-surface-card text-ink-muted hover:border-accent/40 hover:text-ink',
                ].join(' ')
              }
            >
              Home
            </NavLink>
          </div>
        </div>
      </header>
      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_55%_at_50%_38%,var(--tw-gradient-stops))] from-accent-muted/35 via-transparent to-transparent"
          aria-hidden
        />
        {/* w-[min(...)] without w-full so align-items centers the card horizontally */}
        <div className="w-[min(100%,26rem)] shrink-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
