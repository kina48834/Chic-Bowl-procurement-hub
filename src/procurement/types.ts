export type PRStatus = 'pending' | 'approved' | 'rejected'

export type POStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'shipped'
  | 'completed'
  | 'rejected'

export type BudgetStatus = 'pending' | 'approved' | 'denied'

export type PaymentStatus = 'pending' | 'paid'

export type DeliveryStatus = 'pending' | 'accepted' | 'rejected'

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
  managerNote?: string
  /** Optional link to a manager-maintained stock catalog line (for PO / tracking). */
  inventoryCatalogId?: string
}

export type Delivery = {
  id: string
  purchaseOrderId: string
  quantityExpected: number
  quantityReceived: number
  qualityNotes: string
  status: DeliveryStatus
  createdAt: string
}

export type InventoryLine = {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  lastUpdated: string
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
