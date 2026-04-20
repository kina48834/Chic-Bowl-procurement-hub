import { FeaturePage } from '@/shared/components/FeaturePage'
import { AddUserForm } from './AddUserForm'
import { AssignableRolesPanel } from './AssignableRolesPanel'
import { UserAccountsTable } from './UserAccountsTable'

export function UserManagementPage() {
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
          colleagues sign in with the email and password you set. New users are stored in{' '}
          <strong className="font-medium text-ink">Supabase → Authentication</strong> and{' '}
          <strong className="font-medium text-ink">public.profiles</strong> (roles and display names).
        </p>
      </header>
      <AssignableRolesPanel />
      <AddUserForm />
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">All accounts — add, edit</h2>
        <UserAccountsTable />
      </section>
      <FeaturePage
        title="Policy reminder"
        subtitle="Least privilege keeps procurement controls trustworthy."
        allowed={[
          'Add users with any role; edit display name and role from the table (email/password in Supabase Auth).',
          'Remove Auth users from the Supabase Dashboard when access should end.',
          'Pair this directory with your audit log reviews for sensitive changes.',
        ]}
      />
    </div>
  )
}
