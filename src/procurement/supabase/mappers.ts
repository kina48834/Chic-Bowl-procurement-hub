import type {
  AppSettings,
  AuditEntry,
  BudgetRequest,
  Delivery,
  InventoryLine,
  Payment,
  ProcurementState,
  PurchaseOrder,
  PurchaseRequest,
  Quotation,
  Supplier,
} from '@/procurement/types'

export function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function mapSettingsRow(row: {
  company_name: string
  system_notes: string
  last_override_note: string
}): AppSettings {
  return {
    companyName: row.company_name ?? '',
    systemNotes: row.system_notes ?? '',
    lastOverrideNote: row.last_override_note ?? '',
  }
}

function mapSupplierRow(row: Record<string, unknown>): Supplier {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    contact: String(row.contact ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    pricingNotes: String(row.pricing_notes ?? ''),
    reliability: Math.min(5, Math.max(1, num(row.reliability))) as Supplier['reliability'],
    active: Boolean(row.active),
  }
}

function mapPRRow(row: Record<string, unknown>): PurchaseRequest {
  const rawStatus = String(row.status ?? 'pending')
  const status: PurchaseRequest['status'] =
    rawStatus === 'approved' ? 'approved' : 'pending'
  return {
    id: String(row.id),
    category: row.category as PurchaseRequest['category'],
    description: String(row.description ?? ''),
    requestReason: String(row.request_reason ?? ''),
    quantity: num(row.quantity),
    unit: String(row.unit ?? ''),
    status,
    requestedByEmail: String(row.requested_by_email ?? ''),
    createdAt: String(row.created_at ?? ''),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
    reviewNote: row.review_note ? String(row.review_note) : undefined,
  }
}

function mapQuotationRow(row: Record<string, unknown>): Quotation {
  return {
    id: String(row.id),
    supplierId: String(row.supplier_id ?? ''),
    title: String(row.title ?? ''),
    price: num(row.price),
    qualityNote: String(row.quality_note ?? ''),
    deliveryTerms: String(row.delivery_terms ?? ''),
    createdAt: String(row.created_at ?? ''),
  }
}

function mapPORow(row: Record<string, unknown>): PurchaseOrder {
  const financeNote = row.finance_note ? String(row.finance_note) : undefined
  const managerNote = row.manager_note ? String(row.manager_note) : undefined
  return {
    id: String(row.id),
    purchaseRequestId: String(row.purchase_request_id ?? ''),
    supplierId: String(row.supplier_id ?? ''),
    itemsSummary: String(row.items_summary ?? ''),
    total: num(row.total),
    status: row.status as PurchaseOrder['status'],
    createdAt: String(row.created_at ?? ''),
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    shippedAt: row.shipped_at ? String(row.shipped_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    financeNote: financeNote ?? managerNote,
    managerNote,
    inventoryCatalogId: row.inventory_catalog_id
      ? String(row.inventory_catalog_id)
      : undefined,
  }
}

function mapDeliveryRow(row: Record<string, unknown>): Delivery {
  let photoUrls: string[] | undefined
  if (row.photo_urls != null) {
    try {
      const p = row.photo_urls
      if (Array.isArray(p)) {
        photoUrls = p.map(String)
      } else if (typeof p === 'string' && p.trim()) {
        photoUrls = JSON.parse(p) as string[]
      }
    } catch {
      photoUrls = undefined
    }
  }
  return {
    id: String(row.id),
    purchaseOrderId: String(row.purchase_order_id ?? ''),
    quantityExpected: num(row.quantity_expected),
    quantityReceived: num(row.quantity_received),
    quantityRejected: num(row.quantity_rejected),
    qualityNotes: String(row.quality_notes ?? ''),
    status: row.status as Delivery['status'],
    createdAt: String(row.created_at ?? ''),
    rejectionItemName: row.rejection_item_name
      ? String(row.rejection_item_name)
      : undefined,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    photoUrls,
  }
}

function mapInventoryRow(row: Record<string, unknown>): InventoryLine {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    quantity: num(row.quantity),
    unit: String(row.unit ?? ''),
    lastUpdated: String(row.last_updated ?? ''),
    reorderThreshold: num(row.reorder_threshold ?? 20),
    sourceDeliveryId: row.source_delivery_id
      ? String(row.source_delivery_id)
      : undefined,
  }
}

function mapBudgetRow(row: Record<string, unknown>): BudgetRequest {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    amount: num(row.amount),
    purchaseRequestId: row.purchase_request_id
      ? String(row.purchase_request_id)
      : undefined,
    status: row.status as BudgetRequest['status'],
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at ?? ''),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
  }
}

function mapPaymentRow(row: Record<string, unknown>): Payment {
  const st = String(row.status ?? 'pending')
  const status: Payment['status'] =
    st === 'paid' ? 'paid' : st === 'on_hold' ? 'on_hold' : 'pending'
  return {
    id: String(row.id),
    supplierId: String(row.supplier_id ?? ''),
    purchaseOrderId: row.purchase_order_id ? String(row.purchase_order_id) : undefined,
    amount: num(row.amount),
    status,
    reference: String(row.reference ?? ''),
    createdAt: String(row.created_at ?? ''),
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    holdReason: row.hold_reason ? String(row.hold_reason) : undefined,
  }
}

function mapAuditRow(row: Record<string, unknown>): AuditEntry {
  return {
    id: String(row.id),
    at: String(row.at ?? ''),
    actorEmail: String(row.actor_email ?? ''),
    action: String(row.action ?? ''),
    detail: String(row.detail ?? ''),
  }
}

export function procurementStateFromSupabaseRows(input: {
  settings: Record<string, unknown> | null
  suppliers: Record<string, unknown>[] | null
  purchaseRequests: Record<string, unknown>[] | null
  quotations: Record<string, unknown>[] | null
  purchaseOrders: Record<string, unknown>[] | null
  deliveries: Record<string, unknown>[] | null
  inventory: Record<string, unknown>[] | null
  budgetRequests: Record<string, unknown>[] | null
  payments: Record<string, unknown>[] | null
  auditLog: Record<string, unknown>[] | null
}): ProcurementState {
  const settingsRow = input.settings
  return {
    settings: settingsRow
      ? mapSettingsRow(settingsRow as Parameters<typeof mapSettingsRow>[0])
      : { companyName: '', systemNotes: '', lastOverrideNote: '' },
    suppliers: (input.suppliers ?? []).map(mapSupplierRow),
    purchaseRequests: (input.purchaseRequests ?? []).map(mapPRRow),
    quotations: (input.quotations ?? []).map(mapQuotationRow),
    purchaseOrders: (input.purchaseOrders ?? []).map(mapPORow),
    deliveries: (input.deliveries ?? []).map(mapDeliveryRow),
    inventory: (input.inventory ?? []).map(mapInventoryRow),
    budgetRequests: (input.budgetRequests ?? []).map(mapBudgetRow),
    payments: (input.payments ?? []).map(mapPaymentRow),
    auditLog: (input.auditLog ?? []).map(mapAuditRow),
  }
}

const nowIso = () => new Date().toISOString()

export function supplierToRow(s: Supplier): Record<string, unknown> {
  return {
    id: s.id,
    name: s.name,
    contact: s.contact,
    email: s.email,
    phone: s.phone,
    pricing_notes: s.pricingNotes,
    reliability: s.reliability,
    active: s.active,
    updated_at: nowIso(),
  }
}

export function purchaseRequestToRow(p: PurchaseRequest): Record<string, unknown> {
  return {
    id: p.id,
    category: p.category,
    description: p.description,
    request_reason: p.requestReason,
    quantity: p.quantity,
    unit: p.unit,
    status: p.status,
    requested_by_email: p.requestedByEmail,
    created_at: p.createdAt,
    reviewed_at: p.reviewedAt ?? null,
    review_note: p.reviewNote ?? null,
  }
}

export function quotationToRow(q: Quotation): Record<string, unknown> {
  return {
    id: q.id,
    supplier_id: q.supplierId,
    title: q.title,
    price: q.price,
    quality_note: q.qualityNote,
    delivery_terms: q.deliveryTerms,
    created_at: q.createdAt,
  }
}

export function purchaseOrderToRow(po: PurchaseOrder): Record<string, unknown> {
  return {
    id: po.id,
    purchase_request_id: po.purchaseRequestId,
    supplier_id: po.supplierId,
    items_summary: po.itemsSummary,
    total: po.total,
    status: po.status,
    created_at: po.createdAt,
    sent_at: po.sentAt ?? null,
    shipped_at: po.shippedAt ?? null,
    completed_at: po.completedAt ?? null,
    finance_note: po.financeNote ?? po.managerNote ?? null,
    manager_note: null,
    inventory_catalog_id: po.inventoryCatalogId ?? null,
  }
}

export function deliveryToRow(d: Delivery): Record<string, unknown> {
  return {
    id: d.id,
    purchase_order_id: d.purchaseOrderId,
    quantity_expected: d.quantityExpected,
    quantity_received: d.quantityReceived,
    quantity_rejected: d.quantityRejected,
    quality_notes: d.qualityNotes,
    status: d.status,
    created_at: d.createdAt,
    rejection_item_name: d.rejectionItemName ?? null,
    rejection_reason: d.rejectionReason ?? null,
    photo_urls: d.photoUrls?.length ? JSON.stringify(d.photoUrls) : null,
  }
}

export function inventoryLineToRow(i: InventoryLine): Record<string, unknown> {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    quantity: i.quantity,
    unit: i.unit,
    last_updated: i.lastUpdated,
    reorder_threshold: i.reorderThreshold,
    source_delivery_id: i.sourceDeliveryId ?? null,
  }
}

export function budgetRequestToRow(b: BudgetRequest): Record<string, unknown> {
  return {
    id: b.id,
    title: b.title,
    amount: b.amount,
    purchase_request_id: b.purchaseRequestId ?? null,
    status: b.status,
    notes: b.notes,
    created_at: b.createdAt,
    reviewed_at: b.reviewedAt ?? null,
  }
}

export function paymentToRow(p: Payment): Record<string, unknown> {
  return {
    id: p.id,
    supplier_id: p.supplierId,
    purchase_order_id: p.purchaseOrderId ?? null,
    amount: p.amount,
    status: p.status,
    reference: p.reference,
    hold_reason: p.holdReason ?? null,
    created_at: p.createdAt,
    paid_at: p.paidAt ?? null,
  }
}

export function auditEntryToRow(a: AuditEntry): Record<string, unknown> {
  return {
    id: a.id,
    at: a.at,
    actor_email: a.actorEmail,
    action: a.action,
    detail: a.detail,
  }
}
