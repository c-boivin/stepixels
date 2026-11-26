import { homeDayAdapter } from '~/data/adapters/home.adapters'
import { imageCardAdapter } from '~/data/adapters/images.adapters'
import { CATALOGUE } from '~/data/images/catalogue'
import { getDayWindows, isWorthShowingLoss } from '~/lib/day'
import { getImagesProgress } from '~/lib/progress'
import { getStepsBetween } from '~/lib/steps'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { HomePageData } from '~/app/index'

/**
 * Load the first route: has the user finished the onboarding? If so, the home screen data:
 * where each image stands, from the validations saved on the phone (the source of truth, ADR-004),
 * the steps of the day read on the phone (R12), the steps lost yesterday and the next reset.
 * Throws when the steps cannot be read: the route's ErrorBoundary offers to retry.
 */
export async function getHomePage(): Promise<HomePageData> {
  if (!(await preferencesRepository.getOnboardingDone())) return { onboardingDone: false }

  const allValidations = validationsRepository.getAll()
  const [resetTime, startedAt] = await Promise.all([
    preferencesRepository.getResetTime(),
    preferencesRepository.getStartedAt(),
  ])
  const { counter, lost, nextReset } = getDayWindows({
    resetTime,
    now: new Date(),
    lastValidatedAt: validationsRepository.getLastValidatedAt(),
    startedAt,
  })

  const [stepsToValidate, lostSteps] = await Promise.all([
    getStepsBetween(counter.start, counter.end),
    lost && getStepsBetween(lost.start, lost.end),
  ])

  return {
    onboardingDone: true,
    images: getImagesProgress(CATALOGUE, allValidations).map(imageCardAdapter),
    day: homeDayAdapter({
      stepsToValidate,
      lostSteps: lostSteps !== null && isWorthShowingLoss(lostSteps) ? lostSteps : null,
      nextReset,
    }),
  }
}
