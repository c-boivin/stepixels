import { communityTotalAdapter } from '~/data/adapters/community.adapters'
import { communityRepository } from '~/repositories/community.repository'

import type { OnboardingWelcomePageData } from '~/app/onboarding/welcome'

/** Load the onboarding welcome screen: the community total, or `null` when none is known yet. */
export async function getOnboardingWelcomePage(signal: AbortSignal): Promise<OnboardingWelcomePageData> {
  const total = await communityRepository.getTotal(signal)

  return { communityTotal: communityTotalAdapter(total) }
}
