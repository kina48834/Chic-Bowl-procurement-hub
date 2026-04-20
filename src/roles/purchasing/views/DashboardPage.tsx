import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
export function PurchasingDashboardPage() {
  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Purchasing"
        subtitle="Suppliers, quotations, purchase orders, and tracking."
      />
      <RoleDashboardGrid>
        <RoleDashboardCard
          to="suppliers"
          title="Suppliers"
          description="Vendor records and contacts."
        />
        <RoleDashboardCard
          to="quotations"
          title="Quotations"
          description="Quotes and comparisons."
        />
        <RoleDashboardCard
          to="purchase-orders"
          title="Purchase orders"
          description="Draft, submit, and send POs."
        />
        <RoleDashboardCard
          to="order-tracking"
          title="Order tracking"
          description="Status and shipment updates."
        />
      </RoleDashboardGrid>
    </div>
  )
}
