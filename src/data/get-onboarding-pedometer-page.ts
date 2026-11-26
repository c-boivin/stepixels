import { getStepsAccess } from '~/lib/steps'

import type { OnboardingPedometerPageData } from '~/app/onboarding/pedometer'

/** Load the onboarding pedometer screen: read the steps access first, without asking (`docs/conventions.md`). */
export async function getOnboardingPedometerPage(): Promise<OnboardingPedometerPageData> {
  return { access: await getStepsAccess() }
}
