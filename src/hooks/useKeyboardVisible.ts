import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

// iOS tells before the keyboard moves, so the screen changes with it; Android only tells after
const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

/** Whether the keyboard is open, kept up to date while the screen is shown. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(() => Keyboard.isVisible())

  useEffect(() => {
    const show = Keyboard.addListener(SHOW, () => setVisible(true))
    const hide = Keyboard.addListener(HIDE, () => setVisible(false))

    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return visible
}
