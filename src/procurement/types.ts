export type PRStatus = 'pending' | 'approved'

export type POStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'returned_by_finance'
  | 'sent'
  | 'shipped'
  | 'waiting_replacement'
  | 'completed'
  /** Legacy / migration only */
  | 'rejected'

export type BudgetStatus = 'pending' | 'approved' | 'denied'

export type PaymentStatus = 'pending' | 'paid' | 'on_hold'

export type DeliveryStatus = 'pending' | 'accepted' | 'rejected' | 'partially_accepted'

export type PRCategory =
  | 'chicken'
  | 'ingredients'
  | 'packaging'
  | 'equipment'
  | 'beverages'
  | 'cleaning'
  | 'frozen'
  | 'dry_goods'
  | 'other'

export type PurchaseRequest = {
  id: string
  category: PRCategory
  description: string
  /** Why inventory needs this item (required for operational traceability). */
  requestReason: string
  quantity: number
  unit: string
  status: PRStatus
  requestedByEmail: string
  createdAt: string
  reviewedAt?: string
  reviewNote?: string
}

export type Supplier = {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  pricingNotes: string
  reliability: 1 | 2 | 3 | 4 | 5
  active: boolean
}

export type Quotation = {
  id: string
  supplierId: string
  title: string
  price: number
  qualityNote: string
  deliveryTerms: string
  createdAt: string
}

export type PurchaseOrder = {
  id: string
  purchaseRequestId: string
  supplierId: string
  itemsSummary: string
  total: number
  status: POStatus
  createdAt: string
  sentAt?: string
  shippedAt?: string
  completedAt?: string
  /** Finance approval / return notes (preferred). */
  financeNote?: string
  /** @deprecated Use financeNote; still read from DB column manager_note for older rows. */
  managerNote?: string
  /** Optional link to an inventory-staff-maintained stock catalog line (for PO / tracking). */
  inventoryCatalogId?: string
}

export type Delivery = {
  id: string
  purchaseOrderId: string
  quantityExpected: number
  /** Quantity accepted into good stock (or full accept amount). */
  quantityReceived: number
  /** Quantity rejected (damage, wrong item, etc.). */
  quantityRejected: number
  qualityNotes: string
  status: DeliveryStatus
  createdAt: string
  /** Report: primary item name when rejecting or partial reject. */
  rejectionItemName?: string
  /** Report: reason (e.g. damaged, expired, wrong item). */
  rejectionReason?: string
  /** Optional photo URLs (paste links), JSON string array in DB. */
  photoUrls?: string[]
}

export type InventoryLine = {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  lastUpdated: string
  /** When on-hand quantity is at or below this value, inventory sees a low-stock alert. */
  reorderThreshold: number
  sourceDeliveryId?: string
}

export type BudgetRequest = {
  id: string
  title: string
  amount: number
  purchaseRequestId?: string
  status: BudgetStatus
  notes: string
  createdAt: string
  reviewedAt?: string
}

export type Payment = {
  id: string
  supplierId: string
  purchaseOrderId?: string
  amount: number
  status: PaymentStatus
  reference: string
  createdAt: string
  paidAt?: string
  /** When on hold (e.g. delivery rejected, awaiting replacement). */
  holdReason?: string
}

export type AuditEntry = {
  id: string
  at: string
  actorEmail: string
  action: string
  detail: string
}

export type AppSettings = {
  companyName: string
  /** Platform and access policy text maintained by admins (identity, data, currency, etc.). */
  systemNotes: string
  lastOverrideNote: string
}

export type ProcurementState = {
  purchaseRequests: PurchaseRequest[]
  suppliers: Supplier[]
  quotations: Quotation[]
  purchaseOrders: PurchaseOrder[]
  deliveries: Delivery[]
  inventory: InventoryLine[]
  budgetRequests: BudgetRequest[]
  payments: Payment[]
  auditLog: AuditEntry[]
  settings: AppSettings
}
