import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { getRoleLabel, roles } from '@/shared/roles/registry'
import { UserEditDialog } from './UserEditDialog'
import type { SessionUser } from '@/auth/types'
import { uiBtnDangerSoft, uiBtnSecondary, uiBtnXs } from '@/shared/ui/button'

function sourceLabel(source: 'seed' | 'registration' | 'provisioned') {
  if (source === 'seed') return 'Bootstrap (SQL seed)'
  if (source === 'provisioned') return 'Admin provisioned'
  return 'Self-registration'
}

export function UserAccountsTable() {
  const { accounts } = useAuth()
  const [editing, setEditing] = useState<SessionUser | null>(null)
  const [editNonce, setEditNonce] = useState(0)
  const sorted = [...accounts].sort((a, b) => a.email.localeCompare(b.email))

  const openEdit = (account: SessionUser) => {
    setEditNonce((n) => n + 1)
    setEditing(account)
  }

  return (
    <>
      {editing ? (
        <UserEditDialog
          key={`${editing.id}-${editNonce}`}
          account={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {sorted.map((account) => (
              <tr key={account.id} className="text-ink">
                <td className="px-4 py-3 font-medium">{account.displayName}</td>
                <td className="px-4 py-3 text-ink-muted">{account.email}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {roles.find((r) => r.id === account.role)?.emoji}{' '}
                  {getRoleLabel(account.role)}
                </td>
                <td className="px-4 py-3 text-ink-muted">{sourceLabel(account.source)}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {new Date(account.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(account)}
                      className={`${uiBtnSecondary} ${uiBtnXs}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Remove accounts in Supabase → Authentication"
                      className={`${uiBtnDangerSoft} ${uiBtnXs} opacity-50`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-ink-muted">
          Add user creates a Supabase Auth account and a <code className="text-ink">profiles</code> row.
          Edit updates display name and role in Postgres. Delete is disabled here—remove users in
          Supabase → Authentication if needed.
        </p>
      </div>
    </>
  )
}
