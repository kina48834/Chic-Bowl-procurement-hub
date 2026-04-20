import { getRoleMeta } from '@/shared/roles/registry'
import type { RoleId } from '@/shared/types/nav'

type RoleWorkspaceHintProps = {
  role: RoleId
  /** Shown under Add user; edit dialog uses a shorter line. */
  variant?: 'provision' | 'edit'
}

export function RoleWorkspaceHint({ role, variant = 'provision' }: RoleWorkspaceHintProps) {
  const meta = getRoleMeta(role)
  const dashboardPath = `${meta.basePath}/dashboard`

  return (
    <div
      className="rounded-lg border border-border bg-surface px-3 py-3 text-sm"
      role="region"
      aria-label={`Default workspace for ${meta.label}`}
    >
      <p className="text-xs font-medium text-ink-muted">Default landing</p>
      <p className="mt-1 font-mono text-sm font-medium text-ink">{dashboardPath}</p>
      {variant === 'provision' ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          Share the display name, email, and initial password you entered above. The user signs in on the
          public <span className="font-medium text-ink">Sign in</span> page; there is no self-service
          registration.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          If you change the role, their main entry after sign-in is{' '}
          <code className="rounded bg-surface-muted px-1 font-mono text-[0.7rem] text-ink">
            {dashboardPath}
          </code>
          .
        </p>
      )}
    </div>
  )
}
