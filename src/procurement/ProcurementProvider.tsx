import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/auth/useAuth'
import type {
  BudgetStatus,
  DeliveryStatus,
  PRCategory,
  POStatus,
  ProcurementState,
  PRStatus,
} from '@/procurement/types'
import {
  emptyProcurementState,
  loadProcurementState,
  saveProcurementState,
} from '@/procurement/storage'
import { loadProcurementFromSupabase, persistProcurementToSupabase } from '@/procurement/supabase/sync'
import { isSupabaseConfigured } from '@/lib/supabaseClient'

function audit(
  state: ProcurementState,
  actorEmail: string,
  action: string,
  detail: string,
): ProcurementState {
  const entry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actorEmail,
    action,
    detail,
  }
  return {
    ...state,
    auditLog: [entry, ...state.auditLog].slice(0, 500),
  }
}

function commit(next: ProcurementState) {
  if (isSupabaseConfigured()) {
    void persistProcurementToSupabase(next).catch((err) => {
      console.error('Supabase procurement sync failed', err)
    })
  } else {
    saveProcurementState(next)
  }
  return next
}

export type ProcurementContextValue = {
  state: ProcurementState
  createPurchaseRequest: (
    input: {
      category: PRCategory
      description: string
      quantity: number
      unit: string
    },
    actorEmail: string,
  ) => void
  reviewPurchaseRequest: (
    id: string,
    status: Extract<PRStatus, 'approved' | 'rejected'>,
    note: string,
    actorEmail: string,
  ) => void
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
  reviewPurchaseOrder: (
    id: string,
    status: Extract<POStatus, 'approved' | 'rejected'>,
    note: string,
    actorEmail: string,
  ) => void
  sendPurchaseOrder: (id: string, actorEmail: string) => void
  shipPurchaseOrder: (id: string, actorEmail: string) => void
  receiveDelivery: (
    deliveryId: string,
    quantityReceived: number,
    qualityNotes: string,
    outcome: Extract<DeliveryStatus, 'accepted' | 'rejected'>,
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
    },
    actorEmail: string,
  ) => void
  updateInventoryLine: (
    id: string,
    patch: Partial<
      Pick<
        import('@/procurement/types').InventoryLine,
        'name' | 'category' | 'quantity' | 'unit'
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
}

const ProcurementContext = createContext<ProcurementContextValue | null>(null)

export function ProcurementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<ProcurementState>(() =>
    isSupabaseConfigured() ? emptyProcurementState() : loadProcurementState(),
  )

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let cancelled = false
    if (!user) {
      void Promise.resolve().then(() => {
        if (!cancelled) setState(emptyProcurementState())
      })
      return () => {
        cancelled = true
      }
    }
    void loadProcurementFromSupabase()
      .then((next) => {
        if (!cancelled) setState(next)
      })
      .catch((err) => {
        console.error('loadProcurementFromSupabase', err)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when auth user id changes
  }, [user?.id])

  const createPurchaseRequest = useCallback(
    (
      input: {
        category: PRCategory
        description: string
        quantity: number
        unit: string
      },
      actorEmail: string,
    ) => {
      setState((prev) => {
        const pr = {
          id: crypto.randomUUID(),
          category: input.category,
          description: input.description,
          quantity: input.quantity,
          unit: input.unit,
          status: 'pending' as const,
          requestedByEmail: actorEmail,
          createdAt: new Date().toISOString(),
        }
        let next: ProcurementState = {
          ...prev,
          purchaseRequests: [...prev.purchaseRequests, pr],
        }
        next = audit(next, actorEmail, 'Purchase request created', pr.description)
        return commit(next)
      })
    },
    [],
  )

  const reviewPurchaseRequest = useCallback(
    (
      id: string,
      status: Extract<PRStatus, 'approved' | 'rejected'>,
      note: string,
      actorEmail: string,
    ) => {
      setState((prev) => {
        const idx = prev.purchaseRequests.findIndex((p) => p.id === id)
        if (idx === -1) return prev
        const row = prev.purchaseRequests[idx]
        const updated = {
          ...row,
          status,
          reviewedAt: new Date().toISOString(),
          reviewNote: note,
        }
        const purchaseRequests = [...prev.purchaseRequests]
        purchaseRequests[idx] = updated
        let next = { ...prev, purchaseRequests }
        next = audit(
          next,
          actorEmail,
          `PR ${status}`,
          `${row.description}: ${note || '—'}`,
        )
        return commit(next)
      })
    },
    [],
  )

  const addSupplier = useCallback(
    (
      input: Omit<import('@/procurement/types').Supplier, 'id'>,
      actorEmail: string,
    ) => {
      setState((prev) => {
        const s = { ...input, id: crypto.randomUUID() }
        let next = { ...prev, suppliers: [...prev.suppliers, s] }
        next = audit(next, actorEmail, 'Supplier added', s.name)
        return commit(next)
      })
    },
    [],
  )

  const updateSupplier = useCallback(
    (
      id: string,
      patch: Partial<import('@/procurement/types').Supplier>,
      actorEmail: string,
    ) => {
      setState((prev) => {
        const suppliers = prev.suppliers.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        )
        let next = { ...prev, suppliers }
        next = audit(next, actorEmail, 'Supplier updated', id)
        return commit(next)
      })
    },
    [],
  )

  const removeSupplier = useCallback((id: string, actorEmail: string) => {
    setState((prev) => {
      let next = {
        ...prev,
        suppliers: prev.suppliers.map((s) =>
          s.id === id ? { ...s, active: false } : s,
        ),
      }
      next = audit(next, actorEmail, 'Supplier deactivated', id)
      return commit(next)
    })
  }, [])

  const addQuotation = useCallback(
    (
      input: {
        supplierId: string
        title: string
        price: number
        qualityNote: string
        deliveryTerms: string
      },
      actorEmail: string,
    ) => {
      setState((prev) => {
        const q = {
          id: crypto.randomUUID(),
          supplierId: input.supplierId,
          title: input.title,
          price: input.price,
          qualityNote: input.qualityNote,
          deliveryTerms: input.deliveryTerms,
          createdAt: new Date().toISOString(),
        }
        let next = { ...prev, quotations: [...prev.quotations, q] }
        next = audit(next, actorEmail, 'Quotation recorded', q.title)
        return commit(next)
      })
    },
    [],
  )

  const createPurchaseOrder = useCallback(
    (
      input: {
        purchaseRequestId: string
        supplierId: string
        itemsSummary: string
        total: number
        inventoryCatalogId?: string
      },
      actorEmail: string,
    ): { ok: true } | { ok: false; error: string } => {
      let err = ''
      setState((prev) => {
        const pr = prev.purchaseRequests.find((p) => p.id === input.purchaseRequestId)
        if (!pr || pr.status !== 'approved') {
          err = 'Purchase request must be approved first.'
          return prev
        }
        if (input.inventoryCatalogId) {
          const cat = prev.inventory.find((i) => i.id === input.inventoryCatalogId)
          if (!cat) {
            err = 'Selected stock catalog item no longer exists.'
            return prev
          }
        }
        const po = {
          id: crypto.randomUUID(),
          purchaseRequestId: input.purchaseRequestId,
          supplierId: input.supplierId,
          itemsSummary: input.itemsSummary,
          total: input.total,
          status: 'draft' as const,
          createdAt: new Date().toISOString(),
          ...(input.inventoryCatalogId
            ? { inventoryCatalogId: input.inventoryCatalogId }
            : {}),
        }
        let next: ProcurementState = {
          ...prev,
          purchaseOrders: [...prev.purchaseOrders, po],
        }
        next = audit(next, actorEmail, 'PO created (draft)', po.itemsSummary)
        return commit(next)
      })
      return err ? { ok: false as const, error: err } : { ok: true as const }
    },
    [],
  )

  const submitPOForApproval = useCallback((id: string, actorEmail: string) => {
    setState((prev) => {
      const pos = prev.purchaseOrders.map((p) =>
        p.id === id && p.status === 'draft'
          ? { ...p, status: 'pending_approval' as const }
          : p,
      )
      let next = { ...prev, purchaseOrders: pos }
      next = audit(next, actorEmail, 'PO submitted for approval', id)
      return commit(next)
    })
  }, [])

  const reviewPurchaseOrder = useCallback(
    (
      id: string,
      status: Extract<POStatus, 'approved' | 'rejected'>,
      note: string,
      actorEmail: string,
    ) => {
      setState((prev) => {
        const pos = prev.purchaseOrders.map((p) =>
          p.id === id && p.status === 'pending_approval'
            ? {
                ...p,
                status,
                managerNote: note,
              }
            : p,
        )
        let next = { ...prev, purchaseOrders: pos }
        next = audit(next, actorEmail, `PO ${status}`, `${id}: ${note || '—'}`)
        return commit(next)
      })
    },
    [],
  )

  const sendPurchaseOrder = useCallback((id: string, actorEmail: string) => {
    setState((prev) => {
      const pos = prev.purchaseOrders.map((p) =>
        p.id === id && p.status === 'approved'
          ? {
              ...p,
              status: 'sent' as const,
              sentAt: new Date().toISOString(),
            }
          : p,
      )
      let next = { ...prev, purchaseOrders: pos }
      next = audit(next, actorEmail, 'PO sent to supplier', id)
      return commit(next)
    })
  }, [])

  const shipPurchaseOrder = useCallback((id: string, actorEmail: string) => {
    setState((prev) => {
      const po = prev.purchaseOrders.find((p) => p.id === id)
      if (!po || po.status !== 'sent') return prev
      const pos = prev.purchaseOrders.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'shipped' as const,
              shippedAt: new Date().toISOString(),
            }
          : p,
      )
      const delivery = {
        id: crypto.randomUUID(),
        purchaseOrderId: id,
        quantityExpected: 1,
        quantityReceived: 0,
        qualityNotes: '',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      }
      let next: ProcurementState = {
        ...prev,
        purchaseOrders: pos,
        deliveries: [...prev.deliveries, delivery],
      }
      next = audit(next, actorEmail, 'PO marked shipped; delivery opened', id)
      return commit(next)
    })
  }, [])

  const receiveDelivery = useCallback(
    (
      deliveryId: string,
      quantityReceived: number,
      qualityNotes: string,
      outcome: Extract<DeliveryStatus, 'accepted' | 'rejected'>,
      actorEmail: string,
    ) => {
      setState((prev) => {
        const dIdx = prev.deliveries.findIndex((d) => d.id === deliveryId)
        if (dIdx === -1) return prev
        const d = prev.deliveries[dIdx]
        if (d.status !== 'pending') return prev
        const deliveries = [...prev.deliveries]
        deliveries[dIdx] = {
          ...d,
          quantityReceived,
          qualityNotes,
          status: outcome,
        }
        let next: ProcurementState = { ...prev, deliveries }
        const po = prev.purchaseOrders.find((p) => p.id === d.purchaseOrderId)
        if (outcome === 'accepted' && po) {
          const pos = prev.purchaseOrders.map((p) =>
            p.id === po.id
              ? {
                  ...p,
                  status: 'completed' as const,
                  completedAt: new Date().toISOString(),
                }
              : p,
          )
          const invName = po.itemsSummary.slice(0, 80)
          const invLine = {
            id: crypto.randomUUID(),
            name: invName,
            category: 'received',
            quantity: quantityReceived || 1,
            unit: 'units',
            lastUpdated: new Date().toISOString(),
            sourceDeliveryId: deliveryId,
          }
          next = {
            ...next,
            purchaseOrders: pos,
            inventory: [...next.inventory, invLine],
          }
        }
        next = audit(
          next,
          actorEmail,
          `Receiving ${outcome}`,
          `Delivery ${deliveryId}`,
        )
        return commit(next)
      })
    },
    [],
  )

  const adjustInventoryQuantity = useCallback(
    (lineId: string, quantity: number, actorEmail: string) => {
      setState((prev) => {
        const inventory = prev.inventory.map((row) =>
          row.id === lineId
            ? {
                ...row,
                quantity,
                lastUpdated: new Date().toISOString(),
              }
            : row,
        )
        let next = { ...prev, inventory }
        next = audit(next, actorEmail, 'Inventory adjusted', lineId)
        return commit(next)
      })
    },
    [],
  )

  const createInventoryLine = useCallback(
    (
      input: { name: string; category: string; quantity: number; unit: string },
      actorEmail: string,
    ) => {
      setState((prev) => {
        const line = {
          id: crypto.randomUUID(),
          name: input.name.trim(),
          category: (input.category.trim() || 'general').slice(0, 64),
          quantity: Math.max(0, input.quantity),
          unit: (input.unit.trim() || 'unit').slice(0, 32),
          lastUpdated: new Date().toISOString(),
        }
        let next: ProcurementState = {
          ...prev,
          inventory: [...prev.inventory, line],
        }
        next = audit(next, actorEmail, 'Stock catalog item added', line.name)
        return commit(next)
      })
    },
    [],
  )

  const updateInventoryLine = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          import('@/procurement/types').InventoryLine,
          'name' | 'category' | 'quantity' | 'unit'
        >
      >,
      actorEmail: string,
    ) => {
      setState((prev) => {
        const idx = prev.inventory.findIndex((r) => r.id === id)
        if (idx === -1) return prev
        const row = prev.inventory[idx]
        const updated = {
          ...row,
          ...(patch.name !== undefined ? { name: String(patch.name).trim() } : {}),
          ...(patch.category !== undefined
            ? { category: String(patch.category).trim().slice(0, 64) }
            : {}),
          ...(patch.quantity !== undefined
            ? { quantity: Math.max(0, Number(patch.quantity)) }
            : {}),
          ...(patch.unit !== undefined
            ? { unit: String(patch.unit).trim().slice(0, 32) }
            : {}),
          lastUpdated: new Date().toISOString(),
        }
        const inventory = [...prev.inventory]
        inventory[idx] = updated
        let next = { ...prev, inventory }
        next = audit(next, actorEmail, 'Stock catalog item updated', updated.name)
        return commit(next)
      })
    },
    [],
  )

  const removeInventoryLine = useCallback(
    (id: string, actorEmail: string): { ok: true } | { ok: false; error: string } => {
      let err = ''
      setState((prev) => {
        if (prev.purchaseOrders.some((po) => po.inventoryCatalogId === id)) {
          err =
            'Cannot delete this catalog item while a purchase order references it. Remove or complete those POs first.'
          return prev
        }
        if (!prev.inventory.some((r) => r.id === id)) {
          err = 'Item not found.'
          return prev
        }
        const inventory = prev.inventory.filter((r) => r.id !== id)
        let next = { ...prev, inventory }
        next = audit(next, actorEmail, 'Stock catalog item removed', id)
        return commit(next)
      })
      return err ? { ok: false as const, error: err } : { ok: true as const }
    },
    [],
  )

  const createBudgetRequest = useCallback(
    (
      input: {
        title: string
        amount: number
        purchaseRequestId?: string
        notes: string
      },
      actorEmail: string,
    ) => {
      setState((prev) => {
        const b = {
          id: crypto.randomUUID(),
          title: input.title,
          amount: input.amount,
          purchaseRequestId: input.purchaseRequestId,
          status: 'pending' as const,
          notes: input.notes,
          createdAt: new Date().toISOString(),
        }
        let next = { ...prev, budgetRequests: [...prev.budgetRequests, b] }
        next = audit(next, actorEmail, 'Budget request filed', b.title)
        return commit(next)
      })
    },
    [],
  )

  const reviewBudgetRequest = useCallback(
    (
      id: string,
      status: Extract<BudgetStatus, 'approved' | 'denied'>,
      actorEmail: string,
    ) => {
      setState((prev) => {
        const br = prev.budgetRequests.map((b) =>
          b.id === id
            ? {
                ...b,
                status,
                reviewedAt: new Date().toISOString(),
              }
            : b,
        )
        let next = { ...prev, budgetRequests: br }
        next = audit(next, actorEmail, `Budget ${status}`, id)
        return commit(next)
      })
    },
    [],
  )

  const createPayment = useCallback(
    (
      input: {
        supplierId: string
        purchaseOrderId?: string
        amount: number
        reference: string
      },
      actorEmail: string,
    ) => {
      setState((prev) => {
        const pay = {
          id: crypto.randomUUID(),
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId,
          amount: input.amount,
          status: 'pending' as const,
          reference: input.reference,
          createdAt: new Date().toISOString(),
        }
        let next = { ...prev, payments: [...prev.payments, pay] }
        next = audit(next, actorEmail, 'Payment scheduled', pay.reference)
        return commit(next)
      })
    },
    [],
  )

  const markPaymentPaid = useCallback((id: string, actorEmail: string) => {
    setState((prev) => {
      const payments = prev.payments.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'paid' as const,
              paidAt: new Date().toISOString(),
            }
          : p,
      )
      let next = { ...prev, payments }
      next = audit(next, actorEmail, 'Payment marked paid', id)
      return commit(next)
    })
  }, [])

  const updateSettings = useCallback(
    (
      patch: Partial<import('@/procurement/types').AppSettings>,
      actorEmail: string,
    ) => {
      setState((prev) => {
        let next: ProcurementState = {
          ...prev,
          settings: { ...prev.settings, ...patch },
        }
        next = audit(next, actorEmail, 'Settings updated', JSON.stringify(patch))
        return commit(next)
      })
    },
    [],
  )

  const adminOverrideNote = useCallback((note: string, actorEmail: string) => {
    setState((prev) => {
      let next: ProcurementState = {
        ...prev,
        settings: {
          ...prev.settings,
          lastOverrideNote: `${new Date().toISOString()} — ${note}`,
        },
      }
      next = audit(next, actorEmail, 'Admin override note', note)
      return commit(next)
    })
  }, [])

  const value = useMemo(
    () => ({
      state,
      createPurchaseRequest,
      reviewPurchaseRequest,
      addSupplier,
      updateSupplier,
      removeSupplier,
      addQuotation,
      createPurchaseOrder,
      submitPOForApproval,
      reviewPurchaseOrder,
      sendPurchaseOrder,
      shipPurchaseOrder,
      receiveDelivery,
      adjustInventoryQuantity,
      createInventoryLine,
      updateInventoryLine,
      removeInventoryLine,
      createBudgetRequest,
      reviewBudgetRequest,
      createPayment,
      markPaymentPaid,
      updateSettings,
      adminOverrideNote,
    }),
    [
      state,
      createPurchaseRequest,
      reviewPurchaseRequest,
      addSupplier,
      updateSupplier,
      removeSupplier,
      addQuotation,
      createPurchaseOrder,
      submitPOForApproval,
      reviewPurchaseOrder,
      sendPurchaseOrder,
      shipPurchaseOrder,
      receiveDelivery,
      adjustInventoryQuantity,
      createInventoryLine,
      updateInventoryLine,
      removeInventoryLine,
      createBudgetRequest,
      reviewBudgetRequest,
      createPayment,
      markPaymentPaid,
      updateSettings,
      adminOverrideNote,
    ],
  )

  return (
    <ProcurementContext.Provider value={value}>{children}</ProcurementContext.Provider>
  )
}

/* eslint-disable react-refresh/only-export-components -- hook must live next to provider API */
export function useProcurement() {
  const ctx = useContext(ProcurementContext)
  if (!ctx) {
    throw new Error('useProcurement must be used within ProcurementProvider')
  }
  return ctx
}
