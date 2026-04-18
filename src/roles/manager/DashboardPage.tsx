import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
import { ProcessGuide } from '@/shared/components/ProcessGuide'

export function ManagerDashboardPage() {
  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Control tower"
        subtitle="Approve commitments, review performance, and watch fulfillment without running every PO yourself."
      />
      <ProcessGuide guideId="mgr-dashboard" />
      <RoleDashboardGrid>
        <RoleDashboardCard
          to="approvals/requests"
          title="Approve requests"
          description="Gate spend before buyers engage suppliers."
        />
        <RoleDashboardCard
          to="approvals/orders"
          title="Approve purchase orders"
          description="Confirm PO terms align with policy and prior approvals."
        />
        <RoleDashboardCard
          to="reports"
          title="Reports & audit"
          description="Spending, supplier performance, and request history."
        />
        <RoleDashboardCard
          to="orders"
          title="Order monitoring"
          description="Read-only visibility across live order statuses."
        />
        <RoleDashboardCard
          to="inventory"
          title="Stock catalog"
          description="Maintain catalog lines that purchasing can link on POs and reports can trace."
        />
      </RoleDashboardGrid>
    </div>
  )
}
