import { homeDayAdapter, homeRevealAdapter } from '~/data/adapters/home.adapters'
import { imageCardAdapter, imageFinishedAdapter } from '~/data/adapters/images.adapters'
import { CATALOGUE } from '~/data/images/catalogue'
import { countDays, getDayStart, getDayWindows, isWorthShowingLoss } from '~/lib/day'
import { getImagesProgress, getUnlockedImageFromValidations, splitPixels } from '~/lib/progress'
import { STEPS_PER_PIXEL } from '~/lib/rules'
import { getStepsAccess, getStepsBetween } from '~/lib/steps'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { HomePageData } from '~/app/index'
import type { HomeMessageRaw } from '~/data/adapters/home.adapters'
import type { CatalogueImage } from '~/data/images/catalogue'
import type { ImageProgress } from '~/lib/progress'
import type { StepsAccess } from '~/lib/steps'
import type { Validation } from '~/repositories/validations.repository'

/**
 * Load the first route: has the user finished the onboarding? If so, the home screen data:
 * where each image stands, from the validations saved on the phone (the source of truth, ADR-004),
 * the steps of the day read on the phone (R12), the message of the day, the next reset, and what
 * `VALIDER` (#29) or `SUIVANT` (#31) would do.
 * When the steps access was removed in the settings, the home screen still shows, without the
 * steps. Throws when the steps cannot be read for another reason: the route's ErrorBoundary
 * offers to retry.
 */
export async function getHomePage(): Promise<HomePageData> {
  if (!(await preferencesRepository.getOnboardingDone())) return { home: null }

  const now = new Date()
  const allValidations = validationsRepository.getAll()
  const [resetTime, startedAt, unlocked] = await Promise.all([
    preferencesRepository.getResetTime(),
    // an install that finished the onboarding before the start date was saved gets it now
    preferencesRepository.getStartedAt().then((date) => date ?? preferencesRepository.setStartedAt(now)),
    preferencesRepository.getUnlockedImage(),
  ])
  const lastValidation = getLastValidation(allValidations)
  const { counter, lost, nextReset } = getDayWindows({
    resetTime,
    now,
    lastValidatedAt: lastValidation?.validatedAt ?? null,
    startedAt,
  })

  const steps = await readSteps(counter, lost)

  // saved by SUIVANT, or shown by the validations: those come back with an account's progress (#64)
  const unlockedNumber = Math.max(
    unlocked.number,
    getUnlockedImageFromValidations(
      CATALOGUE,
      allValidations.map((row) => ({ ...row, validatedAt: new Date(row.validatedAt) })),
    ),
  )
  const progress = getImagesProgress(CATALOGUE, allValidations, unlockedNumber)
  const revealing = progress.find(({ state }) => state === 'current' || state === 'new') ?? null
  // the finished image waits for `SUIVANT` (#31) when an image after it can be unlocked
  const waiting = revealing === null ? (progress.find(({ image }) => image.number === unlockedNumber) ?? null) : null
  const unlock = waiting !== null && waiting.state === 'finished' && unlockedNumber < CATALOGUE.length ? unlockedNumber + 1 : null
  // validating would give 0 pixel under 100 steps (OQ-11)
  const pixels = steps.toValidate === null ? 0 : Math.floor(steps.toValidate / STEPS_PER_PIXEL)

  let message: HomeMessageRaw | null = null
  if (unlock !== null && waiting !== null) {
    message = { kind: 'finished', textKey: waiting.image.textKey, steps: waiting.image.steps }
  } else if (steps.lost !== null && isWorthShowingLoss(steps.lost)) {
    message = { kind: 'lost', steps: steps.lost }
  } else if (steps.toValidate !== null && pixels === 0) {
    // these messages stay until there is something to validate again
    const lastAt = lastValidation?.validatedAt ?? null
    if (
      unlocked.number === unlockedNumber &&
      unlocked.unlockedAt !== null &&
      (lastAt === null || unlocked.unlockedAt > lastAt)
    ) {
      message = { kind: 'new_image', number: unlocked.number }
    } else if (lastValidation !== null && lastValidation.validatedAt >= getDayStart(resetTime, now)) {
      message = { kind: 'validated', steps: lastValidation.steps }
    }
  }

  return {
    home: {
      images: progress.map(imageCardAdapter),
      day: homeDayAdapter({ stepsAccess: steps.access, stepsToValidate: steps.toValidate, message, nextReset }),
      validation:
        revealing !== null && steps.toValidate !== null && pixels > 0
          ? getValidation({ revealing, allValidations, steps: steps.toValidate, pixels, resetTime, readAt: counter.end })
          : null,
      unlock,
    },
  }
}

/** The last validation (its rows share the same time), with its steps on every image; `null` before the first one. */
function getLastValidation(allValidations: Validation[]): { validatedAt: Date; steps: number } | null {
  const last = allValidations.at(-1)
  if (last === undefined) return null

  const steps = allValidations
    .filter(({ validatedAt }) => validatedAt === last.validatedAt)
    .reduce((sum, row) => sum + row.steps, 0)
  return { validatedAt: new Date(last.validatedAt), steps }
}

interface ValidationInput {
  revealing: ImageProgress<CatalogueImage>
  allValidations: Validation[]
  steps: number
  pixels: number
  resetTime: string
  /** When the steps were read: the next counter starts there, so no step walked since is lost. */
  readAt: Date
}

/** What `VALIDER` saves (#29), and what it shows: the reveal, then the modal if the image gets finished (#31). */
function getValidation({ revealing, allValidations, steps, pixels, resetTime, readAt }: ValidationInput) {
  const { image, revealed } = revealing
  const parts = splitPixels(CATALOGUE, allValidations, pixels)
  const revealedTo = Math.min(revealed + (parts.find(({ imageNumber }) => imageNumber === image.number)?.pixels ?? 0), image.cells.length)

  // the days of the image, with the one of this validation
  const days = countDays(
    [...allValidations.filter(({ imageNumber }) => imageNumber === image.number).map(({ validatedAt }) => new Date(validatedAt)), readAt],
    resetTime,
  )
  const next = CATALOGUE.some(({ number }) => number === image.number + 1) ? image.number + 1 : null

  return {
    parts,
    readAt,
    reveal: homeRevealAdapter({
      imageNumber: image.number,
      steps,
      pixels: parts.reduce((sum, part) => sum + part.pixels, 0),
      revealedFrom: revealed,
      revealedTo,
      finished: revealedTo === image.cells.length ? imageFinishedAdapter({ image, days, next }) : null,
    }),
  }
}

type Window = { start: Date; end: Date }

/**
 * Reads the steps of the counter and the lost steps. When the read fails, reads the access:
 * removed in the settings → no steps, the screen explains it; still granted → a real error.
 */
async function readSteps(
  counter: Window,
  lost: Window | null,
): Promise<{ access: StepsAccess; toValidate: number | null; lost: number | null }> {
  try {
    const [toValidate, lostSteps] = await Promise.all([
      getStepsBetween(counter.start, counter.end),
      lost && getStepsBetween(lost.start, lost.end),
    ])
    return { access: 'granted', toValidate, lost: lostSteps }
  } catch (error) {
    const access = await getStepsAccess()
    if (access === 'granted') throw error

    return { access, toValidate: null, lost: null }
  }
}
