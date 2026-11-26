import { homeDayAdapter } from '~/data/adapters/home.adapters'
import { imageCardAdapter } from '~/data/adapters/images.adapters'
import { CATALOGUE } from '~/data/images/catalogue'
import { getDayWindows, isWorthShowingLoss } from '~/lib/day'
import { getImagesProgress } from '~/lib/progress'
import { getStepsAccess, getStepsBetween } from '~/lib/steps'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { HomePageData } from '~/app/index'
import type { StepsAccess } from '~/lib/steps'

/**
 * Load the first route: has the user finished the onboarding? If so, the home screen data:
 * where each image stands, from the validations saved on the phone (the source of truth, ADR-004),
 * the steps of the day read on the phone (R12), the steps lost yesterday and the next reset.
 * When the steps access was removed in the settings, the home screen still shows, without the
 * steps. Throws when the steps cannot be read for another reason: the route's ErrorBoundary
 * offers to retry.
 */
export async function getHomePage(): Promise<HomePageData> {
  if (!(await preferencesRepository.getOnboardingDone())) return { home: null }

  const now = new Date()
  const allValidations = validationsRepository.getAll()
  const [resetTime, startedAt] = await Promise.all([
    preferencesRepository.getResetTime(),
    // an install that finished the onboarding before the start date was saved gets it now
    preferencesRepository.getStartedAt().then((date) => date ?? preferencesRepository.setStartedAt(now)),
  ])
  const { counter, lost, nextReset } = getDayWindows({
    resetTime,
    now,
    lastValidatedAt: validationsRepository.getLastValidatedAt(),
    startedAt,
  })

  const steps = await readSteps(counter, lost)

  return {
    home: {
      images: getImagesProgress(CATALOGUE, allValidations).map(imageCardAdapter),
      day: homeDayAdapter({
        stepsAccess: steps.access,
        stepsToValidate: steps.toValidate,
        lostSteps: steps.lost !== null && isWorthShowingLoss(steps.lost) ? steps.lost : null,
        nextReset,
      }),
    },
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
