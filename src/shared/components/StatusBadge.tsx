/* Status chips aligned to yellow / red / white system theme */
const PALETTE: Record<string, string> = {
  pending: 'bg-accent-muted text-ink ring-1 ring-border/60',
  pending_approval: 'bg-accent-muted text-ink ring-1 ring-border/60',
  approved: 'bg-success-muted text-success',
  returned_by_finance: 'bg-accent-muted text-ink ring-1 ring-accent/50',
  waiting_replacement: 'bg-accent-muted text-ink ring-1 ring-border',
  partially_accepted: 'bg-accent-muted text-ink ring-1 ring-border',
  rejected: 'bg-danger-muted text-danger-ink ring-1 ring-danger/25',
  denied: 'bg-danger-muted text-danger-ink ring-1 ring-danger/25',
  draft: 'bg-surface-deep/40 text-ink-muted ring-1 ring-border',
  sent: 'bg-surface-muted text-ink ring-1 ring-border',
  shipped: 'bg-accent-muted text-ink ring-1 ring-accent/40',
  completed: 'bg-success-muted text-success',
  paid: 'bg-success-muted text-success',
  on_hold: 'bg-accent-muted text-ink ring-1 ring-danger/30',
  accepted: 'bg-success-muted text-success',
  active: 'bg-accent-muted text-ink',
  inactive: 'bg-surface-muted text-ink-muted line-through decoration-danger/50',
}

export function StatusBadge({ status }: { status: string }) {
  const c = PALETTE[status] ?? 'bg-surface-muted text-ink-muted ring-1 ring-border'
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${c}`}
    >
      <span className="truncate">{status.replace(/_/g, ' ')}</span>
    </span>
  )
}
