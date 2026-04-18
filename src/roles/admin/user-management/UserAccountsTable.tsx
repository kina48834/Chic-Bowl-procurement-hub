import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { getRoleLabel, roles } from '@/shared/roles/registry'
import { UserEditDialog } from '@/roles/admin/user-management/UserEditDialog'
import type { SessionUser } from '@/auth/types'
import { uiBtnDangerSoft, uiBtnSecondary, uiBtnXs } from '@/shared/ui/button'

function sourceLabel(source: 'seed' | 'registration' | 'provisioned') {
  if (source === 'seed') return 'Seeded demo'
  if (source === 'provisioned') return 'Admin provisioned'
  return 'Self-registration'
}

export function UserAccountsTable() {
  const { accounts, user, removeUser, usesSupabase } = useAuth()
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
                      disabled={account.id === user?.id || usesSupabase}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Delete ${account.email}? This cannot be undone in this demo.`,
                          )
                        ) {
                          return
                        }
                        void removeUser(account.id).then((result) => {
                          if (!result.ok) {
                            window.alert(result.error)
                          }
                        })
                      }}
                      className={`${uiBtnDangerSoft} ${uiBtnXs}`}
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
          {usesSupabase
            ? 'Add user creates a Supabase Auth account and a profiles row with the selected role. Edit updates display name and role in Postgres. Delete is disabled—remove users in the Supabase Dashboard if needed.'
            : `Add creates a new account. Edit changes name, email, any of the ${roles.length} roles, or password. Delete removes a user (you cannot delete yourself or the last ${getRoleLabel('admin')}). At least one admin must always exist.`}
        </p>
      </div>
    </>
  )
}
