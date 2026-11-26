/**
 * The "Le saviez-vous ?" messages (#32): a number of steps turned into a real distance, compared
 * to a landmark. Pure rules: the texts and the number formats are in the adapter and in fr.json.
 */

/** Length of one step, in meters. */
export const STEP_LENGTH_M = 0.75

/** The landmarks the messages compare to, in meters. */
export const LANDMARKS = {
  eiffel: 330,
  versailles: 17_000,
  channel: 34_000,
  lyon: 465_000,
  france: 1_000_000,
  earth: 40_075_000,
  moon: 384_400_000,
} as const

export type Landmark = keyof typeof LANDMARKS

/**
 * A daily message: `times` and `percent` compare the distance to a landmark, `whole` and `half`
 * say "a whole / half of it" without a number.
 */
export interface Fact {
  landmark: Landmark
  kind: 'times' | 'percent' | 'whole' | 'half'
}

/**
 * The messages of each tier, by steps not validated (from the Figma table). The last tier starts at
 * 23 000 steps (17,25 km): from there, "un Paris → Versailles" and "la moitié de la Manche" are true.
 */
const TIERS: { from: number; facts: Fact[] }[] = [
  {
    from: 2_000,
    facts: [
      { landmark: 'eiffel', kind: 'times' },
      { landmark: 'versailles', kind: 'percent' },
      { landmark: 'channel', kind: 'percent' },
    ],
  },
  {
    from: 5_000,
    facts: [
      { landmark: 'versailles', kind: 'percent' },
      { landmark: 'channel', kind: 'percent' },
      { landmark: 'lyon', kind: 'percent' },
    ],
  },
  {
    from: 10_000,
    facts: [
      { landmark: 'versailles', kind: 'percent' },
      { landmark: 'lyon', kind: 'percent' },
      { landmark: 'france', kind: 'percent' },
    ],
  },
  {
    from: 23_000,
    facts: [
      { landmark: 'versailles', kind: 'whole' },
      { landmark: 'channel', kind: 'half' },
      { landmark: 'earth', kind: 'percent' },
    ],
  },
]

/** In any tier, 1 time in 20, the message is about the way to the Moon. */
const MOON: Fact = { landmark: 'moon', kind: 'percent' }
const MOON_CHANCE = 1 / 20

export function distanceMeters(steps: number): number {
  return steps * STEP_LENGTH_M
}

/** Tier of the steps not validated (0 to 3), `null` under 2 000 steps: no message then. */
export function factTier(steps: number): number | null {
  const tier = TIERS.findLastIndex(({ from }) => steps >= from)
  return tier >= 0 ? tier : null
}

/** Picks one message of the tier; `random` gives a number in [0, 1), like `Math.random`. */
export function pickFact(tier: number, random: () => number = Math.random): Fact {
  if (random() < MOON_CHANCE) return MOON
  const { facts } = TIERS[tier]
  return facts[Math.min(Math.floor(random() * facts.length), facts.length - 1)]
}

/** The number of a message (`9.7` times, `19` %), `null` for the messages without one. */
export function factValue({ landmark, kind }: Fact, meters: number): number | null {
  if (kind === 'times') return meters / LANDMARKS[landmark]
  if (kind === 'percent') return (meters / LANDMARKS[landmark]) * 100
  return null
}

/** The message kept for the day: picked once per day and per tier, then shown again (#32). */
export interface FactChoice {
  /** The day it was picked for: the time of its reset, as an ISO string. */
  day: string
  tier: number
  fact: Fact
}

/**
 * The message of the day: the one kept when it was picked for the same day and the same tier,
 * otherwise a new one (and the choice to keep). `null` under 2 000 steps.
 */
export function chooseFact(
  steps: number,
  day: string,
  kept: FactChoice | null,
  random: () => number = Math.random,
): FactChoice | null {
  const tier = factTier(steps)
  if (tier === null) return null
  if (kept !== null && kept.day === day && kept.tier === tier) return kept
  return { day, tier, fact: pickFact(tier, random) }
}

/**
 * The landmark closest to a finished image's distance (compared by ratio, so 19 km is close to
 * 17 km), and whether the distance is above it. The Moon is too far to ever be the closest.
 */
export function closestLandmark(meters: number): { landmark: Landmark; above: boolean } {
  const landmarks = (Object.keys(LANDMARKS) as Landmark[]).filter((landmark) => landmark !== 'moon')
  const landmark = landmarks.reduce((best, candidate) =>
    Math.abs(Math.log(meters / LANDMARKS[candidate])) < Math.abs(Math.log(meters / LANDMARKS[best])) ? candidate : best,
  )
  return { landmark, above: meters >= LANDMARKS[landmark] }
}
