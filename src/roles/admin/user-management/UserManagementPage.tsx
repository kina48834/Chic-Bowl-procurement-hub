import { useAuth } from '@/auth/useAuth'
import { FeaturePage } from '@/shared/components/FeaturePage'
import { AddUserForm } from '@/roles/admin/user-management/AddUserForm'
import { AssignableRolesPanel } from '@/roles/admin/user-management/AssignableRolesPanel'
import { UserAccountsTable } from '@/roles/admin/user-management/UserAccountsTable'

export function UserManagementPage() {
  const { usesSupabase } = useAuth()

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
          Administration
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">User management</h1>
        <p className="max-w-3xl text-sm text-ink-muted">
          Maintain the full role catalog—Inventory Staff, Purchasing Staff, Manager, Finance, and
          Admin—and map people to the workspace they should use. This is the{' '}
          <strong className="font-medium text-ink">only</strong> place new accounts are created;
          colleagues sign in with the email and password you set.{' '}
          {usesSupabase ? (
            <>
              With Supabase configured, new users are stored in{' '}
              <strong className="font-medium text-ink">Authentication → Users</strong> and{' '}
              <strong className="font-medium text-ink">public.profiles</strong> (roles and display
              names).
            </>
          ) : (
            <>
              <strong className="font-medium text-ink">Local-only mode:</strong> Supabase URL/key are
              not both set in <code className="text-xs text-ink">.env.local</code>, so accounts exist
              only in this browser—they will{' '}
              <strong className="font-medium text-ink">not</strong> appear in the Supabase
              dashboard.
            </>
          )}
        </p>
      </header>
      {!usesSupabase ? (
        <aside
          className="max-w-3xl rounded-xl border border-danger/25 bg-danger-muted px-4 py-3 text-sm text-danger-ink"
          role="status"
        >
          <p className="font-semibold text-ink">You are not connected to Supabase Auth</p>
          <p className="mt-2 text-ink-muted">
            Copy <code className="text-xs text-ink">.env.example</code> to{' '}
            <code className="text-xs text-ink">.env.local</code> (same variables, same order) and set{' '}
            <code className="text-xs text-ink">VITE_SUPABASE_PUBLISHABLE_KEY</code> from{' '}
            <span className="text-ink">Project Settings → API</span>. Restart{' '}
            <code className="text-xs text-ink">npm run dev</code>
            , sign in with a Supabase user, then add users again—they will show under Authentication
            → Users after a successful add.
          </p>
        </aside>
      ) : null}
      <AssignableRolesPanel />
      <AddUserForm />
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">All accounts — add, edit, delete</h2>
        <UserAccountsTable />
      </section>
      <FeaturePage
        title="Policy reminder"
        subtitle="Least privilege keeps procurement controls trustworthy."
        allowed={[
          'Add users with any role; edit name, email, role, or password from the table.',
          'Delete users when access should end (you cannot delete yourself or the last admin).',
          'Pair this directory with your audit log reviews for sensitive changes.',
        ]}
      />
    </div>
  )
}
