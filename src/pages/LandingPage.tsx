import { Link, Navigate, NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { defaultDashboardPath } from '@/auth/role-access'
import { BrandLogo } from '@/shared/components/BrandLogo'
import { roles } from '@/shared/roles/registry'
import { uiBtnBlock, uiBtnPrimary, uiBtnSecondary } from '@/shared/ui/button'

const flowSteps = [
  {
    title: 'Demand',
    emoji: '📋',
    body: 'Inventory staff capture what the kitchen needs—ingredients, packaging, and more—as purchase requests that move from pending through approval or rejection.',
  },
  {
    title: 'Governance',
    emoji: '✅',
    body: 'Managers approve requests and purchase orders. Finance reviews budgets where funding applies. Sensitive actions leave a clear trail in the audit log.',
  },
  {
    title: 'Sourcing',
    emoji: '🤝',
    body: 'Purchasing curates suppliers, compares quotations, issues POs (optionally tied to the shared stock catalog), sends orders to vendors, and tracks delivery status.',
  },
  {
    title: 'Receipt & stock',
    emoji: '📦',
    body: 'Inventory confirms what arrived—accept or reject against the PO—so on-hand levels stay honest. The catalog keeps item names consistent for everyone.',
  },
  {
    title: 'Settle & report',
    emoji: '💰',
    body: 'Finance records supplier payments and reporting so spend stays visible from approved work through settlement.',
  },
] as const

/**
 * Marketing home for guests. Signed-in users go straight to their role dashboard.
 */
export function PublicHomeEntry() {
  const { user } = useAuth()
  if (user) {
    return <Navigate to={defaultDashboardPath(user)} replace />
  }
  return <LandingPage />
}

function LandingPage() {
  const year = new Date().getFullYear()
  return (
    <div className="min-h-dvh min-h-svh text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-border bg-surface-card/95 shadow-sm backdrop-blur-md">
        <div className="layout-shell flex items-center justify-between gap-2 py-2 sm:gap-3 sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="flex min-w-0 shrink-0 items-center transition hover:opacity-90"
              aria-label="Chic Bowl by 3rd Jen Kitchens — home"
            >
              <BrandLogo
                height={40}
                className="h-8 max-h-8 w-auto max-w-[min(100%,11rem)] object-contain object-left sm:h-9 sm:max-h-9 sm:max-w-[13rem]"
              />
            </Link>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                [
                  'ui-btn shrink-0 whitespace-nowrap ui-btn-xs sm:ui-btn-sm',
                  isActive
                    ? 'border border-accent bg-accent-muted text-ink shadow-inner'
                    : 'ui-btn-secondary',
                ].join(' ')
              }
            >
              Home
            </NavLink>
          </div>
          <nav className="shrink-0" aria-label="Account">
            <Link
              to="/login"
              className="ui-btn ui-btn-primary ui-btn-xs whitespace-nowrap sm:ui-btn-sm"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--tw-gradient-stops))] from-accent-muted/50 via-transparent to-transparent"
            aria-hidden
          />
          <div className="layout-shell">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted sm:text-sm">
                Procurement · approvals · audit-ready
              </p>
              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Chic Bowl procurement hub
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-ink-muted sm:text-base lg:text-lg">
                One workspace for inventory, purchasing, management, finance, and administration.
                Follow the flow from kitchen demand to supplier payment—each role sees only what they need.
                Sign in to pick up where your team left off.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className={`${uiBtnPrimary} ${uiBtnBlock} min-h-[2.75rem] px-6 sm:inline-flex sm:w-auto`}
                >
                  Sign in
                </Link>
                <a
                  href="#how-it-works"
                  className={`${uiBtnSecondary} ${uiBtnBlock} min-h-[2.75rem] px-6 sm:inline-flex sm:w-auto`}
                >
                  How it works
                </a>
              </div>
              <p className="mx-auto mt-5 max-w-lg text-pretty text-xs leading-relaxed text-ink-muted sm:text-sm">
                New accounts are issued by an <strong className="font-medium text-ink">administrator</strong> in
                User management (email + password)—there is no public registration page.
              </p>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-24 border-t border-border bg-gradient-to-b from-surface-card/90 to-surface py-12 sm:py-16 lg:py-20"
        >
          <div className="layout-shell">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">End-to-end flow</p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl lg:text-3xl">
                From kitchen demand to payment
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
                Approvals, catalog links, and audit history sit in the middle—so operations stay fast
                without losing accountability.
              </p>
            </div>

            <div
              className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-2 sm:gap-3"
              aria-hidden
            >
              {flowSteps.map((step, i) => (
                <span key={step.title} className="flex items-center gap-2 sm:gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-muted/40 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
                    <span>{step.emoji}</span>
                    {step.title}
                  </span>
                  {i < flowSteps.length - 1 ? (
                    <span className="hidden text-accent/60 sm:inline" aria-hidden>
                      →
                    </span>
                  ) : null}
                </span>
              ))}
            </div>

            <ol className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:gap-6">
              {flowSteps.map((step, i) => (
                <li
                  key={step.title}
                  className="group relative flex gap-4 rounded-2xl border border-border/80 bg-surface-card p-5 shadow-sm ring-1 ring-black/[0.03] transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-md lg:p-6"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent text-lg font-bold text-on-accent shadow-md"
                    aria-hidden
                  >
                    <span className="text-base leading-none">{step.emoji}</span>
                    <span className="mt-0.5 text-[0.65rem] font-semibold opacity-90">{i + 1}</span>
                  </span>
                  <div className="min-w-0 text-left">
                    <h3 className="font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mx-auto mt-10 max-w-xl text-center text-sm text-ink-muted">
              Already have credentials from your admin?{' '}
              <Link to="/login" className="font-semibold text-ink underline-offset-2 hover:underline">
                Sign in
              </Link>{' '}
              and open the workspace for your role.
            </p>
          </div>
        </section>

        <section className="border-t border-border bg-surface-card/80 py-12 sm:py-16">
          <div className="layout-shell">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-lg font-semibold text-ink sm:text-xl">
                Five workspaces, one flow
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">
                Each profile opens a tailored dashboard and sidebar—the steps above are the same journey,
                split by responsibility so teams stay focused.
              </p>
            </div>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {roles.map((role) => (
                <li key={role.id} className="ui-panel flex flex-col p-5 sm:p-6">
                  <span className="text-2xl" aria-hidden>
                    {role.emoji}
                  </span>
                  <h3 className="mt-2 font-semibold text-ink">{role.label}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{role.focus}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface-muted/40 py-10 text-center">
        <div className="layout-shell flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">Chic Bowl by 3rd Jen Kitchens</p>
            <p className="text-xs text-ink-muted">
              © {year} · Procurement workspace
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm" aria-label="Footer">
            <Link to="/" className="text-ink-muted underline-offset-2 transition hover:text-ink hover:underline">
              Home
            </Link>
            <Link to="/login" className="text-ink-muted underline-offset-2 transition hover:text-ink hover:underline">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
