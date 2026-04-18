import type { ProcessGuideId } from '@/shared/guides/process-guides'
import { PROCESS_GUIDES } from '@/shared/guides/process-guides'

type ProcessGuideProps = {
  guideId: ProcessGuideId
  className?: string
}

export function ProcessGuide({ guideId, className = '' }: ProcessGuideProps) {
  const g = PROCESS_GUIDES[guideId]

  return (
    <section
      aria-label="How to use this page"
      className={[
        'ui-panel border-accent/20 bg-gradient-to-br from-surface-card to-accent-muted/25 p-4 sm:p-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-danger">{g.eyebrow}</p>
        <h2 className="text-base font-semibold text-ink">{g.title}</h2>
      </header>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{g.summary}</p>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          How to use this screen
        </p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink">
          {g.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <p className="mt-4 rounded-lg border border-accent/25 bg-accent-muted/35 px-3 py-2 text-sm leading-relaxed text-ink">
        <span className="font-semibold text-ink">End-to-end tip: </span>
        {g.workflowTip}
      </p>
    </section>
  )
}
