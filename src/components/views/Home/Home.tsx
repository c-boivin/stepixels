import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '~/components/ui/Button'
import { TopBar } from '~/components/ui/TopBar'
import { HomeCarousel } from './HomeCarousel'
import { HomeFinishedModal } from './HomeFinishedModal'

import { useCountdown } from '~/hooks/useCountdown'
import { useReduceMotion } from '~/hooks/useReduceMotion'
import { useTimeline } from '~/hooks/useTimeline'

import { i18n } from '~/lib/i18n'
import { openStepsSettings, requestStepsAccess, type StepsAccess } from '~/lib/steps'

import type { HomeCarouselItemParams } from './HomeCarousel'
import type { HomeFinishedModalParams } from './HomeFinishedModal'
import type { TimelineRun } from '~/hooks/useTimeline'

import { TYPO, useColors } from '~/styles/theme'

/**
 * Minimum height of the message block: it keeps its place when empty, so the counter never moves
 * (#27). A long message (big number, bigger system font) makes it grow instead of covering the carousel.
 */
const MESSAGE_MIN_HEIGHT = 68
/** Length of the reveal animation (#29): 40 ms per pixel, between 1.5 and 3 seconds. */
const REVEAL_MS_PER_PIXEL = 40
const REVEAL_MIN_MS = 1500
const REVEAL_MAX_MS = 3000

/** The message above the carousel: an overline and a sentence. */
export interface HomeMessageParams {
  /** `DOMMAGE`, `VALIDÉ`, `NOUVELLE IMAGE`, `IMAGE TERMINÉE` */
  title: string
  description: string
}

/** The day shown on the home screen (#27, #30). */
export interface HomeDayParams {
  /** Access to the phone's steps: when it is not `granted`, the screen asks to allow it again. */
  stepsAccess: StepsAccess
  /** Steps to validate, digits only (`4230`); `null` when they cannot be read (`stepsAccess`). */
  counter: string | null
  /** The message above the carousel ("DOMMAGE", "VALIDÉ"…); `null` when there is none. */
  message: HomeMessageParams | null
  /** Steps on the `VALIDER` button: `4 230 PAS`. */
  validateValue: string
  /** End of the current day, where the countdown reaches 0. */
  nextReset: Date
}

/** What `VALIDER` reveals (#29), ready for the animation. */
export interface HomeRevealParams {
  /** The image being revealed, where the animation runs. */
  imageNumber: number
  /** Steps of the counter, counted down to 0. */
  steps: number
  /** `+42 PIXELS`, on the button while the pixels appear. */
  pixels: string
  /** Revealed cells of the image before the validation, and after. */
  revealedFrom: number
  revealedTo: number
  /** The modal shown after the animation, when the validation finishes the image (#31). */
  finished: HomeFinishedModalParams | null
}

export interface HomeProps extends HomeDayParams {
  /** The images of the carousel: finished ones, the one being revealed, then the locked one. */
  images: HomeCarouselItemParams[]
  /** What `VALIDER` would reveal; `null` disables it (under 100 steps). */
  reveal: HomeRevealParams | null
  /** Number of the image `SUIVANT` unlocks, when the image being revealed is finished (#31). */
  unlock: number | null
  /** Saves the validation; returns `false` when nothing was saved, so that nothing is animated. */
  onValidate: () => boolean
  /** `SUIVANT`: unlocks the image `number`. */
  onUnlock: (number: number) => void
  /** Called when the countdown reaches 0: a new day starts, the data must be read again (#30). */
  onDayEnd: () => void
  /** Called after the user answered the steps access dialog: the steps must be read again. */
  onStepsAccessChange: () => void
  /** Called on the gear of the top bar: opens the settings (#37). No gear until the settings screen exists. */
  onSettingsPress?: () => void
}

/**
 * The home screen: the steps to validate and the message of the day (#27), the image carousel (#28),
 * the time left before the reset (#27, #30), and `VALIDER`, which reveals the pixels row by row (#29),
 * then celebrates a finished image and unlocks the next one with `SUIVANT` (#31).
 */
export function Home({
  images,
  stepsAccess,
  counter,
  message,
  validateValue,
  nextReset,
  reveal,
  unlock,
  onValidate,
  onUnlock,
  onDayEnd,
  onStepsAccessChange,
  onSettingsPress,
}: HomeProps) {
  const colors = useColors()
  const countdown = useCountdown(nextReset, onDayEnd)
  const reduceMotion = useReduceMotion()
  // the validation being animated: kept here, since the data is read again as soon as it is saved
  const [revealing, setRevealing] = useState<{ reveal: HomeRevealParams; run: TimelineRun } | null>(null)
  const [finished, setFinished] = useState<HomeFinishedModalParams | null>(null)
  const progress = useTimeline(revealing?.run ?? null, () => {
    setFinished(revealing?.reveal.finished ?? null)
    setRevealing(null)
  })

  // the image being revealed; else the finished image waiting for `SUIVANT`, or the last one
  const inProgress = images.findIndex(({ state }) => state === 'current' || state === 'new')
  const currentIndex = inProgress >= 0 ? inProgress : images.findLastIndex(({ state }) => state !== 'locked')
  // the card the user swiped to, or `null` when on the image being revealed: if a validation
  // moves the image being revealed, the carousel follows it
  const [browsed, setBrowsed] = useState<number | null>(null)
  const index = browsed ?? currentIndex
  const items = revealing === null ? images : images.map((item) => revealedItem(item, revealing.reveal, progress))
  const inFront = items[index]
  const shownCounter = revealing === null ? counter : String(Math.round(revealing.reveal.steps * (1 - progress)))
  const shownMessage: HomeMessageParams | null =
    revealing === null
      ? message
      : { title: i18n.t('home.message.revealing.title'), description: i18n.t('home.message.revealing.description') }

  function onValidatePress() {
    if (reveal === null || revealing !== null || !onValidate()) return

    setBrowsed(null)
    const pixels = reveal.revealedTo - reveal.revealedFrom
    const duration = reduceMotion ? 0 : Math.min(Math.max(pixels * REVEAL_MS_PER_PIXEL, REVEAL_MIN_MS), REVEAL_MAX_MS)
    setRevealing({ reveal, run: { startedAt: Date.now(), duration } })
  }

  function onModalNext() {
    const next = finished?.next ?? null
    setFinished(null)
    if (next !== null) onUnlock(next)
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <View style={STYLES.top}>
        <TopBar
          title={i18n.t('home.title')}
          settings={onSettingsPress && { label: i18n.t('home.settings_label'), onPress: onSettingsPress }}
        />

        <View
          accessible
          accessibilityLabel={
            counter === null
              ? i18n.t('home.counter.unavailable_summary')
              : i18n.t('home.counter.summary', { steps: counter })
          }
          accessibilityLiveRegion="polite"
          style={STYLES.counter}>
          <Text style={[TYPO.overline12, { color: colors.muted }]}>{i18n.t('home.counter.title')}</Text>
          <Text style={[TYPO.number80, { color: colors.text }]}>{shownCounter ?? i18n.t('home.counter.unavailable')}</Text>
        </View>

        <View style={STYLES.message}>
          {/* the "Le saviez-vous ?" fact (#32) takes this place when there is no loss to show */}
          {stepsAccess !== 'granted' && (
            <View accessible style={STYLES.messageContent}>
              <Text style={[TYPO.overline12, { color: colors.accentText }]}>
                {i18n.t('home.steps_access.title')}
              </Text>
              <Text style={[TYPO.fact17, STYLES.centered, { color: colors.text }]}>
                {i18n.t('home.steps_access.description')}
              </Text>
            </View>
          )}
          {stepsAccess === 'granted' && shownMessage !== null && (
            <View accessible style={STYLES.messageContent}>
              <Text style={[TYPO.overline12, { color: colors.accentText }]}>{shownMessage.title}</Text>
              <Text style={[TYPO.fact17, STYLES.centered, { color: colors.text }]}>{shownMessage.description}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={STYLES.content}>
        <HomeCarousel
          items={items}
          index={index}
          onIndexChange={(next) => setBrowsed(next === currentIndex ? null : next)}
        />
        {/* the card's label already reads the title and the steps */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={STYLES.footer}>
          <Text style={[TYPO.label11, { color: colors.text }]}>{inFront.title}</Text>
          {inFront.steps !== null && <Text style={[TYPO.label11, { color: colors.text }]}>{inFront.steps}</Text>}
        </View>
      </View>

      <View style={STYLES.bottom}>
        <View
          accessible
          accessibilityLabel={i18n.t('home.countdown.summary', { time: countdown })}
          style={STYLES.countdown}>
          <Text style={[TYPO.label11, { color: colors.muted }]}>{i18n.t('home.countdown.title')}</Text>
          <Text style={[TYPO.label11, { color: colors.text }]}>{countdown}</Text>
        </View>
        <View style={STYLES.action}>
          {index !== currentIndex ? (
            <Button
              variant="secondary"
              label={i18n.t('home.carousel.back')}
              value={i18n.t('home.carousel.back_value')}
              onPress={() => setBrowsed(null)}
            />
          ) : stepsAccess === 'blocked' ? (
            // only the settings can allow it (docs/conventions.md): coming back reads the steps again
            <Button
              label={i18n.t('home.steps_access.settings_button')}
              value={i18n.t('home.steps_access.button_value')}
              accessibilityHint={i18n.t('home.steps_access.settings_hint')}
              onPress={() => {
                openStepsSettings().catch(() => {})
              }}
            />
          ) : stepsAccess !== 'granted' ? (
            // the system can still ask: one tap shows its dialog again
            <Button
              label={i18n.t('home.steps_access.allow_button')}
              value={i18n.t('home.steps_access.button_value')}
              onPress={() => {
                requestStepsAccess().then(onStepsAccessChange, onStepsAccessChange)
              }}
            />
          ) : revealing !== null ? (
            // outlined while the pixels appear: pressing it does nothing
            <Button variant="secondary" label={i18n.t('home.validate.validating')} value={revealing.reveal.pixels} />
          ) : unlock !== null ? (
            <Button label={i18n.t('home.unlock.button')} value={i18n.t('home.unlock.value')} onPress={() => onUnlock(unlock)} />
          ) : (
            // disabled under 100 steps: validating would give 0 pixel (OQ-11)
            <Button
              label={i18n.t('home.validate.button')}
              value={validateValue}
              disabled={reveal === null}
              onPress={onValidatePress}
            />
          )}
        </View>
      </View>

      <HomeFinishedModal image={finished} onNext={onModalNext} onClose={() => setFinished(null)} />
    </SafeAreaView>
  )
}

/** The image being revealed, as the animation draws it at `progress` (0 to 1): tag `VALIDATION`, an orange line. */
function revealedItem(item: HomeCarouselItemParams, reveal: HomeRevealParams, progress: number): HomeCarouselItemParams {
  if (item.number !== reveal.imageNumber) return item

  return {
    ...item,
    revealed: reveal.revealedFrom + Math.round((reveal.revealedTo - reveal.revealedFrom) * progress),
    tag: i18n.t('home.image.tag.validating'),
    revealing: true,
  }
}

const STYLES = StyleSheet.create({
  screen: { flex: 1 },
  centered: { textAlign: 'center' },
  // centered with a maximum width, so the layout does not stretch on a tablet
  top: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 20,
  },
  counter: {
    alignItems: 'center',
    gap: 24,
  },
  message: {
    minHeight: MESSAGE_MIN_HEIGHT,
    alignSelf: 'stretch',
  },
  messageContent: {
    alignItems: 'center',
    gap: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 28,
  },
  footer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  // the Figma validation zone: the time left, then the button (always the same room, so that
  // nothing moves when a button appears)
  bottom: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 9,
  },
  countdown: {
    height: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  action: { height: 56 },
})
