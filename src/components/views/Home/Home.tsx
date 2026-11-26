import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '~/components/ui/Button'
import { TopBar } from '~/components/ui/TopBar'
import { HomeCarousel } from './HomeCarousel'

import { useCountdown } from '~/hooks/useCountdown'

import { i18n } from '~/lib/i18n'
import { openStepsSettings, requestStepsAccess, type StepsAccess } from '~/lib/steps'

import type { HomeCarouselItemParams } from './HomeCarousel'

import { TYPO, useColors } from '~/styles/theme'

/**
 * Minimum height of the message block: it keeps its place when empty, so the counter never moves
 * (#27). A long message (big number, bigger system font) makes it grow instead of covering the carousel.
 */
const MESSAGE_MIN_HEIGHT = 68

/** The day shown on the home screen (#27, #30). */
export interface HomeDayParams {
  /** Access to the phone's steps: when it is not `granted`, the screen asks to allow it again. */
  stepsAccess: StepsAccess
  /** Steps to validate, digits only (`4230`); `null` when they cannot be read (`stepsAccess`). */
  counter: string | null
  /** Steps lost at the last reset, formatted (`1 230`); `null` when there is no "DOMMAGE" to show. */
  lostSteps: string | null
  /** End of the current day, where the countdown reaches 0. */
  nextReset: Date
}

export interface HomeProps extends HomeDayParams {
  /** The images of the carousel: finished ones, the one being revealed, then the locked one. */
  images: HomeCarouselItemParams[]
  /** Called when the countdown reaches 0: a new day starts, the data must be read again (#30). */
  onDayEnd: () => void
  /** Called after the user answered the steps access dialog: the steps must be read again. */
  onStepsAccessChange: () => void
  /** Called on the gear of the top bar: opens the settings (#37). No gear until the settings screen exists. */
  onSettingsPress?: () => void
}

/**
 * The home screen: the steps to validate and the message of the day (#27), the image carousel (#28)
 * and the time left before the reset (#27, #30). The VALIDER button (#29) comes under the countdown.
 */
export function Home({
  images,
  stepsAccess,
  counter,
  lostSteps,
  nextReset,
  onDayEnd,
  onStepsAccessChange,
  onSettingsPress,
}: HomeProps) {
  const colors = useColors()
  const countdown = useCountdown(nextReset, onDayEnd)
  // the image being revealed, or the last one once every image is finished
  const revealing = images.findIndex(({ state }) => state === 'current' || state === 'new')
  const currentIndex = revealing >= 0 ? revealing : images.length - 1
  // the card the user swiped to, or `null` when on the image being revealed: if a validation
  // moves the image being revealed, the carousel follows it
  const [browsed, setBrowsed] = useState<number | null>(null)
  const index = browsed ?? currentIndex
  const inFront = images[index]

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
          <Text style={[TYPO.number80, { color: colors.text }]}>{counter ?? i18n.t('home.counter.unavailable')}</Text>
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
          {lostSteps !== null && (
            <View accessible style={STYLES.messageContent}>
              <Text style={[TYPO.overline12, { color: colors.accentText }]}>{i18n.t('home.lost.title')}</Text>
              <Text style={[TYPO.fact17, STYLES.centered, { color: colors.text }]}>
                {i18n.t('home.lost.description', { steps: lostSteps })}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={STYLES.content}>
        <HomeCarousel
          items={images}
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
          ) : (
            stepsAccess !== 'granted' && (
              // the system can still ask: one tap shows its dialog again
              <Button
                label={i18n.t('home.steps_access.allow_button')}
                value={i18n.t('home.steps_access.button_value')}
                onPress={() => {
                  requestStepsAccess().then(onStepsAccessChange, onStepsAccessChange)
                }}
              />
            )
          )}
        </View>
      </View>
    </SafeAreaView>
  )
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
