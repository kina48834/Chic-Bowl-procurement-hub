import type { InventoryLine } from '@/procurement/types'

/** Canonical stock catalog (English). Inventory staff maintains quantities; reorder alerts use reorderThreshold. */
export function getFixedCatalogInventoryLines(
  lastUpdatedIso: string,
): Omit<InventoryLine, 'sourceDeliveryId'>[] {
  const t = lastUpdatedIso
  const mk = (
    id: string,
    name: string,
    category: string,
    quantity: number,
    unit: string,
    reorderThreshold: number,
  ): Omit<InventoryLine, 'sourceDeliveryId'> => ({
    id,
    name,
    category,
    quantity,
    unit,
    lastUpdated: t,
    reorderThreshold,
  })

  return [
    mk('cat-chicken-breast', 'Chicken breast', 'chicken', 80, 'kg', 25),
    mk('cat-flour', 'Flour', 'ingredients', 120, 'kg', 30),
    mk('cat-cornstarch', 'Cornstarch', 'ingredients', 40, 'kg', 15),
    mk('cat-fish-sauce', 'Fish sauce', 'ingredients', 24, 'L', 8),
    mk('cat-oil', 'Cooking oil', 'ingredients', 60, 'L', 20),
    mk('cat-pepper', 'Pepper', 'ingredients', 5, 'kg', 2),
    mk('cat-soda', 'Soda (club / baking)', 'ingredients', 10, 'kg', 4),
    mk('cat-nata', 'Nata de coco', 'ingredients', 15, 'kg', 5),
    mk('cat-rice', 'Rice', 'ingredients', 200, 'kg', 50),
    mk('cat-breadcrumbs', 'Breadcrumbs', 'ingredients', 25, 'kg', 10),
    mk('cat-honey-butter', 'Honey butter sauce', 'ingredients', 8, 'L', 3),
    mk('cat-teriyaki', 'Teriyaki sauce', 'ingredients', 10, 'L', 3),
    mk('cat-buffalo', 'Buffalo sauce', 'ingredients', 10, 'L', 3),
    mk('cat-soygarlic', 'Soy garlic sauce', 'ingredients', 10, 'L', 3),
    mk('cat-sweet-chili', 'Sweet chili sauce', 'ingredients', 10, 'L', 3),
    mk('cat-barbeque', 'Barbecue sauce', 'ingredients', 10, 'L', 3),
    mk('cat-parsley', 'Parsley', 'ingredients', 3, 'kg', 1),
    mk('cat-green-apple', 'Green apple syrup', 'beverages', 6, 'L', 2),
    mk('cat-lychee', 'Lychee syrup', 'beverages', 6, 'L', 2),
    mk('cat-blueberry', 'Blueberry syrup', 'beverages', 6, 'L', 2),
    mk('cat-strawberry', 'Strawberry syrup', 'beverages', 6, 'L', 2),
    mk('cat-mango', 'Mango syrup', 'beverages', 6, 'L', 2),
    mk('cat-lemon', 'Lemon syrup', 'beverages', 6, 'L', 2),
    mk('cat-yakult', 'Yakult', 'beverages', 200, 'bottles', 48),
    mk('cat-gloves', 'Disposable gloves', 'packaging', 40, 'boxes', 10),
    mk('cat-plastic-wrap', 'Plastic wrap', 'packaging', 12, 'rolls', 4),
    mk('cat-paper-bowl', 'Paper bowl', 'packaging', 2000, 'units', 400),
    mk('cat-cup-12oz', '12 oz plastic cup', 'packaging', 3000, 'units', 600),
    mk('cat-cup-16oz', '16 oz plastic cup', 'packaging', 2500, 'units', 500),
    mk('cat-cup-22oz', '22 oz plastic cup', 'packaging', 2000, 'units', 400),
    mk('cat-straw', 'Straws', 'packaging', 10000, 'units', 2000),
    mk('cat-tape', 'Packaging tape', 'packaging', 24, 'rolls', 6),
    mk('cat-gas', 'LPG / cooking gas', 'equipment', 4, 'tanks', 1),
  ]
}
