import { useEffect, useEffectEvent } from 'react'
import { AppState } from 'react-native'

/**
 * Calls `onActive` each time the app comes back to the foreground, to read again what may have
 * changed while it was in the background (steps, permissions). The listener is removed on unmount.
 */
export function useAppActive(onActive: () => void) {
  // always calls the latest `onActive`, without adding the listener again at each render
  const onActiveEvent = useEffectEvent(onActive)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') onActiveEvent()
    })
    return () => subscription.remove()
  }, [])
}
