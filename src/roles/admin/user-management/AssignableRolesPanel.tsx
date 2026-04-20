import { ROLE_CAPABILITIES } from '@/shared/roles/role-capabilities'
import { roles } from '@/shared/roles/registry'

export function AssignableRolesPanel() {
  return (
    <section className="rounded-2xl border border-border bg-surface-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Roles in this system</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Every role below can be assigned when you provision or edit a user. New accounts are{' '}
        <strong className="font-medium text-ink">not</strong> created on a public registration
        page—only here in User management. Each card summarizes typical responsibilities for that role.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <li
            key={role.id}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm"
          >
            <span className="text-lg">{role.emoji}</span>
            <p className="mt-1 font-medium text-ink">{role.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{role.focus}</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-ink-muted">
              {ROLE_CAPABILITIES[role.id].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-wide text-ink-muted">
              id: {role.id}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
