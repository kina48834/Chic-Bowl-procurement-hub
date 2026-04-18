/** Philippine Peso (PHP) — display using PH locale. */
const phpStandard = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const phpWhole = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatPhp(amount: number): string {
  return phpStandard.format(amount)
}

/** For budget lines and other whole-peso amounts. */
export function formatPhpWhole(amount: number): string {
  return phpWhole.format(amount)
}
