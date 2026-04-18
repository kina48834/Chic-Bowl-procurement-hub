import { ROLE_CAPABILITIES } from '@/shared/guides/role-capabilities'
import { getRoleMeta } from '@/shared/roles/registry'
import type { RoleId } from '@/shared/types/nav'

type RoleWorkspaceHintProps = {
  role: RoleId
  /** Shown under Add user; edit dialog uses a shorter handoff line. */
  variant?: 'provision' | 'edit'
}

export function RoleWorkspaceHint({ role, variant = 'provision' }: RoleWorkspaceHintProps) {
  const meta = getRoleMeta(role)
  const caps = ROLE_CAPABILITIES[role]
  const dashboardPath = `${meta.basePath}/dashboard`

  return (
    <div
      className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent-muted/35 to-surface-card p-4 shadow-sm ring-1 ring-border/40"
      role="region"
      aria-label={`Workspace preview for ${meta.label}`}
    >
      <div className="flex flex-wrap items-start gap-2">
        <span className="text-2xl leading-none" aria-hidden>
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{meta.label}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{meta.focus}</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border/80 bg-surface/80 px-3 py-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
          Primary workspace
        </p>
        <p className="mt-1 font-mono text-sm font-medium text-ink">{dashboardPath}</p>
        <p className="mt-1 text-xs text-ink-muted">
          After sign-in, they open this dashboard from the workspace home or sidebar.
        </p>
      </div>

      <div className="mt-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
          What they can do
        </p>
        <ul className="mt-1.5 max-h-40 space-y-1.5 overflow-y-auto text-xs leading-relaxed text-ink-muted">
          {caps.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {variant === 'provision' ? (
        <p className="mt-3 border-t border-border/60 pt-3 text-xs leading-relaxed text-ink-muted">
          <strong className="font-medium text-ink">Credentials:</strong> use the display name, email,
          and initial password you entered above, then share them with this person after you add the
          user. They sign in on the public{' '}
          <strong className="font-medium text-ink">Sign in</strong> page—there is no self-service
          registration.
        </p>
      ) : (
        <p className="mt-3 border-t border-border/60 pt-3 text-xs leading-relaxed text-ink-muted">
          If you change the role, their next sign-in should use{' '}
          <code className="rounded bg-surface-muted px-1 font-mono text-[0.7rem] text-ink">
            {dashboardPath}
          </code>{' '}
          as their main entry (from home or bookmarks).
        </p>
      )}
    </div>
  )
}
