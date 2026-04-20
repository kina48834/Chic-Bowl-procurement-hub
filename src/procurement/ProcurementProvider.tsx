import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/auth/useAuth'
import type {
  BudgetStatus,
  DeliveryStatus,
  InventoryLine,
  Payment,
  PRCategory,
  POStatus,
  ProcurementState,
  PurchaseOrder,
} from '@/procurement/types'
import { clearProcurementLocalStorage, emptyProcurementState } from '@/procurement/storage'
import { whenCloudAuthHydrated } from '@/auth/auth-store'
import { AUDIT_LOG_MAX_ENTRIES } from '@/procurement/audit-config'
import { ProcurementContext } from '@/procurement/procurement-context'
import { loadProcurementFromSupabase, persistProcurementToSupabase } from '@/procurement/supabase/sync'

export type { ProcurementContextValue } from '@/procurement/procurement-context'
export { useProcurement } from '@/procurement/procurement-context'

/** Serialize Supabase writes so rapid actions (any role) don’t reorder or clobber each other. */
let procurementPersistChain: Promise<void> = Promise.resolve()

/**
 * When false, cloud persist is skipped. Prevents persist from running against the empty pre-load
 * snapshot (deleteOrphans + partial upserts could wipe or corrupt Postgres).
 */
const procurementPersistGate = { allowCloudPersist: true }

/** RLS: only inventory-staff + admin may write inventory_lines; other roles skip that table on persist. */
const procurementPersistInventory = { canMutate: false }

const procurementSyncHandlers: {
  setError: (err: unknown) => void
  clearError: () => void
} = {
  setError: () => {},
  clearError: () => {},
}

function formatProcurementSyncError(err: unknown): string {
  const msg =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message: unknown }).message)
      : err instanceof Error
        ? err.message
        : String(err)
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'Could not reach the database. Check your connection, confirm VITE_SUPABASE_URL and the publishable key in .env.local, and try a regular browser tab (some embedded previews block requests to Supabase).'
  }
  if (/permission denied for table/i.test(msg)) {
    return 'The database user cannot write this table. In Supabase SQL Editor run `supabase/sql/19_public_api_grants.sql` (or re-run the merged `supabase/ALL.sql` schema sections), then try again.'
  }
  if (/no supabase session token|session not ready|jwt/i.test(msg)) {
    return 'Your Supabase session was not ready. Wait for “Restoring your session…” / “Loading workspace data…” to finish, then try again. If this persists, sign out and sign back in.'
  }
  if (/foreign key|violates foreign key constraint|23503/i.test(msg)) {
    return 'Database rejected a delete because another row still references it. Try again after a full page load; if it continues, check the browser console for the exact table.'
  }
  if (
    /row-level security|violates row-level security|42501|rls/i.test(msg) ||
    (err &&
      typeof err === 'object' &&
      'code' in err &&
      String((err as { code: unknown }).code) === '42501')
  ) {
    return 'The database blocked this write (row security). Re-run `supabase/sql/13_row_level_security.sql` in the Supabase SQL Editor (or the full `ALL.sql` bundle), then refresh. If it persists: confirm you are signed in, `19_public_api_grants.sql` was applied, and Finance/Manager/Purchasing are not editing the stock catalog (only Inventory Staff and Admin can mutate inventory_lines).'
  }
  return msg.length > 320 ? `${msg.slice(0, 317)}…` : msg
}

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
    auditLog: [entry, ...state.auditLog].slice(0, AUDIT_LOG_MAX_ENTRIES),
  }
}

function commit(next: ProcurementState) {
  if (!procurementPersistGate.allowCloudPersist) {
    return next
  }
  procurementPersistChain = procurementPersistChain
    .then(() =>
      persistProcurementToSupabase(next, {
        canMutateInventory: procurementPersistInventory.canMutate,
      }),
    )
    .then(() => {
      procurementSyncHandlers.clearError()
    })
    .catch((err) => {
      procurementSyncHandlers.setError(err)
      console.error('Supabase procurement sync failed', err)
    })
  return next
}

function holdPayablesForPO(payments: Payment[], poId: string, reason: string): Payment[] {
  return payments.map((p) =>
    p.purchaseOrderId === poId && p.status === 'pending'
      ? { ...p, status: 'on_hold' as const, holdReason: reason }
      : p,
  )
}

function upsertPayableAfterReceipt(
  payments: Payment[],
  po: PurchaseOrder,
  payableAmount: number,
  reference: string,
): Payment[] {
  const idx = payments.findIndex(
    (p) => p.purchaseOrderId === po.id && (p.status === 'pending' || p.status === 'on_hold'),
  )
  const row: Payment = {
    id: idx === -1 ? crypto.randomUUID() : payments[idx].id,
    supplierId: po.supplierId,
    purchaseOrderId: po.id,
    amount: Math.max(0, payableAmount),
    status: 'pending',
    reference,
    createdAt: idx === -1 ? new Date().toISOString() : payments[idx].createdAt,
    holdReason: undefined,
  }
  if (idx === -1) return [...payments, row]
  const next = [...payments]
  next[idx] = row
  return next
}

function bumpInventoryReceived(
  inventory: InventoryLine[],
  po: PurchaseOrder,
  linkedRequestCategory: string | undefined,
  acceptedQty: number,
  deliveryId: string,
): InventoryLine[] {
  if (acceptedQty <= 0) return inventory
  if (po.inventoryCatalogId) {
    return inventory.map((row) =>
      row.id === po.inventoryCatalogId
        ? {
            ...row,
            quantity: row.quantity + acceptedQty,
            lastUpdated: new Date().toISOString(),
          }
        : row,
    )
  }
  const invLine: InventoryLine = {
    id: crypto.randomUUID(),
    name: po.itemsSummary.slice(0, 80),
    category: linkedRequestCategory || 'other',
    quantity: acceptedQty,
    unit: 'units',
    lastUpdated: new Date().toISOString(),
    reorderThreshold: 20,
    sourceDeliveryId: deliveryId,
  }
  return [...inventory, invLine]
}

export function ProcurementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<ProcurementState>(() => emptyProcurementState())
  const [procurementSyncError, setProcurementSyncError] = useState<string | null>(null)
  const [procurementCloudHydrated, setProcurementCloudHydrated] = useState(true)

  // RLS: inventory_lines writes only for inventory-staff + admin. Must NOT tie this to user?.id
  // together with the gate below — when role arrives or updates after load, re-running the id+role
  // gate would set allowCloudPersist=false without re-fetch (useEffect only keys on id), so finance
  // / manager / purchasing would stop persisting everything (not just inventory).
  useLayoutEffect(() => {
    procurementPersistInventory.canMutate =
      Boolean(user?.id) &&
      (user?.role === 'inventory-staff' || user?.role === 'admin')
  }, [user?.id, user?.role])

  useLayoutEffect(() => {
    if (!user) {
      procurementPersistGate.allowCloudPersist = false
      setProcurementCloudHydrated(true)
      return
    }
    procurementPersistGate.allowCloudPersist = false
    setProcurementCloudHydrated(false)
  }, [user?.id])

  useLayoutEffect(() => {
    procurementSyncHandlers.setError = (err) =>
      setProcurementSyncError(formatProcurementSyncError(err))
    procurementSyncHandlers.clearError = () => setProcurementSyncError(null)
  }, [])

  const dismissProcurementSyncError = useCallback(() => {
    setProcurementSyncError(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    procurementPersistChain = Promise.resolve()
    if (!user) {
      clearProcurementLocalStorage()
      setProcurementSyncError(null)
      void Promise.resolve().then(() => {
        if (!cancelled) setState(emptyProcurementState())
      })
      return () => {
        cancelled = true
      }
    }
    void (async () => {
      try {
        await whenCloudAuthHydrated()
        if (cancelled) return
        const next = await loadProcurementFromSupabase()
        if (!cancelled) {
          procurementPersistGate.allowCloudPersist = true
          clearProcurementLocalStorage()
          setProcurementSyncError(null)
          setState(next)
          setProcurementCloudHydrated(true)
        }
      } catch (err) {
        if (!cancelled) {
          procurementPersistGate.allowCloudPersist = false
          setProcurementSyncError(formatProcurementSyncError(err))
          setProcurementCloudHydrated(true)
        }
        console.error('loadProcurementFromSupabase', err)
      }
    })()
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
        requestReason: string
        quantity: number
        unit: string
      },
      actorEmail: string,
    ) => {
      const reason = input.requestReason.trim()
      if (!reason) return
      setState((prev) => {
        const pr = {
          id: crypto.randomUUID(),
          category: input.category,
          description: input.description,
          requestReason: reason,
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

  const reviewPurchaseRequest = useCallback((id: string, note: string, actorEmail: string) => {
    setState((prev) => {
      const idx = prev.purchaseRequests.findIndex((p) => p.id === id)
      if (idx === -1) return prev
      const row = prev.purchaseRequests[idx]
      if (row.status !== 'pending') return prev
      const updated = {
        ...row,
        status: 'approved' as const,
        reviewedAt: new Date().toISOString(),
        reviewNote: note.trim() || undefined,
      }
      const purchaseRequests = [...prev.purchaseRequests]
      purchaseRequests[idx] = updated
      let next = { ...prev, purchaseRequests }
      next = audit(
        next,
        actorEmail,
        'PR approved',
        `${row.description}: ${note.trim() || '—'}`,
      )
      return commit(next)
    })
  }, [])

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
        p.id === id && (p.status === 'draft' || p.status === 'returned_by_finance')
          ? { ...p, status: 'pending_approval' as const }
          : p,
      )
      let next = { ...prev, purchaseOrders: pos }
      next = audit(next, actorEmail, 'PO submitted for Finance approval', id)
      return commit(next)
    })
  }, [])

  const updatePurchaseOrderDraft = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<PurchaseOrder, 'itemsSummary' | 'total' | 'supplierId' | 'inventoryCatalogId'>
      >,
      actorEmail: string,
    ) => {
      setState((prev) => {
        const po = prev.purchaseOrders.find((p) => p.id === id)
        if (!po || (po.status !== 'draft' && po.status !== 'returned_by_finance')) return prev
        const pos = prev.purchaseOrders.map((p) =>
          p.id === id
            ? {
                ...p,
                ...(patch.itemsSummary !== undefined
                  ? { itemsSummary: patch.itemsSummary }
                  : {}),
                ...(patch.total !== undefined ? { total: patch.total } : {}),
                ...(patch.supplierId !== undefined ? { supplierId: patch.supplierId } : {}),
                ...(patch.inventoryCatalogId !== undefined
                  ? { inventoryCatalogId: patch.inventoryCatalogId }
                  : {}),
              }
            : p,
        )
        let next = { ...prev, purchaseOrders: pos }
        next = audit(next, actorEmail, 'PO draft updated', id)
        return commit(next)
      })
    },
    [],
  )

  const reviewPurchaseOrder = useCallback(
    (
      id: string,
      status: Extract<POStatus, 'approved' | 'returned_by_finance'>,
      note: string,
      actorEmail: string,
    ) => {
      setState((prev) => {
        const pos = prev.purchaseOrders.map((p) =>
          p.id === id && p.status === 'pending_approval'
            ? {
                ...p,
                status,
                financeNote: note,
              }
            : p,
        )
        let next = { ...prev, purchaseOrders: pos }
        next = audit(
          next,
          actorEmail,
          status === 'approved' ? 'PO approved by Finance' : 'PO returned by Finance',
          `${id}: ${note || '—'}`,
        )
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
        quantityRejected: 0,
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
    ) => {
      setState((prev) => {
        const dIdx = prev.deliveries.findIndex((d) => d.id === deliveryId)
        if (dIdx === -1) return prev
        const d = prev.deliveries[dIdx]
        if (d.status !== 'pending') return prev
        const po = prev.purchaseOrders.find((p) => p.id === d.purchaseOrderId)
        if (!po || po.status !== 'shipped') return prev

        const qa = Math.max(0, input.quantityAccepted)
        const qr = Math.max(0, input.quantityRejected)
        const { outcome } = input

        if (outcome === 'accepted' && qr !== 0) return prev
        if (outcome === 'rejected' && qa !== 0) return prev
        if (outcome === 'partially_accepted' && (qa === 0 || qr === 0)) return prev

        const linkedRequest = prev.purchaseRequests.find((r) => r.id === po.purchaseRequestId)

        const deliveries = [...prev.deliveries]
        deliveries[dIdx] = {
          ...d,
          quantityReceived: qa,
          quantityRejected: qr,
          qualityNotes: input.qualityNotes,
          status: outcome,
          rejectionItemName: input.rejectionItemName,
          rejectionReason: input.rejectionReason,
          photoUrls: input.photoUrls?.length ? input.photoUrls : undefined,
        }

        let next: ProcurementState = { ...prev, deliveries }
        let purchaseOrders = prev.purchaseOrders
        let inventory = prev.inventory
        let payments = prev.payments

        if (outcome === 'rejected') {
          purchaseOrders = purchaseOrders.map((p) =>
            p.id === po.id
              ? {
                  ...p,
                  status: 'waiting_replacement' as const,
                }
              : p,
          )
          payments = holdPayablesForPO(
            payments,
            po.id,
            'Delivery rejected or damaged — awaiting supplier replacement. Do not pay until resolved.',
          )
        } else if (outcome === 'accepted') {
          if (qa <= 0) return prev
          purchaseOrders = purchaseOrders.map((p) =>
            p.id === po.id
              ? {
                  ...p,
                  status: 'completed' as const,
                  completedAt: new Date().toISOString(),
                }
              : p,
          )
          inventory = bumpInventoryReceived(
            inventory,
            po,
            linkedRequest?.category,
            qa,
            deliveryId,
          )
          payments = upsertPayableAfterReceipt(
            payments,
            po,
            po.total,
            `Payable · ${po.itemsSummary.slice(0, 40)}`,
          )
        } else if (outcome === 'partially_accepted') {
          const totalUnits = qa + qr
          const payable =
            totalUnits > 0 ? Math.round((po.total * qa) / totalUnits * 100) / 100 : po.total
          purchaseOrders = purchaseOrders.map((p) =>
            p.id === po.id
              ? {
                  ...p,
                  status: 'completed' as const,
                  completedAt: new Date().toISOString(),
                }
              : p,
          )
          inventory = bumpInventoryReceived(inventory, po, linkedRequest?.category, qa, deliveryId)
          payments = upsertPayableAfterReceipt(
            payments,
            po,
            payable,
            `Partial receipt · ${po.itemsSummary.slice(0, 32)}`,
          )
        }

        next = { ...next, purchaseOrders, inventory, payments }
        next = audit(next, actorEmail, `Receiving ${outcome}`, `Delivery ${deliveryId}`)
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
      input: {
        name: string
        category: string
        quantity: number
        unit: string
        reorderThreshold?: number
      },
      actorEmail: string,
    ) => {
      setState((prev) => {
        const line = {
          id: crypto.randomUUID(),
          name: input.name.trim(),
          category: (input.category.trim() || 'other').slice(0, 64),
          quantity: Math.max(0, input.quantity),
          unit: (input.unit.trim() || 'unit').slice(0, 32),
          lastUpdated: new Date().toISOString(),
          reorderThreshold:
            input.reorderThreshold != null && Number.isFinite(input.reorderThreshold)
              ? Math.max(0, input.reorderThreshold)
              : 20,
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
          'name' | 'category' | 'quantity' | 'unit' | 'reorderThreshold'
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
          ...(patch.reorderThreshold !== undefined
            ? { reorderThreshold: Math.max(0, Number(patch.reorderThreshold)) }
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
        p.id === id && p.status === 'pending'
          ? {
              ...p,
              status: 'paid' as const,
              paidAt: new Date().toISOString(),
              holdReason: undefined,
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

  const adminClearAuditLog = useCallback(() => {
    setState((prev) => commit({ ...prev, auditLog: [] }))
  }, [])

  const adminTrimAuditLog = useCallback((keep: number) => {
    const k = Math.max(0, Math.min(Math.floor(keep), AUDIT_LOG_MAX_ENTRIES))
    setState((prev) => {
      const trimmed = prev.auditLog.slice(0, k)
      return commit({ ...prev, auditLog: trimmed })
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
      updatePurchaseOrderDraft,
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
      adminClearAuditLog,
      adminTrimAuditLog,
      procurementSyncError,
      dismissProcurementSyncError,
      procurementCloudHydrated,
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
      updatePurchaseOrderDraft,
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
      adminClearAuditLog,
      adminTrimAuditLog,
      procurementSyncError,
      dismissProcurementSyncError,
      procurementCloudHydrated,
    ],
  )

  const cloudLoading = Boolean(user) && !procurementCloudHydrated

  return (
    <ProcurementContext.Provider value={value}>
      {cloudLoading ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm font-medium text-ink">Loading workspace data…</p>
          <p className="max-w-md text-xs text-ink-muted">
            Pulling procurement records from Supabase. Editing is enabled after this completes so
            nothing is saved from an empty partial state.
          </p>
        </div>
      ) : (
        children
      )}
    </ProcurementContext.Provider>
  )
}
