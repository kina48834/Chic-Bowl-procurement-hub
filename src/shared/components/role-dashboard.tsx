import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function RoleDashboardHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <header className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        Dashboard
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
        {title}
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{subtitle}</p>
    </header>
  )
}

export function RoleDashboardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
}

export function RoleDashboardCard({
  to,
  title,
  description,
}: {
  to: string
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group ui-panel-soft flex flex-col p-5 transition-shadow hover:border-accent/60 hover:shadow-md"
    >
      <h2 className="font-semibold text-ink group-hover:text-ink">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{description}</p>
      <span className="mt-4 text-xs font-semibold text-danger">Open →</span>
    </Link>
  )
}
