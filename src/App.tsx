import { Navigate, Route, Routes } from 'react-router-dom'
import { RoleGate } from '@/auth/RoleGate'
import { PublicOnly } from '@/auth/PublicOnly'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppShell } from '@/shared/layout/AppShell'
import { RoleLayout } from '@/shared/layout/RoleLayout'
import { adminMeta, adminNav } from '@/roles/admin/config'
import { AdminDashboardPage } from '@/roles/admin/DashboardPage'
import { AuditLogPage } from '@/roles/admin/AuditLogPage'
import { ReportsAdminPage } from '@/roles/admin/ReportsAdminPage'
import { SuppliersAdminPage } from '@/roles/admin/SuppliersAdminPage'
import { SystemSettingsPage } from '@/roles/admin/SystemSettingsPage'
import { UserManagementPage } from '@/roles/admin/user-management/UserManagementPage'
import { financeMeta, financeNav } from '@/roles/finance/config'
import { FinanceDashboardPage } from '@/roles/finance/DashboardPage'
import { BudgetReviewPage } from '@/roles/finance/BudgetReviewPage'
import { FinanceReportsPage } from '@/roles/finance/FinanceReportsPage'
import { FinancePurchaseOrderApprovalsPage } from '@/roles/finance/PurchaseOrderApprovalsPage'
import { PaymentsPage } from '@/roles/finance/PaymentsPage'
import { inventoryStaffMeta, inventoryStaffNav } from '@/roles/inventory-staff/config'
import { InventoryStaffDashboardPage } from '@/roles/inventory-staff/DashboardPage'
import { InventoryCatalogPage } from '@/roles/inventory-staff/InventoryCatalogPage'
import { InventoryLevelsPage } from '@/roles/inventory-staff/InventoryLevelsPage'
import { PurchaseRequestsPage } from '@/roles/inventory-staff/PurchaseRequestsPage'
import { ReceivingPage } from '@/roles/inventory-staff/ReceivingPage'
import { managerMeta, managerNav } from '@/roles/manager/config'
import { ManagerDashboardPage } from '@/roles/manager/DashboardPage'
import { OrderMonitoringPage } from '@/roles/manager/OrderMonitoringPage'
import { ReportsPage as ManagerReportsPage } from '@/roles/manager/ReportsPage'
import { RequestApprovalsPage } from '@/roles/manager/RequestApprovalsPage'
import { purchasingMeta, purchasingNav } from '@/roles/purchasing/config'
import { PurchasingDashboardPage } from '@/roles/purchasing/DashboardPage'
import { OrderTrackingPage } from '@/roles/purchasing/OrderTrackingPage'
import { PurchaseOrdersPage } from '@/roles/purchasing/PurchaseOrdersPage'
import { QuotationsPage } from '@/roles/purchasing/QuotationsPage'
import { SuppliersPage } from '@/roles/purchasing/SuppliersPage'
import { AuthLayout } from '@/layouts/AuthLayout'
import { RedirectToRoleDashboard } from '@/routes/RedirectToRoleDashboard'
import { PublicHomeEntry } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { CatchAllRedirect } from '@/routes/CatchAllRedirect'
import { WorkspaceProfilePage } from '@/shared/pages/WorkspaceProfilePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHomeEntry />} />
      <Route element={<PublicOnly />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
        </Route>
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/app" element={<RedirectToRoleDashboard />} />
          <Route
            path="/inventory"
            element={
              <RoleGate allow={['inventory-staff', 'admin']}>
                <RoleLayout role={inventoryStaffMeta} nav={inventoryStaffNav} />
              </RoleGate>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<InventoryStaffDashboardPage />} />
            <Route path="purchase-requests" element={<PurchaseRequestsPage />} />
            <Route path="receiving" element={<ReceivingPage />} />
            <Route path="levels" element={<InventoryLevelsPage />} />
            <Route path="catalog" element={<InventoryCatalogPage />} />
            <Route path="profile" element={<WorkspaceProfilePage />} />
          </Route>
          <Route
            path="/purchasing"
            element={
              <RoleGate allow={['purchasing', 'admin']}>
                <RoleLayout role={purchasingMeta} nav={purchasingNav} />
              </RoleGate>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PurchasingDashboardPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="order-tracking" element={<OrderTrackingPage />} />
            <Route path="profile" element={<WorkspaceProfilePage />} />
          </Route>
          <Route
            path="/manager"
            element={
              <RoleGate allow={['manager', 'admin']}>
                <RoleLayout role={managerMeta} nav={managerNav} />
              </RoleGate>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ManagerDashboardPage />} />
            <Route path="approvals/requests" element={<RequestApprovalsPage />} />
            <Route path="reports" element={<ManagerReportsPage />} />
            <Route path="orders" element={<OrderMonitoringPage />} />
            <Route path="profile" element={<WorkspaceProfilePage />} />
          </Route>
          <Route
            path="/finance"
            element={
              <RoleGate allow={['finance', 'admin']}>
                <RoleLayout role={financeMeta} nav={financeNav} />
              </RoleGate>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FinanceDashboardPage />} />
            <Route path="budget" element={<BudgetReviewPage />} />
            <Route
              path="po-approvals"
              element={<FinancePurchaseOrderApprovalsPage />}
            />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="reports" element={<FinanceReportsPage />} />
            <Route path="profile" element={<WorkspaceProfilePage />} />
          </Route>
          <Route
            path="/admin"
            element={
              <RoleGate allow={['admin']}>
                <RoleLayout role={adminMeta} nav={adminNav} />
              </RoleGate>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="user-management" element={<UserManagementPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
            <Route
              path="inventory"
              element={<InventoryCatalogPage inventoryContext="admin" />}
            />
            <Route path="suppliers" element={<SuppliersAdminPage />} />
            <Route path="reports" element={<ReportsAdminPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="profile" element={<WorkspaceProfilePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  )
}
