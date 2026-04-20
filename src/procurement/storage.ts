import type { ProcurementState } from '@/procurement/types'

const LEGACY_KEY = 'procurement-hub.domain.v1'

/** Empty shell before Supabase load or when signed out. */
export function emptyProcurementState(): ProcurementState {
  return {
    purchaseRequests: [],
    suppliers: [],
    quotations: [],
    purchaseOrders: [],
    deliveries: [],
    inventory: [],
    budgetRequests: [],
    payments: [],
    auditLog: [],
    settings: {
      companyName: '',
      systemNotes: '',
      lastOverrideNote: '',
    },
  }
}

/** Clears any legacy browser snapshot from older app versions (this app is Supabase-only). */
export function clearProcurementLocalStorage() {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
}
