import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native'

import { ImageCard } from '~/components/ui/ImageCard'

import { i18n } from '~/lib/i18n'

import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import type { PixelGridParams } from '~/components/ui/PixelGrid'
import type { ImageState } from '~/lib/progress'

// sizes of the Figma carousel: the card in front, its neighbours, and the space between them
/** Side of the card in front, when the screen is tall enough (Figma). */
export const CAROUSEL_CARD = 293
const NEIGHBOUR_SCALE = 240 / CAROUSEL_CARD
const GAP = 16
const NEIGHBOUR_OPACITY = 0.75

/** From the center of one card to the next, for a card of this side: the carousel snaps every slot. */
function carouselSlot(card = CAROUSEL_CARD): number {
  return card / 2 + GAP + (card * NEIGHBOUR_SCALE) / 2
}

export interface HomeCarouselItemParams extends PixelGridParams {
  /** Number of the image in the catalogue. */
  number: number
  state: ImageState
  /** `01 - LE CHAMPIGNON` */
  title: string
  /** `EN COURS`, `NOUVELLE`, `TERMINÉE`; `null` for the locked image. */
  tag: string | null
  /** Steps of a finished image (`25 600`), `null` otherwise. */
  steps: string | null
  /** "Le saviez-vous ?" about a finished image (#32), `null` otherwise. */
  fact: string | null
  /** Everything the card shows, read as one sentence by the screen reader. */
  summary: string
  /** The reveal animation runs on this card (#29): an orange line instead of the next pixel. */
  revealing?: boolean
}

export interface HomeCarouselProps {
  /** The images to browse: finished ones, the one being revealed, then the locked one. */
  items: HomeCarouselItemParams[]
  /** The card in front: the carousel scrolls to it when it changes. */
  index: number
  /** Called when the user swipes to another card. */
  onIndexChange: (index: number) => void
  /** Side of the card in front: smaller on a short screen, so the home screen fits (default 293). */
  card?: number
}

/**
 * The images of the home screen in a horizontal carousel (#28): the card in front, the finished
 * images on its left and the next image on its right, locked: only its dots and a padlock.
 */
export function HomeCarousel({ items, index, onIndexChange, card = CAROUSEL_CARD }: HomeCarouselProps) {
  const { width } = useWindowDimensions()
  const slot = carouselSlot(card)
  const list = useRef<FlatList<HomeCarouselItemParams>>(null)
  // created once: the scroll position drives the size and the fading of every card
  const [scrollX] = useState(() => new Animated.Value(index * slot))
  // the first position only: given again on each render, iOS would jump there instead of sliding
  const [initialOffset] = useState(() => ({ x: index * slot, y: 0 }))
  // the card in front as the scroll knows it: a new `index` from the parent scrolls only when it differs
  const shownIndex = useRef(index)

  // room on each side, so that the first and the last cards can be centered
  const side = (width - slot) / 2

  useEffect(() => {
    if (index === shownIndex.current) return
    shownIndex.current = index
    list.current?.scrollToOffset({ offset: index * slot, animated: true })
    // only a new card in front scrolls: a new size is handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // the card got its size once the screen was measured: stay on the same card, without sliding
  const firstSlot = useRef(slot)
  useEffect(() => {
    if (slot === firstSlot.current) return
    firstSlot.current = slot
    list.current?.scrollToOffset({ offset: shownIndex.current * slot, animated: false })
    scrollX.setValue(shownIndex.current * slot)
  }, [slot, scrollX])

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.min(Math.max(Math.round(event.nativeEvent.contentOffset.x / slot), 0), items.length - 1)
    if (next === shownIndex.current) return
    shownIndex.current = next
    onIndexChange(next)
  }

  return (
    <Animated.FlatList
      ref={list}
      horizontal
      data={items}
      keyExtractor={(item) => String(item.number)}
      extraData={index}
      // card `i` is centered at the scroll offset `i × SLOT`: the room on the left is a header, not a
      // padding, so that the list knows where each card is
      contentOffset={initialOffset}
      getItemLayout={(_, itemIndex) => ({ length: slot, offset: side + slot * itemIndex, index: itemIndex })}
      ListHeaderComponent={<View style={{ width: side }} />}
      showsHorizontalScrollIndicator={false}
      snapToOffsets={items.map((_, itemIndex) => itemIndex * slot)}
      decelerationRate="fast"
      // one card per swipe, however fast: without it, a fling on Android runs past every card
      disableIntervalMomentum
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
      // a slow drag released on a card ends without momentum: settle the card in front there too
      onScrollEndDrag={onScrollEnd}
      onMomentumScrollEnd={onScrollEnd}
      accessibilityLabel={i18n.t('home.carousel.label')}
      style={STYLES.list}
      renderItem={({ item, index: itemIndex }) => {
        // the card shrinks and fades as it leaves the front
        const inputRange = [(itemIndex - 1) * slot, itemIndex * slot, (itemIndex + 1) * slot]
        const scale = scrollX.interpolate({ inputRange, outputRange: [NEIGHBOUR_SCALE, 1, NEIGHBOUR_SCALE], extrapolate: 'clamp' })
        const opacity = scrollX.interpolate({ inputRange, outputRange: [NEIGHBOUR_OPACITY, 1, NEIGHBOUR_OPACITY], extrapolate: 'clamp' })
        // and its tag and blur follow the finger, instead of jumping once the swipe is over
        const focus = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' })

        return (
          <Animated.View
            accessible
            accessibilityLabel={item.summary}
            accessibilityState={{ selected: itemIndex === index }}
            style={[STYLES.slot, { width: slot, height: card, opacity, transform: [{ scale }] }]}>
            <ImageCard
              {...gridOf(item)}
              size={card}
              tag={item.tag ?? undefined}
              // the next pixel is marked on a new image too (Figma "Nouvelle image", #31)
              showNext={(item.state === 'current' || item.state === 'new') && !item.revealing}
              revealLine={item.revealing}
              locked={item.state === 'locked'}
              focus={focus}
            />
          </Animated.View>
        )
      }}
      ListFooterComponent={<View style={{ width: side }} />}
    />
  )
}

/** Only what the grid draws: the texts stay on the carousel. */
function gridOf({ width, height, palette, cells, revealed }: HomeCarouselItemParams): PixelGridParams {
  return { width, height, palette, cells, revealed }
}

const STYLES = StyleSheet.create({
  list: { flexGrow: 0, overflow: 'visible' },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

/** The slot of a full-size card: the carousel snaps every `CAROUSEL_SLOT` points. */
export const CAROUSEL_SLOT = carouselSlot()
