export type ProcessGuideId =
  | 'inv-dashboard'
  | 'inv-purchase-requests'
  | 'inv-receiving'
  | 'inv-levels'
  | 'pur-dashboard'
  | 'pur-suppliers'
  | 'pur-quotations'
  | 'pur-purchase-orders'
  | 'pur-order-tracking'
  | 'mgr-dashboard'
  | 'mgr-approve-requests'
  | 'mgr-approve-orders'
  | 'mgr-reports'
  | 'mgr-order-monitoring'
  | 'mgr-inventory-management'
  | 'fin-dashboard'
  | 'fin-budget'
  | 'fin-payments'
  | 'fin-reports'
  | 'adm-dashboard'
  | 'adm-user-management'
  | 'adm-settings'
  | 'adm-suppliers'
  | 'adm-inventory-management'
  | 'adm-reports'
  | 'adm-audit-log'

export type ProcessGuideModel = {
  eyebrow: string
  title: string
  summary: string
  steps: string[]
  workflowTip: string
}

export const PROCESS_GUIDES: Record<ProcessGuideId, ProcessGuideModel> = {
  'inv-dashboard': {
    eyebrow: '🧑‍🏭 Inventory Staff',
    title: 'How this workspace fits in',
    summary:
      'You start operational demand and finish physical verification. Everything you do here feeds Purchasing, Manager approvals, and Finance controls downstream.',
    steps: [
      'Use Purchase requests when you need chicken, ingredients, or packaging—this is the official demand signal.',
      'After Purchasing ships a PO, Receiving is where you confirm quantity and quality, then accept or reject.',
      'Inventory integration shows on-hand balances; stock goes up automatically on accepted receipts—only adjust manually for exceptions (counts, spoilage).',
    ],
    workflowTip:
      'Typical flow: submit PR → Manager approves PR → Finance may approve budget → Purchasing quotes & issues PO → Manager approves PO → PO sent & shipped → you receive here → levels update.',
  },
  'inv-purchase-requests': {
    eyebrow: '🧑‍🏭 Purchase request management',
    title: 'Creating and tracking demand',
    summary:
      'Purchase requests describe what you need. Managers approve or reject them before buyers spend time sourcing.',
    steps: [
      'Pick category (chicken, ingredients, packaging), describe the need, set quantity and unit, then Submit request.',
      'Watch Status: pending (waiting on manager), approved (ready for procurement/finance steps), or rejected (see trail in manager reports / audit).',
      'Approved requests can be linked to quotations and purchase orders by Purchasing—no need to duplicate the request elsewhere.',
    ],
    workflowTip:
      'One clear description per request helps Purchasing match quotes and PO lines without back-and-forth.',
  },
  'inv-receiving': {
    eyebrow: '🧑‍🏭 Receiving & verification',
    title: 'Accept or reject deliveries',
    summary:
      'When Purchasing marks a PO as shipped, a delivery task appears here. You record what actually arrived and whether it meets spec.',
    steps: [
      'Enter quantity received and quality notes (temperature, damage, labeling, etc.).',
      'Accept delivery to post stock into inventory for that line item context in the demo dataset.',
      'Reject delivery to record a failed receipt—Purchasing and Manager monitoring will see the outcome.',
    ],
    workflowTip:
      'If you see no open deliveries, open Order tracking as Purchasing and mark a sent PO as shipped to simulate inbound freight.',
  },
  'inv-levels': {
    eyebrow: '🧑‍🏭 Inventory integration',
    title: 'View levels and exception adjustments',
    summary:
      'On-hand quantities reflect accepted receiving. Manual edits are for justified exceptions only—not routine ordering.',
    steps: [
      'Review Item, category, on-hand quantity, unit, and last updated after each receiving event.',
      'Use Adjust (exception) only for cycle count corrections, spoilage, or data fixes; Save commits the quantity.',
      'Prefer letting the system update from receiving so the audit trail stays clean.',
    ],
    workflowTip:
      'After a successful accept on Receiving, refresh this page to see quantities move.',
  },
  'pur-dashboard': {
    eyebrow: '🛒 Purchasing Staff',
    title: 'Procurement execution overview',
    summary:
      'You maintain suppliers, collect quotes, build POs from approved demand, send commitments, and advance shipment status.',
    steps: [
      'Suppliers: add/update/remove vendors and keep reliability signals current.',
      'Quotations: record supplier offers and compare price, quality notes, and delivery terms.',
      'Purchase orders: draft POs from approved requests, submit for manager approval, then send to the supplier.',
      'Order tracking: move POs through shipped (which opens receiving) toward completion.',
    ],
    workflowTip:
      'Never send a PO until Manager has approved the purchase order in this demo—finance may also need to clear budget first.',
  },
  'pur-suppliers': {
    eyebrow: '🛒 Supplier management',
    title: 'Maintain the vendor roster',
    summary:
      'Supplier master data is the foundation for quotations, POs, and performance views in reports.',
    steps: [
      'Add suppliers with realistic names, contact hints, and default categories.',
      'Update pricing or reliability notes as you learn how each vendor performs.',
      'Remove suppliers only when they should no longer be selectable on new quotes or POs.',
    ],
    workflowTip:
      'Managers and Finance read aggregate spend by supplier from your PO data—keep IDs consistent.',
  },
  'pur-quotations': {
    eyebrow: '🛒 Supplier quotation management',
    title: 'Request and compare quotes',
    summary:
      'Capture each supplier’s offer so you can justify who gets the award before creating a PO.',
    steps: [
      'Record title, price, quality narrative, and delivery terms per supplier.',
      'Compare rows side by side; the UI highlights strong options for quick scanning.',
      'Use the best-value quote when you build the purchase order tied to the approved request.',
    ],
    workflowTip:
      'Link mentally (and in notes) each quote to a specific approved purchase request so approvals stay traceable.',
  },
  'pur-purchase-orders': {
    eyebrow: '🛒 Purchase order generation',
    title: 'From approved demand to supplier commitment',
    summary:
      'Purchase orders turn approved requisitions into commercial documents. Submit for approval, then send.',
    steps: [
      'Choose an approved purchase request, supplier, line summary, and total that matches your selected quote.',
      'Optionally pick a Stock catalog row (manager-maintained) to prefill the summary and attach a catalog ID for order monitoring.',
      'Submit for approval sends the PO to the Manager queue.',
      'After approval, Send PO to supplier simulates transmission; Ship PO later when goods leave the vendor.',
    ],
    workflowTip:
      'If submit fails, the request may not be approved yet—check status on the request or ask Manager to approve.',
  },
  'pur-order-tracking': {
    eyebrow: '🛒 Order tracking',
    title: 'Follow PO lifecycle',
    summary:
      'Track each PO from draft/pending approval through sent, shipped, and financially settled states.',
    steps: [
      'Review columns for catalog link (when purchasing tied the PO to a manager item), supplier, amount, status, and timeline.',
      'Advance status in line with reality: after send, mark shipped to unlock receiving tasks.',
      'Pair with Inventory’s receiving screen to close the loop on physical fulfillment.',
    ],
    workflowTip:
      'Inventory Staff cannot receive until a PO is marked shipped in this demo workflow.',
  },
  'mgr-dashboard': {
    eyebrow: '👨‍💼 Manager',
    title: 'Decision maker / approver',
    summary:
      'You gate spend before and after commercial terms are fixed—requests first, then purchase orders.',
    steps: [
      'Stock catalog: add and maintain master items—purchasing can link them on POs; delete is blocked if a PO still references the line.',
      'Approve requests: validates operational need before sourcing.',
      'Approve purchase orders: confirms commitment value and supplier choice.',
      'Reports & audit: spending, supplier performance, and request history; Order monitoring for read-only visibility.',
    ],
    workflowTip:
      'Reject with a note so Purchasing and Inventory understand what to change before resubmission.',
  },
  'mgr-approve-requests': {
    eyebrow: '👨‍💼 Approval workflow — requests',
    title: 'Approve or reject purchase requests',
    summary:
      'This is the first financial control gate. Only approved requests should drive quotations and PO drafts.',
    steps: [
      'Review category, description, quantity, and requester.',
      'Approve to release demand to Purchasing; Reject to stop work with a documented reason.',
      'Approved items may still need Finance budget clearance depending on your org rules—in this app, use Budget review for that path.',
    ],
    workflowTip:
      'Inventory creates requests; you decide if the operation should proceed before buyers engage suppliers.',
  },
  'mgr-approve-orders': {
    eyebrow: '👨‍💼 Approval workflow — purchase orders',
    title: 'Approve or reject purchase orders',
    summary:
      'PO approval locks in supplier, price, and quantity. This is the second major control point.',
    steps: [
      'Validate that the PO matches an approved request and acceptable quote economics.',
      'Approve so Purchasing can send the PO; reject to send it back for revision.',
      'After approval, Purchasing sends and ships—monitor statuses from Order monitoring.',
    ],
    workflowTip:
      'Cross-check totals against quotations and any budget notes Finance left in the system.',
  },
  'mgr-reports': {
    eyebrow: '👨‍💼 Audit trail & reporting',
    title: 'Spending, suppliers, and request history',
    summary:
      'Use this view for operational intelligence: where money goes, how suppliers compare, and how requests aged.',
    steps: [
      'Spend-by-supplier shows committed PO value by vendor (excludes rejected POs in the rollup).',
      'Request status counts summarize pipeline health (pending vs approved vs rejected).',
      'Pair with Audit log (Admin) when you need user-level evidence for an investigation.',
    ],
    workflowTip:
      'Finance reports focus on cash and liabilities; this page is tuned for procurement performance.',
  },
  'mgr-order-monitoring': {
    eyebrow: '👨‍💼 Order monitoring',
    title: 'Read-only visibility across orders',
    summary:
      'See every PO, supplier, linked PR, amount, and status without editing operational fields here.',
    steps: [
      'Scan for stuck states—e.g. approved but not sent, or sent but not shipped.',
      'Use the Catalog column to see which POs were raised against manager-maintained stock lines.',
      'Use linked PR IDs to trace back to the original operational need.',
      'Coordinate with Purchasing on exceptions; Inventory on receiving once shipped.',
    ],
    workflowTip:
      'This screen is intentionally read-only so execution stays in Purchasing and Inventory queues.',
  },
  'mgr-inventory-management': {
    eyebrow: '👨‍💼 Stock catalog',
    title: 'Master inventory for every role',
    summary:
      'You own the canonical list of stock items. Inventory staff still records receipts and can adjust exceptions on their integration page; purchasing links POs here for consistent naming and traceability.',
    steps: [
      'Scan the summary tiles (line count, categories in use, total on-hand, zero-qty lines) before deep edits—quick links jump to monitoring, approvals, and receiving.',
      'Add items with name, category (aligned with purchase request categories), baseline on-hand quantity, and unit.',
      'Edit inline with the same category dropdown; delete only when no purchase order references the line (otherwise you’ll get an alert).',
    ],
    workflowTip:
      'After adding items, ask Purchasing to use the Stock catalog picker when drafting POs so Order monitoring and approvals show the same vocabulary.',
  },
  'fin-dashboard': {
    eyebrow: '💰 Finance Staff',
    title: 'Budget + payments control',
    summary:
      'You align funding to approved work, clear payables, and produce financial snapshots.',
    steps: [
      'Budget review: approve or deny funding tied to purchase activity.',
      'Supplier payments: mark payables as paid and track what is still outstanding.',
      'Financial reports: expenses, payments, and liabilities for period discipline.',
    ],
    workflowTip:
      'Budget decisions should reference the purchase request or PO context described in each budget line.',
  },
  'fin-budget': {
    eyebrow: '💰 Finance integration — budgets',
    title: 'Review and approve funding',
    summary:
      'Budget requests capture proposed spend. Approving them signals Finance is comfortable with funding the related work.',
    steps: [
      'Create or review budget lines with amount, linked PR (if any), and narrative.',
      'Approve to allow downstream commitment; deny to block with an auditable outcome.',
      'Managers and Purchasing should see status implications in their own queues and reports.',
    ],
    workflowTip:
      'Use notes to explain policy limits so Purchasing can re-quote or rebalance without guesswork.',
  },
  'fin-payments': {
    eyebrow: '💰 Supplier payments',
    title: 'Process supplier payments',
    summary:
      'Record settlement against supplier liabilities. This complements PO and receiving data for a full procure-to-pay picture.',
    steps: [
      'Review payment rows with supplier, amount, and status (pending vs paid).',
      'Mark paid when funds actually leave—this updates financial reporting totals.',
      'Use history to support period close and reconciliation conversations.',
    ],
    workflowTip:
      'Outstanding payables plus open PO liabilities appear in Financial reports for a quick health check.',
  },
  'fin-reports': {
    eyebrow: '💰 Audit trail & financial reporting',
    title: 'Expenses, payments, liabilities',
    summary:
      'Cash out the door, scheduled payables, and commercial exposure from live PO data.',
    steps: [
      'Paid vs pending payment tiles summarize treasury movement.',
      'Open liabilities approximate undelivered or unpaid commercial commitments.',
      'Drill via linked modules (payments, POs) when numbers look surprising.',
    ],
    workflowTip:
      'Manager reports skew operational; this page skews treasury and accrual-style views.',
  },
  'adm-dashboard': {
    eyebrow: '🧑‍💻 Admin',
    title: 'System controller / superuser',
    summary:
      'You safeguard identities, configuration, master data, analytics, and the immutable audit narrative.',
    steps: [
      'User management: create, edit, or retire accounts across Inventory, Purchasing, Manager, Finance, and Admin.',
      'System settings: company, system notes, and override log.',
      'Stock catalog, suppliers & reports: unrestricted visibility and CRUD; Audit log for forensic review.',
    ],
    workflowTip:
      'Override notes in settings are stamped for auditors—use them only with a clear justification.',
  },
  'adm-user-management': {
    eyebrow: '🧑‍💻 User & role management',
    title: 'Provision access responsibly',
    summary:
      'New accounts are created only here—there is no public self-registration. Map each person to one primary workspace role unless they truly need admin access.',
    steps: [
      'Enter display name, email, and initial password, then pick a role—the live preview shows their dashboard path, capabilities, and credential handoff for Sign in.',
      'Add users with work email, display name, role, and password; edit anytime (optional new password).',
      'Delete only when access must end; the system blocks removal of yourself or the last admin.',
    ],
    workflowTip:
      'Pair onboarding with a quick tour: Inventory starts PRs, Manager approves, Purchasing executes, Finance funds and pays. Successful adds keep you on this page; if Supabase briefly switches the session, sign in again and you land back on User management.',
  },
  'adm-settings': {
    eyebrow: '🧑‍💻 System configuration',
    title: 'Company, notes & overrides',
    summary:
      'Save company name and system notes in one place; use the override log only for break-glass justification.',
    steps: [
      'Use Save after editing company or system notes—changes are audited.',
      'Override log is timestamped for auditors; it does not replace saving settings.',
    ],
    workflowTip:
      'Keep system notes current so the next admin understands access, data residency, and currency expectations.',
  },
  'adm-suppliers': {
    eyebrow: '🧑‍💻 Supplier data (full access)',
    title: 'Break-glass vendor maintenance',
    summary:
      'Same supplier domain as Purchasing, without role filters—use for corrections and compliance clean-up.',
    steps: [
      'Edit master attributes when vendors rebrand or contracts change.',
      'Deactivate or remove records carefully if they would break historical PO references.',
      'Coordinate with Purchasing so operational users know about master updates.',
    ],
    workflowTip:
      'Prefer teaching Purchasing to self-serve adds/updates; reserve Admin for escalations.',
  },
  'adm-inventory-management': {
    eyebrow: '🧑‍💻 Stock catalog (admin)',
    title: 'Master inventory lines — full CRUD',
    summary:
      'Same catalog managers maintain: name, category, unit, and baseline on-hand quantity. Purchasing links POs to these lines; Inventory receives against them.',
    steps: [
      'Use summary tiles and quick links (manager view, reports, POs, staff levels) for cross-role checks before editing.',
      'Add lines for new stock; edit when attributes change—categories stay aligned with purchase request types.',
      'Delete only when no purchase order references the line—the system blocks otherwise.',
    ],
    workflowTip:
      'Managers use the same data under Manager → Stock catalog; keep one source of truth.',
  },
  'adm-reports': {
    eyebrow: '🧑‍💻 Executive reports',
    title: 'Cross-cutting analytics',
    summary:
      'Unfiltered counts across users, PO book, inventory SKUs, audit volume, supplier roster, spend concentration, and open governance—plus quick links into admin tools.',
    steps: [
      'Scan KPI stat cards and Financial pulse (open pipeline vs completed PO value, quotations).',
      'Compare spend by supplier to the roster and reliability scores; use Accounts by role before opening User management.',
      'Review Open governance tiles and Recent audit activity; jump to the full Audit log from the table header.',
    ],
    workflowTip:
      'When numbers disagree with Finance, compare against Finance reports which emphasize cash view.',
  },
  'adm-audit-log': {
    eyebrow: '🧑‍💻 Audit log',
    title: 'Immutable activity history',
    summary:
      'Every sensitive procurement mutation and settings change should surface here with actor and timestamp.',
    steps: [
      'Scan newest-first in the table, or use the search box to filter by action, actor email, or detail text.',
      'Action chips are color-hinted (e.g. approvals vs rejections); hover timestamps for the full date.',
      'Pair with Manager/Finance reports for operational vs financial reconciliation.',
    ],
    workflowTip:
      'If an entry is missing, the action may not have routed through ProcurementProvider—file a product gap.',
  },
}
