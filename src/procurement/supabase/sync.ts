import { requireSupabase } from '@/lib/supabaseClient'
import type { ProcurementState } from '@/procurement/types'
import {
  auditEntryToRow,
  budgetRequestToRow,
  deliveryToRow,
  inventoryLineToRow,
  paymentToRow,
  procurementStateFromSupabaseRows,
  purchaseOrderToRow,
  purchaseRequestToRow,
  quotationToRow,
  supplierToRow,
} from '@/procurement/supabase/mappers'

/** Passed from ProcurementProvider based on profile role vs RLS on inventory_lines. */
export type PersistProcurementOptions = {
  /**
   * When false, skip inventory_lines orphan deletes and upserts. RLS only allows inventory-staff
   * and admin to mutate that table; finance/manager/purchasing would otherwise fail the whole persist.
   */
  canMutateInventory: boolean
}

const defaultPersistOptions: PersistProcurementOptions = {
  canMutateInventory: true,
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  if (err instanceof Error) return err.message
  return String(err)
}

function isRetriableNetworkError(err: unknown): boolean {
  return /failed to fetch|networkerror|load failed|ecconnrefused|timed out|timeout/i.test(
    errorMessage(err),
  )
}

async function requireSupabaseAccessToken(): Promise<void> {
  const client = requireSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session?.access_token) {
    throw new Error(
      'No Supabase session token — sign in again or wait until “Restoring your session…” finishes. Data is not loaded or saved without a JWT (RLS uses role authenticated).',
    )
  }
}

async function withCloudRetries<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 3
  let lastErr: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (!isRetriableNetworkError(e) || attempt === maxAttempts - 1) throw e
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  throw lastErr
}

/** When the app clears the audit log, keepIds is empty; normal deleteOrphans skips — this removes all rows. */
async function deleteAllAuditLogRows(): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('audit_log')
    .delete()
    .gte('at', '1970-01-01T00:00:00Z')
  if (error) throw error
}

async function deleteOrphans(
  table: string,
  keepIds: string[],
): Promise<void> {
  // Never delete all rows when the in-memory slice is empty (e.g. before Supabase load finishes).
  // That would wipe the DB while the UI could still be catching up.
  if (keepIds.length === 0) return
  const client = requireSupabase()
  const { data, error } = await client.from(table).select('id')
  if (error) throw error
  const keep = new Set(keepIds)
  const toDelete = (data ?? [])
    .map((r) => String((r as { id: string }).id))
    .filter((id) => !keep.has(id))
  const chunk = 200
  for (let i = 0; i < toDelete.length; i += chunk) {
    const part = toDelete.slice(i, i + chunk)
    if (part.length === 0) continue
    const { error: delErr } = await client.from(table).delete().in('id', part)
    if (delErr) throw delErr
  }
}

/**
 * Suppliers are referenced by purchase_orders and payments (ON DELETE RESTRICT) and quotations
 * (CASCADE). Naive orphan delete can throw 23503 and abort the entire persist — so new suppliers
 * never upsert. Only delete supplier rows that are neither in `keepIds` nor referenced by any row.
 */
async function deleteSupplierOrphansSafe(keepIds: string[]): Promise<void> {
  if (keepIds.length === 0) return
  const client = requireSupabase()
  const { data: rows, error } = await client.from('suppliers').select('id')
  if (error) throw error

  const [poRes, qtRes, payRes] = await Promise.all([
    client.from('purchase_orders').select('supplier_id'),
    client.from('quotations').select('supplier_id'),
    client.from('payments').select('supplier_id'),
  ])
  if (poRes.error) throw poRes.error
  if (qtRes.error) throw qtRes.error
  if (payRes.error) throw payRes.error

  const referenced = new Set<string>()
  for (const r of poRes.data ?? []) {
    referenced.add(String((r as { supplier_id: string }).supplier_id))
  }
  for (const r of qtRes.data ?? []) {
    referenced.add(String((r as { supplier_id: string }).supplier_id))
  }
  for (const r of payRes.data ?? []) {
    referenced.add(String((r as { supplier_id: string }).supplier_id))
  }

  const keep = new Set(keepIds)
  const toDelete = (rows ?? [])
    .map((r) => String((r as { id: string }).id))
    .filter((id) => !keep.has(id) && !referenced.has(id))

  const chunk = 200
  for (let i = 0; i < toDelete.length; i += chunk) {
    const part = toDelete.slice(i, i + chunk)
    if (part.length === 0) continue
    const { error: delErr } = await client.from('suppliers').delete().in('id', part)
    if (delErr) throw delErr
  }
}

/** FK-safe delete order: children before parents. */
const DELETE_ORPHAN_ORDER = [
  'audit_log',
  'payments',
  'deliveries',
  'purchase_orders',
  'quotations',
  'budget_requests',
  'purchase_requests',
  'inventory_lines',
  'suppliers',
] as const

function stateIdsForTable(table: (typeof DELETE_ORPHAN_ORDER)[number], state: ProcurementState) {
  switch (table) {
    case 'suppliers':
      return state.suppliers.map((s) => s.id)
    case 'inventory_lines':
      return state.inventory.map((i) => i.id)
    case 'purchase_requests':
      return state.purchaseRequests.map((p) => p.id)
    case 'quotations':
      return state.quotations.map((q) => q.id)
    case 'purchase_orders':
      return state.purchaseOrders.map((p) => p.id)
    case 'deliveries':
      return state.deliveries.map((d) => d.id)
    case 'budget_requests':
      return state.budgetRequests.map((b) => b.id)
    case 'payments':
      return state.payments.map((p) => p.id)
    case 'audit_log':
      return state.auditLog.map((a) => a.id)
    default:
      return []
  }
}

export async function loadProcurementFromSupabase(): Promise<ProcurementState> {
  return withCloudRetries(async () => {
    await requireSupabaseAccessToken()
    const client = requireSupabase()
    const [
      settingsRes,
      suppliersRes,
      prRes,
      qtRes,
      poRes,
      delRes,
      invRes,
      budRes,
      payRes,
      auditRes,
    ] = await Promise.all([
      client.from('app_settings').select('*').eq('id', 1).maybeSingle(),
      client.from('suppliers').select('*'),
      client.from('purchase_requests').select('*'),
      client.from('quotations').select('*'),
      client.from('purchase_orders').select('*'),
      client.from('deliveries').select('*'),
      client.from('inventory_lines').select('*'),
      client.from('budget_requests').select('*'),
      client.from('payments').select('*'),
      client.from('audit_log').select('*').order('at', { ascending: false }),
    ])

    const errors = [
      settingsRes.error,
      suppliersRes.error,
      prRes.error,
      qtRes.error,
      poRes.error,
      delRes.error,
      invRes.error,
      budRes.error,
      payRes.error,
      auditRes.error,
    ].filter(Boolean)
    if (errors.length) {
      throw new Error(errors.map((e) => e!.message).join('; '))
    }

    return procurementStateFromSupabaseRows({
      settings: settingsRes.data as Record<string, unknown> | null,
      suppliers: suppliersRes.data as Record<string, unknown>[] | null,
      purchaseRequests: prRes.data as Record<string, unknown>[] | null,
      quotations: qtRes.data as Record<string, unknown>[] | null,
      purchaseOrders: poRes.data as Record<string, unknown>[] | null,
      deliveries: delRes.data as Record<string, unknown>[] | null,
      inventory: invRes.data as Record<string, unknown>[] | null,
      budgetRequests: budRes.data as Record<string, unknown>[] | null,
      payments: payRes.data as Record<string, unknown>[] | null,
      auditLog: auditRes.data as Record<string, unknown>[] | null,
    })
  })
}

export async function persistProcurementToSupabase(
  state: ProcurementState,
  options: PersistProcurementOptions = defaultPersistOptions,
): Promise<void> {
  return withCloudRetries(async () => {
    await requireSupabaseAccessToken()
    const client = requireSupabase()

    const { error: settingsErr } = await client
      .from('app_settings')
      .upsert(
        {
          id: 1,
          company_name: state.settings.companyName,
          system_notes: state.settings.systemNotes,
          last_override_note: state.settings.lastOverrideNote,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
    if (settingsErr) throw settingsErr

    for (const table of DELETE_ORPHAN_ORDER) {
      if (table === 'audit_log' && state.auditLog.length === 0) {
        await deleteAllAuditLogRows()
        continue
      }
      if (table === 'inventory_lines' && !options.canMutateInventory) {
        continue
      }
      if (table === 'suppliers') {
        await deleteSupplierOrphansSafe(stateIdsForTable(table, state))
        continue
      }
      await deleteOrphans(table, stateIdsForTable(table, state))
    }

    if (state.suppliers.length) {
      const { error } = await client
        .from('suppliers')
        .upsert(state.suppliers.map(supplierToRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (state.inventory.length && options.canMutateInventory) {
      const { error } = await client
        .from('inventory_lines')
        .upsert(state.inventory.map(inventoryLineToRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (state.purchaseRequests.length) {
      const { error } = await client
        .from('purchase_requests')
        .upsert(state.purchaseRequests.map(purchaseRequestToRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (state.quotations.length) {
      const { error } = await client
        .from('quotations')
        .upsert(state.quotations.map(quotationToRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (state.purchaseOrders.length) {
      const { error } = await client
        .from('purchase_orders')
        .upsert(state.purchaseOrders.map(purchaseOrderToRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (state.deliveries.length) {
      const { error } = await client
        .from('deliveries')
        .upsert(state.deliveries.map(deliveryToRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (state.budgetRequests.length) {
      const { error } = await client
        .from('budget_requests')
        .upsert(state.budgetRequests.map(budgetRequestToRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (state.payments.length) {
      const { error } = await client
        .from('payments')
        .upsert(state.payments.map(paymentToRow), { onConflict: 'id' })
      if (error) throw error
    }
    if (state.auditLog.length) {
      const { error } = await client
        .from('audit_log')
        .upsert(state.auditLog.map(auditEntryToRow), { onConflict: 'id' })
      if (error) throw error
    }
  })
}
