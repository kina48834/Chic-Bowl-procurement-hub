type BrandLogoProps = {
  /** Height in CSS pixels; width scales with the wordmark aspect ratio */
  height?: number
  className?: string
}

/** Served from `public/image/` (sync with repo `image/systemlogo.jpeg` when updating). */
const LOGO_SRC = '/image/systemlogo.jpeg'

export function BrandLogo({ height = 44, className = '' }: BrandLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Chic Bowl by 3rd Jen Kitchens"
      decoding="async"
      className={[
        'block w-auto shrink-0 object-contain object-left',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ height }}
    />
  )
}
