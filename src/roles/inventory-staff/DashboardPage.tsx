import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
import { ProcessGuide } from '@/shared/components/ProcessGuide'

export function InventoryStaffDashboardPage() {
  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Inventory operations"
        subtitle="Start from the workflows you own: raise demand, receive stock, and confirm balances."
      />
      <ProcessGuide guideId="inv-dashboard" />
      <RoleDashboardGrid>
        <RoleDashboardCard
          to="purchase-requests"
          title="Purchase requests"
          description="Create and track requests for chicken, ingredients, and packaging."
        />
        <RoleDashboardCard
          to="receiving"
          title="Receiving & verification"
          description="Validate deliveries and accept or reject against what was ordered."
        />
        <RoleDashboardCard
          to="levels"
          title="Inventory integration"
          description="Confirm receipts into stock and review on-hand levels."
        />
      </RoleDashboardGrid>
    </div>
  )
}
