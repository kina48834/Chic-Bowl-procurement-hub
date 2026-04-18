import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
import { ProcessGuide } from '@/shared/components/ProcessGuide'

export function PurchasingDashboardPage() {
  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Procurement execution"
        subtitle="Source suppliers, compare quotes, issue POs, and follow shipments through completion."
      />
      <ProcessGuide guideId="pur-dashboard" />
      <RoleDashboardGrid>
        <RoleDashboardCard
          to="suppliers"
          title="Suppliers"
          description="Maintain vendor master data, pricing, and reliability notes."
        />
        <RoleDashboardCard
          to="quotations"
          title="Quotations"
          description="Collect and compare supplier responses before awarding business."
        />
        <RoleDashboardCard
          to="purchase-orders"
          title="Purchase orders"
          description="Turn approved demand into purchase orders and send them out."
        />
        <RoleDashboardCard
          to="order-tracking"
          title="Order tracking"
          description="Monitor PO status from commitment through delivery."
        />
      </RoleDashboardGrid>
    </div>
  )
}
