// French thousands separator: 1284302 → "1 284 302"
const COUNT_FORMAT = new Intl.NumberFormat('fr-FR')

/** The community total, ready to display; `null` stays `null` (the onboarding hides its sentence). */
export function communityTotalAdapter(total: number | null): string | null {
  return total === null ? null : COUNT_FORMAT.format(total)
}
