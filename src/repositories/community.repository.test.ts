import AsyncStorage from '@react-native-async-storage/async-storage'

import { supabase } from '~/lib/supabase'
import { COMMUNITY_TOTAL_TIMEOUT, communityRepository } from '~/repositories/community.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'

// the Supabase client needs the .env keys and the network: only its answer matters here
jest.mock('~/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }))

/** Makes `community_total()` answer like Supabase does: `{ data, error }`. */
function answer(response: { data: unknown; error: unknown }) {
  jest.mocked(supabase.rpc).mockReturnValue({ abortSignal: () => Promise.resolve(response) } as never)
}

const signal = new AbortController().signal

describe('communityRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  // a test that fails halfway must not leave the fake timers to the next ones
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns the total from Supabase and keeps it for offline use', async () => {
    answer({ data: 1_284_302, error: null })

    expect(await communityRepository.getTotal(signal)).toBe(1_284_302)
    expect(supabase.rpc).toHaveBeenCalledWith('community_total')
    expect(await preferencesRepository.getCommunityTotal()).toBe(1_284_302)
  })

  it('returns the last known total when Supabase cannot be reached', async () => {
    await preferencesRepository.setCommunityTotal(1_000_000)
    answer({ data: null, error: { message: 'TypeError: Network request failed' } })

    expect(await communityRepository.getTotal(signal)).toBe(1_000_000)
  })

  it('returns null on a first launch without network', async () => {
    answer({ data: null, error: { message: 'TypeError: Network request failed' } })

    expect(await communityRepository.getTotal(signal)).toBeNull()
  })

  it(`returns the last known total when Supabase does not answer within ${COMMUNITY_TOTAL_TIMEOUT / 1000} seconds`, async () => {
    jest.useFakeTimers()
    await preferencesRepository.setCommunityTotal(1_000_000)
    // a call that only ends when it is cancelled, like a request on a very slow network
    jest.mocked(supabase.rpc).mockReturnValue({
      abortSignal: (abort: AbortSignal) =>
        new Promise((resolve) => abort.addEventListener('abort', () => resolve({ data: null, error: { message: 'AbortError' } }))),
    } as never)

    const total = communityRepository.getTotal(signal)
    await jest.advanceTimersByTimeAsync(COMMUNITY_TOTAL_TIMEOUT)

    expect(await total).toBe(1_000_000)
  })

  it('ignores an answer that is not a number', async () => {
    await preferencesRepository.setCommunityTotal(42)
    answer({ data: 'abc', error: null })

    expect(await communityRepository.getTotal(signal)).toBe(42)
  })
})
