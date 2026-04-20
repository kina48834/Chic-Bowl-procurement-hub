import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { RoleWorkspaceHint } from './RoleWorkspaceHint'
import { roles } from '@/shared/roles/registry'
import type { RoleId } from '@/shared/types/nav'
import type { SessionUser } from '@/auth/types'
import { uiBtnPrimary, uiBtnSecondary } from '@/shared/ui/button'

type UserEditDialogProps = {
  account: SessionUser
  onClose: () => void
}

export function UserEditDialog({ account, onClose }: UserEditDialogProps) {
  const { updateUser } = useAuth()
  const [displayName, setDisplayName] = useState(account.displayName)
  const [email, setEmail] = useState(account.email)
  const [role, setRole] = useState<RoleId>(account.role)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const result = await updateUser({
      userId: account.id,
      displayName,
      email,
      role,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-user-title" className="text-lg font-semibold text-ink">
          Edit user
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Update display name and workspace role. Sign-in email and passwords are managed in Supabase
          Auth.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted" htmlFor="edit-name">
              Display name
            </label>
            <input
              id="edit-name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted" htmlFor="edit-email">
              Email
            </label>
            <input
              id="edit-email"
              type="email"
              required
              readOnly
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2 read-only:bg-surface-muted/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted" htmlFor="edit-role">
              Role
            </label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value as RoleId)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.emoji} {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="max-h-[min(50vh,22rem)] overflow-y-auto pr-1">
            <RoleWorkspaceHint role={role} variant="edit" />
          </div>
          {error ? (
            <p className="rounded-lg border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger-ink">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className={uiBtnPrimary}>
              Save changes
            </button>
            <button type="button" onClick={onClose} className={uiBtnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
