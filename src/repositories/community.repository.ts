import { supabase } from '~/lib/supabase'
import { preferencesRepository } from '~/repositories/preferences.repository'

/** After this delay, a slow network counts as offline: the last known total is shown instead. */
export const COMMUNITY_TOTAL_TIMEOUT = 5_000

/**
 * The total of steps revealed by the whole community (R10). It comes from the Supabase function
 * `community_total()`, callable without an account; the last total received is kept on the phone
 * so that the onboarding can show it offline.
 */
export const communityRepository = {
  /**
   * Total from Supabase when it answers in time (and kept for offline use); otherwise the last
   * known total, or `null` on a first launch without network.
   */
  async getTotal(signal: AbortSignal): Promise<number | null> {
    // stop the call when the screen leaves, or when the network is too slow
    const controller = new AbortController()
    const onAbort = () => controller.abort()
    const timeout = setTimeout(onAbort, COMMUNITY_TOTAL_TIMEOUT)
    signal.addEventListener('abort', onAbort)

    try {
      const { data, error } = await supabase.rpc('community_total').abortSignal(controller.signal)
      const total = Number(data)

      if (error === null && Number.isFinite(total)) {
        await preferencesRepository.setCommunityTotal(total)
        return total
      }
    } finally {
      clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
    }

    return preferencesRepository.getCommunityTotal()
  },
}
