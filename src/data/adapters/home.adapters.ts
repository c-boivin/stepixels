import { dailyFactAdapter } from '~/data/adapters/facts.adapters'
import { i18n } from '~/lib/i18n'
import { METERS_PER_STEP } from '~/lib/rules'

import type { HomeDayParams, HomeMessageParams, HomeRevealParams } from '~/components/views/Home'
import type { HomeFinishedModalParams } from '~/components/views/Home/HomeFinishedModal'
import type { Fact } from '~/lib/facts'
import type { StepsAccess } from '~/lib/steps'

// French thousands separator: 1230 → "1 230"
const COUNT_FORMAT = new Intl.NumberFormat('fr-FR')
// distances as in the design: "3,2 km" under 10 km, "19 km" above (19.2 km)
const SHORT_DISTANCE_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const LONG_DISTANCE_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/** The message above the carousel, by priority: the getter picks one (`get-home-page.ts`). */
export type HomeMessageRaw =
  /** Steps lost at the last reset ("DOMMAGE", OQ-25). */
  | { kind: 'lost'; steps: number }
  /** The image is finished and waits for `SUIVANT` (#31). */
  | { kind: 'finished'; textKey: string; steps: number }
  /** A validation was made today, and fewer than 100 steps wait (#29). */
  | { kind: 'validated'; steps: number }
  /** An image was unlocked, and nothing was validated since (#31). */
  | { kind: 'new_image'; number: number }
  /** "Le saviez-vous ?" (#32): the fact of the day, when nothing else has to be said. */
  | { kind: 'fact'; fact: Fact; steps: number }

export interface HomeDayRaw {
  /** Access to the phone's steps: when it is not `granted`, the steps are `null`. */
  stepsAccess: StepsAccess
  /** Steps walked since the last validation, in the current day; `null` when they cannot be read. */
  stepsToValidate: number | null
  message: HomeMessageRaw | null
  nextReset: Date
}

/** The day shown on the home screen (counter, message, countdown, button), ready to display. */
export function homeDayAdapter({ stepsAccess, stepsToValidate, message, nextReset }: HomeDayRaw): HomeDayParams {
  return {
    stepsAccess,
    counter: stepsToValidate === null ? null : formatCounter(stepsToValidate),
    message: message === null ? null : homeMessageAdapter(message),
    validateValue: i18n.t('home.validate.value', { steps: COUNT_FORMAT.format(stepsToValidate ?? 0) }),
    nextReset,
  }
}

function homeMessageAdapter(message: HomeMessageRaw): HomeMessageParams {
  switch (message.kind) {
    case 'lost':
      return {
        title: i18n.t('home.lost.title'),
        description: i18n.t('home.lost.description', { steps: COUNT_FORMAT.format(message.steps) }),
      }
    case 'finished':
      return {
        title: i18n.t('home.message.finished.title'),
        description: i18n.t('home.message.finished.description', {
          complete: i18n.t(`${message.textKey}.complete`),
          distance: formatDistance(message.steps),
        }),
      }
    case 'validated':
      return {
        title: i18n.t('home.message.validated.title'),
        description: i18n.t('home.message.validated.description', { steps: COUNT_FORMAT.format(message.steps) }),
      }
    case 'fact':
      return { title: i18n.t('home.fact.title'), description: dailyFactAdapter(message.steps, message.fact) }
    case 'new_image':
      return {
        title: i18n.t('home.message.new_image.title'),
        description: i18n.t('home.message.new_image.description', { number: String(message.number).padStart(2, '0') }),
      }
  }
}

export interface HomeRevealRaw {
  /** The image being revealed, where the animation runs. */
  imageNumber: number
  /** Steps of the counter, counted down to 0 by the animation. */
  steps: number
  /** Pixels of the validation, on every image it touches. */
  pixels: number
  /** Revealed cells of the image before the validation, and after (at most its number of cells). */
  revealedFrom: number
  revealedTo: number
  /** The modal shown after the animation, when the validation finishes the image. */
  finished: HomeFinishedModalParams | null
}

/** What `VALIDER` shows while it reveals the pixels (#29). */
export function homeRevealAdapter({ pixels, steps, ...reveal }: HomeRevealRaw): HomeRevealParams {
  return {
    ...reveal,
    counterAt: (progress) => formatCounter(Math.round(steps * (1 - progress))),
    pixels: i18n.t('home.validate.pixels', { count: pixels, pixels: COUNT_FORMAT.format(pixels) }),
  }
}

/** The big counter has no thousands separator, as in the design (`4230`). */
function formatCounter(steps: number): string {
  return String(steps)
}

/** A distance walked, from steps (R6): `3,2 km`, `19 km`. */
export function formatDistance(steps: number): string {
  const km = (steps * METERS_PER_STEP) / 1000
  const format = km < 10 ? SHORT_DISTANCE_FORMAT : LONG_DISTANCE_FORMAT

  return i18n.t('home.distance', { km: format.format(km) })
}
