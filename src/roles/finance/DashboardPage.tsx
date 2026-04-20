import { Link } from 'react-router-dom'
import { useProcurement } from '@/procurement/ProcurementProvider'
import {
  RoleDashboardCard,
  RoleDashboardGrid,
  RoleDashboardHeader,
} from '@/shared/components/role-dashboard'
export function FinanceDashboardPage() {
  const { state } = useProcurement()

  const pendingPoApproval = state.purchaseOrders.filter((p) => p.status === 'pending_approval')
    .length
  const payablesReady = state.payments.filter((p) => p.status === 'pending' && p.purchaseOrderId)
    .length
  const onHold = state.payments.filter((p) => p.status === 'on_hold').length

  return (
    <div className="space-y-10">
      <RoleDashboardHeader
        title="Finance control"
        subtitle="Purchase order approval, budgets, supplier payments, and reports."
      />

      {(pendingPoApproval > 0 || payablesReady > 0 || onHold > 0) && (
        <section className="rounded-2xl border border-border bg-surface-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Attention</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            {pendingPoApproval > 0 ? (
              <li>
                <Link className="font-medium text-accent hover:underline" to="/finance/po-approvals">
                  {pendingPoApproval} purchase order{pendingPoApproval === 1 ? '' : 's'} awaiting Finance
                  approval
                </Link>
              </li>
            ) : null}
            {payablesReady > 0 ? (
              <li>
                <Link className="font-medium text-accent hover:underline" to="/finance/payments">
                  {payablesReady} supplier payable{payablesReady === 1 ? '' : 's'} pending payment
                </Link>
              </li>
            ) : null}
            {onHold > 0 ? (
              <li className="text-danger-ink">
                {onHold} payment{onHold === 1 ? '' : 's'} on hold
              </li>
            ) : null}
          </ul>
        </section>
      )}

      <RoleDashboardGrid>
        <RoleDashboardCard
          to="po-approvals"
          title="PO approval"
          description="Approve or return purchase orders."
        />
        <RoleDashboardCard
          to="budget"
          title="Budget review"
          description="Budget requests and decisions."
        />
        <RoleDashboardCard
          to="payments"
          title="Supplier payments"
          description="Payables and settlement."
        />
        <RoleDashboardCard
          to="reports"
          title="Financial reports"
          description="Spend, payables, and liabilities."
        />
      </RoleDashboardGrid>
    </div>
  )
}
