import type { ProcurementState } from '@/procurement/types'

const t = '2026-04-18T12:00:00.000Z'

export function getSeedState(): ProcurementState {
  const s1 = 'seed-supplier-1'
  const s2 = 'seed-supplier-2'
  const pr1 = 'seed-pr-pending'
  const pr2 = 'seed-pr-approved'
  const po1 = 'seed-po-draft'

  return {
    settings: {
      companyName: 'Chic Bowl by 3rd Jen Kitchens',
      systemNotes: [
        'Access — New accounts are created only in Admin → User management (email + initial password). There is no public self-service registration; visiting /register redirects to Sign in. The Sign in page does not list demo passwords on screen.',
        'Data — Procurement data and these notes stay in this browser (local storage). Clearing site data removes them; user accounts are stored separately.',
        'Currency — Amounts display with consistent formatting across workspaces.',
        'Stock catalog — Master SKUs are editable from Manager or Admin (shared catalog; delete blocked while a PO references a line).',
        'Support — Each workspace page includes an embedded process guide for the end-to-end flow.',
      ].join('\n'),
      lastOverrideNote: '',
    },
    suppliers: [
      {
        id: s1,
        name: 'Fresh Valley Poultry',
        contact: 'Sam Rivera',
        email: 'orders@freshvalley.example',
        phone: '+63 917 555 0101',
        pricingNotes: 'Whole chicken tier pricing; weekly index.',
        reliability: 4,
        active: true,
      },
      {
        id: s2,
        name: 'PackRight Supplies',
        contact: 'Jordan Lee',
        email: 'sales@packright.example',
        phone: '+63 917 555 0102',
        pricingNotes: 'Biodegradable trays — MOQ 500.',
        reliability: 5,
        active: true,
      },
    ],
    purchaseRequests: [
      {
        id: pr1,
        category: 'chicken',
        description: 'Whole chicken — weekly kitchen run',
        quantity: 120,
        unit: 'kg',
        status: 'pending',
        requestedByEmail: 'inventorystaff@gmail.com',
        createdAt: t,
      },
      {
        id: pr2,
        category: 'packaging',
        description: 'Eco trays for retail line',
        quantity: 800,
        unit: 'units',
        status: 'approved',
        requestedByEmail: 'inventorystaff@gmail.com',
        createdAt: t,
        reviewedAt: t,
        reviewNote: 'Approved for sourcing.',
      },
    ],
    quotations: [
      {
        id: 'seed-qt-1',
        supplierId: s2,
        title: 'Eco trays RFQ',
        price: 1840,
        qualityNote: 'Food-grade certified; samples on file.',
        deliveryTerms: 'FOB hub; 5 business days',
        createdAt: t,
      },
      {
        id: 'seed-qt-2',
        supplierId: s1,
        title: 'Alternate tray quote',
        price: 2100,
        qualityNote: 'Heavier gauge',
        deliveryTerms: '2-week lead',
        createdAt: t,
      },
    ],
    purchaseOrders: [
      {
        id: po1,
        purchaseRequestId: pr2,
        supplierId: s2,
        itemsSummary: 'Eco trays × 800',
        total: 1840,
        status: 'draft',
        createdAt: t,
      },
    ],
    deliveries: [],
    inventory: [
      {
        id: 'inv-1',
        name: 'Frozen chicken portions',
        category: 'chicken',
        quantity: 340,
        unit: 'kg',
        lastUpdated: t,
      },
      {
        id: 'inv-2',
        name: 'Spice blend A',
        category: 'ingredients',
        quantity: 45,
        unit: 'kg',
        lastUpdated: t,
      },
    ],
    budgetRequests: [
      {
        id: 'seed-budget-1',
        title: 'Q2 packaging envelope',
        amount: 25000,
        purchaseRequestId: pr2,
        status: 'pending',
        notes: 'Rolling commitment for retail packaging.',
        createdAt: t,
      },
    ],
    payments: [
      {
        id: 'seed-pay-1',
        supplierId: s1,
        amount: 4200,
        status: 'pending',
        reference: 'INV-FV-1044',
        createdAt: t,
      },
    ],
    auditLog: [
      {
        id: 'seed-audit-1',
        at: t,
        actorEmail: 'system@seed',
        action: 'Seed',
        detail: 'Demo procurement dataset loaded.',
      },
    ],
  }
}
