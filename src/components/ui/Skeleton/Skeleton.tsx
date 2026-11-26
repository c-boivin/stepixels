import { useEffect, useState } from 'react'
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

import { useColors } from '~/styles/theme'

export interface SkeletonProps {
  style?: StyleProp<ViewStyle>
}

/** A pulsing placeholder that takes the shape of the content being loaded (teacher's example repository). */
export function Skeleton({ style }: SkeletonProps) {
  const colors = useColors()
  const [opacity] = useState(() => new Animated.Value(1))

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    )

    pulse.start()
    return () => pulse.stop()
  }, [opacity])

  return <Animated.View style={[STYLES.skeleton, { backgroundColor: colors.control }, style, { opacity }]} />
}

const STYLES = StyleSheet.create({
  skeleton: { height: 20 },
})
