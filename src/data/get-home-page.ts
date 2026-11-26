import { imageCardAdapter } from '~/data/adapters/images.adapters'
import { CATALOGUE } from '~/data/images/catalogue'
import { getImagesProgress } from '~/lib/progress'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { HomePageData } from '~/app/index'

/**
 * Load what the first route needs: has the user finished the onboarding, and where each image
 * stands, from the validations saved on the phone (the source of truth, ADR-004).
 */
export async function getHomePage(): Promise<HomePageData> {
  const progress = getImagesProgress(CATALOGUE, validationsRepository.getAll())

  return {
    onboardingDone: await preferencesRepository.getOnboardingDone(),
    images: progress.map(imageCardAdapter),
  }
}
