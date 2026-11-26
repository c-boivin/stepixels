import { useEffect, useEffectEvent, useState } from 'react'

import { formatCountdown } from '~/lib/day'

/**
 * The time left before `target` as `HH:MM:SS`, updated every second.
 * Calls `onEnd` once when it reaches `00:00:00`, for example to start a new day.
 */
export function useCountdown(target: Date, onEnd: () => void): string {
  const [now, setNow] = useState(() => new Date())
  const ended = now >= target
  const onEndEvent = useEffectEvent(onEnd)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // runs again only when `ended` changes: once at the end, not at every tick after it
  useEffect(() => {
    if (ended) onEndEvent()
  }, [ended])

  return formatCountdown(target, now)
}
