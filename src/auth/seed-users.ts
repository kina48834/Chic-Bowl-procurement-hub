import type { UserRecord } from '@/auth/types'

const created = '2026-04-18T00:00:00.000Z'

/** Stable random ids (UUID) for demo accounts — merged into local storage on first run. */
const IDS = {
  admin: 'f1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5061',
  inventory: 'f2b3c4d5-e6f7-48a9-b1c2-d3e4f5061728',
  purchasing: 'f3c4d5e6-f7a8-49b0-c2d3-e4f506172839',
  manager: 'f4d5e6f7-a8b9-40c1-d3e4-f50617283940',
  finance: 'f5e6f8a0-b9c1-41d2-a3f4-506172839415',
} as const

/** Preloaded demo accounts (local storage on first run). Keep passwords in sync with supabase/sql/seed/demo_accounts.sql STEP 1. */
export const SEED_USERS: UserRecord[] = [
  {
    id: IDS.admin,
    accountRef: IDS.admin,
    email: 'admin@gmail.com',
    password: 'admin1919',
    role: 'admin',
    displayName: 'Admin',
    createdAt: created,
    source: 'seed',
  },
  {
    id: IDS.inventory,
    accountRef: IDS.inventory,
    email: 'inventorystaff@gmail.com',
    password: 'inventorystaff1919',
    role: 'inventory-staff',
    displayName: 'Inventory Staff',
    createdAt: created,
    source: 'seed',
  },
  {
    id: IDS.purchasing,
    accountRef: IDS.purchasing,
    email: 'purchasing@gmail.com',
    password: 'purchasing1919',
    role: 'purchasing',
    displayName: 'Purchasing Staff',
    createdAt: created,
    source: 'seed',
  },
  {
    id: IDS.manager,
    accountRef: IDS.manager,
    email: 'manager@gmail.com',
    password: 'manager1919',
    role: 'manager',
    displayName: 'Manager',
    createdAt: created,
    source: 'seed',
  },
  {
    id: IDS.finance,
    accountRef: IDS.finance,
    email: 'finance@gmail.com',
    password: 'finance1919',
    role: 'finance',
    displayName: 'Finance',
    createdAt: created,
    source: 'seed',
  },
]
