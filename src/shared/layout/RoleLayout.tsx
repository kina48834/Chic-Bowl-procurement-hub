import { useCallback, useEffect, useId, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { NavItem, RoleMeta } from '@/shared/types/nav'

type RoleLayoutProps = {
  role: RoleMeta
  nav: NavItem[]
}

function matchNavSegment(restPath: string, nav: NavItem[]): string {
  const normalized = restPath.replace(/^\/+|\/+$/g, '')
  const ordered = [...nav].sort((a, b) => b.path.length - a.path.length)
  const hit = ordered.find(
    (item) => normalized === item.path || normalized.startsWith(`${item.path}/`),
  )
  return hit?.path ?? nav[0]?.path ?? ''
}

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-xl px-3 py-2 text-left text-sm font-medium transition sm:px-3.5',
    'min-h-10 flex items-center',
    isActive
      ? 'bg-accent text-on-accent shadow-md ring-1 ring-border-strong/25'
      : 'text-ink-muted hover:bg-surface-card hover:text-ink',
  ].join(' ')

function MenuGlyph({ open, compact }: { open: boolean; compact?: boolean }) {
  return (
    <svg
      className={[compact ? 'h-4 w-4' : 'h-5 w-5', 'shrink-0'].join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M5 8h14M5 12h14M5 16h14" />
      )}
    </svg>
  )
}

export function RoleLayout({ role, nav }: RoleLayoutProps) {
  const { pathname } = useLocation()
  const menuId = useId()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const base = role.basePath.replace(/\/$/, '')
  const rest = (
    pathname.startsWith(base) ? pathname.slice(base.length) : pathname
  ).replace(/^\//, '')
  const relative = matchNavSegment(rest, nav)
  const currentLabel =
    nav.find((n) => n.path === relative)?.label ?? nav[0]?.label ?? 'Section'

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  useEffect(() => {
    const t = window.setTimeout(() => closeMobileMenu(), 0)
    return () => window.clearTimeout(t)
  }, [pathname, closeMobileMenu])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mobileMenuOpen, closeMobileMenu])

  return (
    <div className="flex min-h-[min(100dvh,1200px)] flex-col md:min-h-[calc(100dvh-3.75rem)] lg:flex-row">
      <aside className="hidden shrink-0 border-b border-border bg-surface-card md:block md:w-56 md:border-b-0 md:border-r md:shadow-[inset_-1px_0_0_var(--color-border)] lg:w-64">
        <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] space-y-1 overflow-y-auto p-3 lg:top-14 lg:p-3.5">
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-ink">
            {role.emoji} {role.label}
          </p>
          <p className="px-3 text-xs leading-relaxed text-ink-muted">{role.focus}</p>
          <nav className="mt-3 flex flex-col gap-1" aria-label="Section">
            {nav.map((item) => (
              <NavLink key={item.path} to={item.path} className={navItemClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-14 z-10 flex items-center gap-2 border-b border-border bg-surface-card/95 px-3 py-1.5 shadow-sm backdrop-blur-sm md:hidden">
          <button
            type="button"
            id={`${menuId}-trigger`}
            className="ui-btn ui-btn-secondary ui-btn-sm size-8 min-h-8 min-w-8 shrink-0 !p-0"
            aria-expanded={mobileMenuOpen}
            aria-controls={menuId}
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            <span className="sr-only">{mobileMenuOpen ? 'Close section menu' : 'Open section menu'}</span>
            <MenuGlyph open={mobileMenuOpen} compact />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">
              <span className="font-medium uppercase tracking-wide text-ink-muted">
                {role.emoji} {role.label}
              </span>
              <span className="mx-1.5 text-ink-muted/70" aria-hidden>
                /
              </span>
              <span className="text-ink">{currentLabel}</span>
            </p>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div
            className="fixed inset-x-0 bottom-0 top-14 z-40 flex md:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${menuId}-title`}
            id={menuId}
          >
            <button
              type="button"
              className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] transition-opacity"
              aria-label="Close menu"
              onClick={closeMobileMenu}
            />
            <aside className="relative z-10 flex h-full w-[min(20rem,92vw)] flex-col border-r border-border bg-surface-card shadow-2xl">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <p id={`${menuId}-title`} className="text-sm font-semibold text-ink">
                  {role.emoji} Workspace menu
                </p>
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost ui-btn-sm size-8 min-h-8 min-w-8 !p-0 text-ink-muted hover:!text-ink"
                  aria-label="Close menu"
                  onClick={closeMobileMenu}
                >
                  <MenuGlyph open compact />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
                <p className="px-1 text-xs font-bold uppercase tracking-wider text-ink">
                  {role.emoji} {role.label}
                </p>
                <p className="px-1 text-xs leading-relaxed text-ink-muted">{role.focus}</p>
                <nav className="mt-3 flex flex-col gap-1" aria-label="Section">
                  {nav.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={navItemClass}
                      onClick={closeMobileMenu}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        ) : null}

        <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
          <div className="mx-auto w-full max-w-[min(100%,80rem)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
