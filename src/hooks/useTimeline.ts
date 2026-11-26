import { useEffect, useRef, useState } from 'react'

// about 30 frames per second: enough for a counter and pixels that appear one by one
const FRAME_MS = 33

/** One run of an animation: when it started (`Date.now()`) and how long it lasts, in milliseconds. */
export interface TimelineRun {
  startedAt: number
  duration: number
}

/**
 * The progress of an animation, from 0 to 1, for values that React draws (a counter, a number of
 * pixels) and not a native style. Calls `onEnd` once the run is over. No run (`null`): 0.
 */
export function useTimeline(run: TimelineRun | null, onEnd: () => void): number {
  const [now, setNow] = useState(() => Date.now())
  // the latest callback, without starting the run again when it changes
  const onEndRef = useRef(onEnd)

  useEffect(() => {
    onEndRef.current = onEnd
  })

  useEffect(() => {
    if (run === null) return

    const timer = setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time >= run.startedAt + run.duration) {
        clearInterval(timer)
        onEndRef.current()
      }
    }, FRAME_MS)
    return () => clearInterval(timer)
  }, [run])

  if (run === null || run.duration <= 0) return run === null ? 0 : 1
  return Math.min(Math.max((now - run.startedAt) / run.duration, 0), 1)
}
