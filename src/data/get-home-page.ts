import { preferencesRepository } from '~/repositories/preferences.repository'

import type { HomePageData } from '~/app/index'

/** Load what the first route needs to choose the screen: has the user finished the onboarding? */
export async function getHomePage(): Promise<HomePageData> {
  return { onboardingDone: await preferencesRepository.getOnboardingDone() }
}
