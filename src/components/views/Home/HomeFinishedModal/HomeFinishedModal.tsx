import { Modal, StyleSheet, Text, View } from 'react-native'

import { Button } from '~/components/ui/Button'
import { PixelGrid } from '~/components/ui/PixelGrid'

import { i18n } from '~/lib/i18n'

import type { PixelGridParams } from '~/components/ui/PixelGrid'

import { TYPO, useColors } from '~/styles/theme'

/** Side of the image in the modal (Figma "Image terminée"). */
const IMAGE_SIZE = 145

/** The finished image: drawn whole, every cell revealed (OQ-3). */
export interface HomeFinishedModalParams extends PixelGridParams {
  /** `LE CHAMPIGNON` */
  name: string
  /** `25 600 pas · 4 jours · 19 km` */
  summary: string
  /** Number of the image `SUIVANT` unlocks; `null` for the last image of the catalogue. */
  next: number | null
}

export interface HomeFinishedModalProps {
  /** The image to celebrate; `null` hides the modal. */
  image: HomeFinishedModalParams | null
  /** `SUIVANT`: unlocks the next image (#31). */
  onNext: () => void
  /** Back button of Android, escape gesture of the screen reader: the home screen keeps a `SUIVANT` button. */
  onClose: () => void
}

/**
 * Shown once, when the last pixel of an image is revealed (#31): the image, its name, the steps,
 * the days and the distance it took, and `SUIVANT` to unlock the next image.
 */
export function HomeFinishedModal({ image, onNext, onClose }: HomeFinishedModalProps) {
  const colors = useColors()

  return (
    <Modal
      visible={image !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={[STYLES.overlay, { backgroundColor: colors.text }]}>
        {image !== null && (
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={[STYLES.card, { backgroundColor: colors.background }]}>
            <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <PixelGrid {...image} size={IMAGE_SIZE} />
            </View>
            <View style={STYLES.texts}>
              <Text style={[TYPO.overline12, { color: colors.accentText }]}>{i18n.t('home.finished_modal.title')}</Text>
              <Text accessibilityRole="header" style={[TYPO.modalTitle28, STYLES.centered, { color: colors.text }]}>
                {image.name}
              </Text>
              <Text style={[TYPO.body15, STYLES.centered, { color: colors.muted }]}>{image.summary}</Text>
            </View>
            <Button
              label={i18n.t('home.finished_modal.button')}
              value={i18n.t('home.finished_modal.button_value')}
              onPress={onNext}
            />
          </View>
        )}
      </View>
    </Modal>
  )
}

const STYLES = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 29,
  },
  // centered with a maximum width, so the card does not stretch on a tablet
  card: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 32,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  texts: {
    alignItems: 'center',
    gap: 12,
  },
  centered: { textAlign: 'center' },
})
