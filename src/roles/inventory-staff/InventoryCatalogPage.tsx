import { InventoryManagementPage } from '@/roles/manager/InventoryManagementPage'

type InventoryCatalogPageProps = {
  inventoryContext?: 'inventory-staff' | 'admin'
}

export function InventoryCatalogPage({
  inventoryContext = 'inventory-staff',
}: InventoryCatalogPageProps) {
  return <InventoryManagementPage inventoryContext={inventoryContext} />
}
