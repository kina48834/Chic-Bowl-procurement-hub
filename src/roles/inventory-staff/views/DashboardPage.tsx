import { Link } from 'react-router-dom'
import { useProcurement } from '@/procurement/ProcurementProvider'
import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
export function InventoryStaffDashboardPage() {
  const { state } = useProcurement()
  const lowStock = state.inventory.filter(
    (i) => Number(i.quantity) <= Number(i.reorderThreshold ?? 0),
  )

  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Inventory operations"
        subtitle="Purchase requests, receiving, catalog, and stock levels."
      />

      {lowStock.length > 0 ? (
        <section className="rounded-2xl border border-danger/25 bg-danger-muted/15 p-6 shadow-sm ring-1 ring-danger/20">
          <h2 className="text-sm font-semibold text-danger-ink">Low stock alerts</h2>
          <p className="mt-1 text-xs text-ink-muted">On-hand is at or below the reorder threshold.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lowStock.slice(0, 12).map((i) => (
              <li
                key={i.id}
                className="rounded-xl border border-border bg-surface-card px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink">{i.name}</span>
                <p className="text-xs text-ink-muted">
                  {Number(i.quantity)} {i.unit} on hand · reorder at ≤ {i.reorderThreshold}
                </p>
              </li>
            ))}
          </ul>
          {lowStock.length > 12 ? (
            <p className="mt-3 text-xs text-ink-muted">
              +{lowStock.length - 12} more — see{' '}
              <Link className="font-medium text-accent underline-offset-2 hover:underline" to="/inventory/catalog">
                Stock catalog
              </Link>{' '}
              for the full list.
            </p>
          ) : null}
          <p className="mt-4 text-sm">
            <Link
              className="font-medium text-accent underline-offset-2 hover:underline"
              to="/inventory/purchase-requests"
            >
              Open purchase requests →
            </Link>
          </p>
        </section>
      ) : null}

      <RoleDashboardGrid>
        <RoleDashboardCard
          to="purchase-requests"
          title="Purchase requests"
          description="New requests and status."
        />
        <RoleDashboardCard
          to="receiving"
          title="Receiving & verification"
          description="Accept or reject deliveries against open shipments."
        />
        <RoleDashboardCard
          to="levels"
          title="Inventory integration"
          description="On-hand quantities and adjustments."
        />
        <RoleDashboardCard
          to="catalog"
          title="Stock catalog"
          description="Items, categories, and reorder thresholds."
        />
      </RoleDashboardGrid>
    </div>
  )
}
