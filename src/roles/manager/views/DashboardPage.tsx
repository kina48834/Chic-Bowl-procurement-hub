import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
export function ManagerDashboardPage() {
  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Manager"
        subtitle="Purchase request approvals, reports, and order visibility."
      />
      <RoleDashboardGrid>
        <RoleDashboardCard
          to="approvals/requests"
          title="Approve requests"
          description="Pending purchase requests."
        />
        <RoleDashboardCard
          to="reports"
          title="Reports & audit"
          description="Spend and request history."
        />
        <RoleDashboardCard
          to="orders"
          title="Order monitoring"
          description="Purchase orders and status."
        />
      </RoleDashboardGrid>
    </div>
  )
}
