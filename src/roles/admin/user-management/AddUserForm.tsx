import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { roles } from '@/shared/roles/registry'
import type { RoleId } from '@/shared/types/nav'
import { RoleWorkspaceHint } from '@/roles/admin/user-management/RoleWorkspaceHint'
import { uiBtnPrimary } from '@/shared/ui/button'

export function AddUserForm() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { provisionUser, usesSupabase } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RoleId>('inventory-staff')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const result = await provisionUser({
      email,
      password,
      displayName,
      role,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.reauthRequired) {
      navigate('/login', {
        replace: true,
        state: {
          from: pathname,
          message:
            'New user was created in Supabase. You were signed out because the session switched to that account. Sign in again as admin—you will return here.',
        },
      })
      return
    }
    setMessage(
      usesSupabase
        ? `Provisioned ${email.trim().toLowerCase()} as ${role}. If sign-in shows “Email not confirmed”, confirm that user under Authentication → Users (⋯)—turning off Confirm email in Providers does not retroactively confirm existing users.`
        : `Provisioned ${email.trim().toLowerCase()} as ${role}.`,
    )
    setDisplayName('')
    setEmail('')
    setPassword('')
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Add user</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {usesSupabase
          ? 'Creates a row in Supabase Auth and public.profiles with the role you choose. The app restores your admin session after sign-up when possible. Requires Email provider enabled and “Allow new users” in Supabase → Authentication.'
          : "Creates an account in this browser's storage with any workspace role. Public self-registration is disabled—only admins provision users here."}
      </p>
      {usesSupabase ? (
        <p className="mt-3 rounded-lg border border-border bg-surface-muted/40 px-3 py-2 text-xs leading-relaxed text-ink-muted">
          New users show under <span className="font-medium text-ink">Authentication → Users</span> and here once the
          list reloads. If Supabase rejects a password (project policy), the error from Auth appears below. If session
          restore fails, you’ll be redirected to sign in again as admin—the new account may still be created.
        </p>
      ) : null}
      <form className="mt-4 flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="max-w-xl space-y-3 rounded-xl border border-border/90 bg-surface/60 p-4 shadow-inner">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
            Identity &amp; sign-in
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted" htmlFor="prov-name">
              Display name
            </label>
            <input
              id="prov-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2"
              placeholder="e.g. Casey Lopez"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted" htmlFor="prov-email">
              Email (sign-in identifier)
            </label>
            <input
              id="prov-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted" htmlFor="prov-password">
              Initial password
            </label>
            <input
              id="prov-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:border-accent focus:ring-2"
            />
          </div>
        </div>

        <div className="max-w-md space-y-1.5">
          <label className="text-xs font-medium text-ink-muted" htmlFor="prov-role">
            Role
          </label>
          <select
            id="prov-role"
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

        <RoleWorkspaceHint role={role} variant="provision" />

        <div className="flex flex-col gap-3">
          {error ? (
            <p className="rounded-lg border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger-ink">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-lg border border-border bg-success-muted px-3 py-2 text-sm text-ink">
              {message}
            </p>
          ) : null}
          <button type="submit" className={`${uiBtnPrimary} w-fit`}>
            Add user
          </button>
        </div>
      </form>
    </section>
  )
}
