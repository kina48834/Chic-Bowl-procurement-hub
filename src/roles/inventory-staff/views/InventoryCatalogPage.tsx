import { InventoryManagementPage } from '@/roles/manager/views/InventoryManagementPage'

type InventoryCatalogPageProps = {
  inventoryContext?: 'inventory-staff' | 'admin'
}

export function InventoryCatalogPage({
  inventoryContext = 'inventory-staff',
}: InventoryCatalogPageProps) {
  return <InventoryManagementPage inventoryContext={inventoryContext} />
}
