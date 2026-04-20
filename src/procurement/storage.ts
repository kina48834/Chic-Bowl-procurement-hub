import type { ProcurementState } from '@/procurement/types'
import { getSeedState } from '@/procurement/seed'

const KEY = 'procurement-hub.domain.v1'

function normalizeProcurementState(raw: ProcurementState): ProcurementState {
  return {
    ...raw,
    purchaseRequests: raw.purchaseRequests.map((p) => ({
      ...p,
      requestReason: p.requestReason ?? '',
      status: p.status === 'approved' ? 'approved' : 'pending',
    })),
    purchaseOrders: raw.purchaseOrders.map((po) => ({
      ...po,
      financeNote: po.financeNote ?? po.managerNote,
    })),
    deliveries: raw.deliveries.map((d) => ({
      ...d,
      quantityRejected: d.quantityRejected ?? 0,
    })),
    inventory: raw.inventory.map((i) => ({
      ...i,
      reorderThreshold: i.reorderThreshold ?? 20,
    })),
    payments: raw.payments.map((pay) => ({
      ...pay,
      status:
        pay.status === 'paid'
          ? 'paid'
          : pay.status === 'on_hold'
            ? 'on_hold'
            : 'pending',
    })),
  }
}

/** Empty shell used before Supabase load or when signed out in cloud mode. */
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

function mergeSettingsFromSeed(parsed: ProcurementState, seed: ProcurementState): ProcurementState {
  const s = parsed.settings
  const d = seed.settings
  return {
    ...parsed,
    settings: {
      companyName: s?.companyName ?? d.companyName,
      systemNotes: s?.systemNotes ?? d.systemNotes,
      lastOverrideNote: s?.lastOverrideNote ?? d.lastOverrideNote,
    },
  }
}

export function loadProcurementState(): ProcurementState {
  const seed = getSeedState()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ProcurementState
      if (parsed && Array.isArray(parsed.purchaseRequests)) {
        return mergeSettingsFromSeed(normalizeProcurementState(parsed), seed)
      }
    }
  } catch {
    /* use seed */
  }
  saveProcurementState(seed)
  return seed
}

export function saveProcurementState(state: ProcurementState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}
