import type { PRCategory } from '@/procurement/types'

/** Categories shared by purchase requests and the manager stock catalog. */
export const STOCK_CATALOG_CATEGORY_OPTIONS: { value: PRCategory; label: string }[] = [
  { value: 'chicken', label: 'Chicken' },
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'cleaning', label: 'Cleaning / sanitation' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'dry_goods', label: 'Dry goods' },
  { value: 'other', label: 'Other' },
]
