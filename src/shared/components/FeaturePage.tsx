type FeaturePageProps = {
  title: string
  subtitle: string
  allowed: string[]
}

export function FeaturePage({ title, subtitle, allowed }: FeaturePageProps) {
  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="text-ink-muted text-sm leading-relaxed">{subtitle}</p>
      </header>
      <section className="ui-panel p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
          Allowed functions (this role)
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-ink">
          {allowed.map((line) => (
            <li key={line} className="leading-relaxed">
              {line}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
