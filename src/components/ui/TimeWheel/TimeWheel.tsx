import { useRef, useState } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

/** Space between two neighbor times, as in the Figma wheel ("Sélecteur d'heure"). */
const ROW_HEIGHT = 40
/** Height of the band around the selected time: 64 px time, 8 px padding, 1 px lines. */
const SELECTION_HEIGHT = 99
const SELECTION_WIDTH = 240
/** Gap between the band and its neighbors. */
const GAP = 10
/** How far the neighbors move away from the center, to leave room for the big selected time. */
const NEIGHBOR_SHIFT = (SELECTION_HEIGHT - ROW_HEIGHT) / 2 + GAP
/** Two times visible above and below the selected one. */
const WHEEL_HEIGHT = ROW_HEIGHT + 2 * (2 * ROW_HEIGHT + NEIGHBOR_SHIFT)
/** Height of a time at full size (64 px font): more than a row, so the text is not cut. */
const TEXT_HEIGHT = 80
/** Size of the neighbors compared to the selected time: Pixel/Titre 26 and Pixel/Roue 22, next to Pixel/Heure 64. */
const NEAR_SCALE = 26 / 64
const FAR_SCALE = TYPO.wheel22.fontSize / TYPO.hour64.fontSize

export interface TimeWheelProps {
  /** The times to pick from, in order (`HH:MM`). */
  times: readonly string[]
  /** The selected time, one of `times`. */
  value: string
  /** Called with the new time as soon as the wheel stops on it, while scrolling too. */
  onChange: (time: string) => void
  /** What the screen reader calls the wheel ("Heure de remise à zéro"). */
  accessibilityLabel: string
}

/**
 * A wheel to pick a time (Figma "Sélecteur d'heure"): the selected time big and orange between two
 * lines, its neighbors smaller and faded. Controlled, like an input: the parent keeps the value. With a screen reader, it is one "adjustable" element: swipe up or down.
 */
export function TimeWheel({ times, value, onChange, accessibilityLabel }: TimeWheelProps) {
  const colors = useColors()
  const selectedIndex = Math.max(times.indexOf(value), 0)

  // the scroll position drives the size and opacity of each time on the native side,
  // without a render for every pixel (same technique as the carousel of the course)
  const [scrollY] = useState(() => new Animated.Value(selectedIndex * ROW_HEIGHT))
  const list = useRef<FlatList<string>>(null)

  // a change is sent when the wheel crosses another time, not for every pixel
  function select(index: number) {
    if (index === selectedIndex) return

    onChange(times[index])
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    select(clamp(Math.round(event.nativeEvent.contentOffset.y / ROW_HEIGHT), 0, times.length - 1))
  }

  // safety net: if the wheel still stops between two times (iOS ignored the snap points),
  // move it to the closest time once it has stopped (never while it moves: that broke fast scrolls)
  function snapToClosest(y: number) {
    const offset = clamp(Math.round(y / ROW_HEIGHT), 0, times.length - 1) * ROW_HEIGHT
    if (Math.abs(y - offset) > 0.5) list.current?.scrollToOffset({ offset, animated: true })
  }

  function onMomentumScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    snapToClosest(event.nativeEvent.contentOffset.y)
  }

  // screen reader: swipe up = next time, swipe down = previous time
  function onAccessibilityAction(event: AccessibilityActionEvent) {
    const step = event.nativeEvent.actionName === 'increment' ? 1 : -1
    const index = clamp(selectedIndex + step, 0, times.length - 1)

    select(index)
    list.current?.scrollToOffset({ offset: index * ROW_HEIGHT, animated: true })
  }

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      style={STYLES.wheel}>
      <View style={[STYLES.selection, { borderColor: colors.text }]} />
      <Animated.FlatList
        ref={list}
        data={times}
        keyExtractor={(time) => time}
        // 48 short rows: render them all, so the wheel can open on 20:00 at once
        initialNumToRender={times.length}
        contentOffset={{ x: 0, y: selectedIndex * ROW_HEIGHT }}
        contentContainerStyle={STYLES.content}
        showsVerticalScrollIndicator={false}
        // stop on a time: the exact snap points, more reliable on iOS than snapToInterval
        snapToOffsets={times.map((_, index) => index * ROW_HEIGHT)}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: onScroll,
        })}
        renderItem={({ item, index }) => (
          <TimeWheelRow time={item} index={index} scrollY={scrollY} selected={index === selectedIndex} />
        )}
      />
    </View>
  )
}

interface TimeWheelRowProps {
  time: string
  index: number
  scrollY: Animated.Value
  selected: boolean
}

function TimeWheelRow({ time, index, scrollY, selected }: TimeWheelRowProps) {
  const colors = useColors()
  // positions of the wheel where this time is 3, 2, 1 rows above the center, at the center, then below
  const inputRange = [-3, -2, -1, 0, 1, 2, 3].map((rows) => (index + rows) * ROW_HEIGHT)
  const interpolate = (outputRange: number[]) => scrollY.interpolate({ inputRange, outputRange, extrapolate: 'clamp' })

  return (
    <Animated.View
      style={[
        STYLES.row,
        {
          opacity: interpolate([0, 0.35, 0.6, 1, 0.6, 0.35, 0]),
          transform: [
            { translateY: interpolate([NEIGHBOR_SHIFT, NEIGHBOR_SHIFT, NEIGHBOR_SHIFT, 0, -NEIGHBOR_SHIFT, -NEIGHBOR_SHIFT, -NEIGHBOR_SHIFT]) },
            { scale: interpolate([FAR_SCALE, FAR_SCALE, NEAR_SCALE, 1, NEAR_SCALE, FAR_SCALE, FAR_SCALE]) },
          ],
        },
      ]}>
      <View style={STYLES.time}>
        <Text style={[TYPO.hour64, { color: selected ? colors.accent : colors.muted }]}>{time}</Text>
      </View>
    </Animated.View>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

const STYLES = StyleSheet.create({
  wheel: {
    width: '100%',
    height: WHEEL_HEIGHT,
  },
  // the two lines around the selected time, drawn above the list without catching the touches
  selection: {
    position: 'absolute',
    top: (WHEEL_HEIGHT - SELECTION_HEIGHT) / 2,
    alignSelf: 'center',
    width: SELECTION_WIDTH,
    height: SELECTION_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    pointerEvents: 'none',
  },
  // the first and last times can reach the center
  content: { paddingVertical: (WHEEL_HEIGHT - ROW_HEIGHT) / 2 },
  row: { height: ROW_HEIGHT },
  // the 64 px time is taller than its row: out of the flow, Android does not cut it to the row height
  time: {
    position: 'absolute',
    top: (ROW_HEIGHT - TEXT_HEIGHT) / 2,
    left: 0,
    right: 0,
    height: TEXT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
