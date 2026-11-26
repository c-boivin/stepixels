import { closestLandmark, distanceMeters, factValue } from '~/lib/facts'
import { i18n } from '~/lib/i18n'

import type { Fact } from '~/lib/facts'

// 3,2 km under 10 km, 11 km from 10 km (#32)
const KM_DECIMAL = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const KM_WHOLE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
// 2 significant digits: 9,7 · 19 · 1,1 · 0,042
const RATIO = new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 2 })

/** The distance as shown, and the meters it stands for: the ratios use them, so the reader finds the same numbers. */
function shownDistance(steps: number): { km: string; meters: number } {
  const km = distanceMeters(steps) / 1000
  // the format follows the rounded value: 9,98 km rounds to 10, shown "10 km", not "10,0 km"
  const tenths = Math.round(km * 10) / 10
  const rounded = tenths < 10 ? tenths : Math.round(km)
  return { km: (rounded < 10 ? KM_DECIMAL : KM_WHOLE).format(rounded), meters: rounded * 1000 }
}

/** The "Le saviez-vous ?" message of the day: "Tes 3,2 km, c'est 9,7 fois la tour Eiffel." */
export function dailyFactAdapter(steps: number, fact: Fact): string {
  const { km, meters } = shownDistance(steps)
  const value = factValue(fact, meters)

  return i18n.t(`home.fact.${fact.kind}.${fact.landmark}`, { km, value: value === null ? '' : RATIO.format(value) })
}

/** The message of a finished image: "Cette image : 19 km de marche, plus qu'un Paris → Versailles." */
export function imageFactAdapter(steps: number): string {
  const { km, meters } = shownDistance(steps)
  const { landmark, above } = closestLandmark(meters)

  return i18n.t(above ? 'home.fact.image_above' : 'home.fact.image_below', {
    km,
    landmark: i18n.t(`home.fact.${above ? 'than' : 'landmark'}.${landmark}`),
  })
}
