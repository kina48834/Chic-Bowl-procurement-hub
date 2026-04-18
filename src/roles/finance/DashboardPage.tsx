import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
import { ProcessGuide } from '@/shared/components/ProcessGuide'

export function FinanceDashboardPage() {
  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Finance control"
        subtitle="Fund approved work, execute supplier payments, and close the books with clean trails."
      />
      <ProcessGuide guideId="fin-dashboard" />
      <RoleDashboardGrid>
        <RoleDashboardCard
          to="budget"
          title="Budget review"
          description="Approve or deny funding tied to upcoming purchases."
        />
        <RoleDashboardCard
          to="payments"
          title="Supplier payments"
          description="Pay approved invoices and match to receipts."
        />
        <RoleDashboardCard
          to="reports"
          title="Financial reports"
          description="Expenses, payments, and liabilities for reporting periods."
        />
      </RoleDashboardGrid>
    </div>
  )
}
