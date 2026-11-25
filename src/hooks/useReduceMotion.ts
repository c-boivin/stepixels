import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/** Whether the phone's "Reduce motion" setting is on, kept up to date while the app runs. */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  return reduceMotion
}
