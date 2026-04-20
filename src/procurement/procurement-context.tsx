import { createContext, useContext } from 'react'
import type {
  BudgetStatus,
  DeliveryStatus,
  InventoryLine,
  PRCategory,
  POStatus,
  ProcurementState,
  PurchaseOrder,
} from '@/procurement/types'

export type ProcurementContextValue = {
  state: ProcurementState
  createPurchaseRequest: (
    input: {
      category: PRCategory
      description: string
      requestReason: string
      quantity: number
      unit: string
    },
    actorEmail: string,
  ) => void
  /** Manager approves only (no reject in this workflow). */
  reviewPurchaseRequest: (id: string, note: string, actorEmail: string) => void
  addSupplier: (
    input: Omit<import('@/procurement/types').Supplier, 'id'>,
    actorEmail: string,
  ) => void
  updateSupplier: (
    id: string,
    patch: Partial<import('@/procurement/types').Supplier>,
    actorEmail: string,
  ) => void
  removeSupplier: (id: string, actorEmail: string) => void
  addQuotation: (
    input: {
      supplierId: string
      title: string
      price: number
      qualityNote: string
      deliveryTerms: string
    },
    actorEmail: string,
  ) => void
  createPurchaseOrder: (
    input: {
      purchaseRequestId: string
      supplierId: string
      itemsSummary: string
      total: number
      inventoryCatalogId?: string
    },
    actorEmail: string,
  ) => { ok: true } | { ok: false; error: string }
  submitPOForApproval: (id: string, actorEmail: string) => void
  updatePurchaseOrderDraft: (
    id: string,
    patch: Partial<
      Pick<PurchaseOrder, 'itemsSummary' | 'total' | 'supplierId' | 'inventoryCatalogId'>
    >,
    actorEmail: string,
  ) => void
  /** Finance approves or returns PO to Purchasing with a note. */
  reviewPurchaseOrder: (
    id: string,
    status: Extract<POStatus, 'approved' | 'returned_by_finance'>,
    note: string,
    actorEmail: string,
  ) => void
  sendPurchaseOrder: (id: string, actorEmail: string) => void
  shipPurchaseOrder: (id: string, actorEmail: string) => void
  receiveDelivery: (
    deliveryId: string,
    input: {
      quantityAccepted: number
      quantityRejected: number
      qualityNotes: string
      outcome: Extract<DeliveryStatus, 'accepted' | 'rejected' | 'partially_accepted'>
      rejectionItemName?: string
      rejectionReason?: string
      photoUrls?: string[]
    },
    actorEmail: string,
  ) => void
  adjustInventoryQuantity: (
    lineId: string,
    quantity: number,
    actorEmail: string,
  ) => void
  createInventoryLine: (
    input: {
      name: string
      category: string
      quantity: number
      unit: string
      reorderThreshold?: number
    },
    actorEmail: string,
  ) => void
  updateInventoryLine: (
    id: string,
    patch: Partial<
      Pick<
        InventoryLine,
        'name' | 'category' | 'quantity' | 'unit' | 'reorderThreshold'
      >
    >,
    actorEmail: string,
  ) => void
  removeInventoryLine: (
    id: string,
    actorEmail: string,
  ) => { ok: true } | { ok: false; error: string }
  createBudgetRequest: (
    input: {
      title: string
      amount: number
      purchaseRequestId?: string
      notes: string
    },
    actorEmail: string,
  ) => void
  reviewBudgetRequest: (
    id: string,
    status: Extract<BudgetStatus, 'approved' | 'denied'>,
    actorEmail: string,
  ) => void
  createPayment: (
    input: {
      supplierId: string
      purchaseOrderId?: string
      amount: number
      reference: string
    },
    actorEmail: string,
  ) => void
  markPaymentPaid: (id: string, actorEmail: string) => void
  updateSettings: (
    patch: Partial<import('@/procurement/types').AppSettings>,
    actorEmail: string,
  ) => void
  adminOverrideNote: (note: string, actorEmail: string) => void
  /** Remove all audit events (admin); persists empty log to Supabase. */
  adminClearAuditLog: () => void
  /** Keep only the newest `keep` entries (admin). */
  adminTrimAuditLog: (keep: number) => void
  /** Set when load or persist fails in Supabase mode. */
  procurementSyncError: string | null
  dismissProcurementSyncError: () => void
  /** False until the first successful procurement load for the signed-in user (then true). */
  procurementCloudHydrated: boolean
}

export const ProcurementContext = createContext<ProcurementContextValue | null>(null)

export function useProcurement() {
  const ctx = useContext(ProcurementContext)
  if (!ctx) {
    throw new Error('useProcurement must be used within ProcurementProvider')
  }
  return ctx
}
