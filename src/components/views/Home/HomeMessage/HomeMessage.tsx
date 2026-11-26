import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'

import { useReduceMotion } from '~/hooks/useReduceMotion'

import { TYPO, useColors } from '~/styles/theme'

/** Out, then in: short enough to follow a swipe of the carousel. */
const FADE_OUT_MS = 120
const FADE_IN_MS = 180

/** The message above the carousel: an overline and a sentence. */
export interface HomeMessageParams {
  /** `LE SAVIEZ-VOUS ?`, `DOMMAGE`, `VALIDÉ`, `NOUVELLE IMAGE`, `IMAGE TERMINÉE` */
  title: string
  description: string
}

export interface HomeMessageProps {
  /** `null`: the block stays empty, and keeps its place. */
  message: HomeMessageParams | null
}

/**
 * The message under the counter (#27, #32). When it changes (a swipe to a finished image, a new
 * day), the old one fades out and the new one fades in, instead of jumping; at once with
 * "Reduce motion".
 */
export function HomeMessage({ message }: HomeMessageProps) {
  const colors = useColors()
  const reduceMotion = useReduceMotion()
  const [shown, setShown] = useState(message)
  const [opacity] = useState(() => new Animated.Value(1))
  const latest = useRef(message)

  const title = message?.title
  const description = message?.description

  useEffect(() => {
    latest.current = message
    // "Reduce motion" shows the new message at once (see `visible` below)
    if (reduceMotion) return
    // the same message (or back to it during a fade): make sure it is fully shown
    if (title === shown?.title && description === shown?.description) {
      const fadeIn = Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true })
      fadeIn.start()
      return () => fadeIn.stop()
    }

    const fadeOut = Animated.timing(opacity, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true })
    fadeOut.start(({ finished }) => {
      if (!finished) return
      // the message may have changed again during the fade: show the latest one
      setShown(latest.current)
      Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true }).start()
    })
    return () => fadeOut.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `message` is read through `latest`: a new object with the same texts must not restart the fade
  }, [title, description, shown, reduceMotion, opacity])

  const visible = reduceMotion ? message : shown
  if (!visible) return null

  return (
    <Animated.View accessible style={[STYLES.content, { opacity: reduceMotion ? 1 : opacity }]}>
      <Text style={[TYPO.overline12, { color: colors.accentText }]}>{visible.title}</Text>
      <Text style={[TYPO.fact17, STYLES.centered, { color: colors.text }]}>{visible.description}</Text>
    </Animated.View>
  )
}

const STYLES = StyleSheet.create({
  content: { alignItems: 'center', gap: 12 },
  centered: { textAlign: 'center' },
})
