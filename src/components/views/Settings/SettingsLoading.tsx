import { StyleSheet, View } from 'react-native'

import { Skeleton } from '~/components/ui/Skeleton'

import { i18n } from '~/lib/i18n'

import { SettingsScreen } from './Settings'

import { useColors } from '~/styles/theme'

// the guest list has 6 rows: the most common case while the settings load
const ROWS = 6

export interface SettingsLoadingProps {
  onBack: () => void
}

/** The settings while they load: the title, and gray bars in place of the values. */
export function SettingsLoading({ onBack }: SettingsLoadingProps) {
  const colors = useColors()

  return (
    <SettingsScreen onBack={onBack}>
      <View accessible accessibilityLabel={i18n.t('settings.loading')} accessibilityState={{ busy: true }}>
        {Array.from({ length: ROWS }, (_, index) => (
          <View key={index} style={[STYLES.row, { borderTopColor: colors.border }]}>
            <Skeleton style={STYLES.label} />
            <Skeleton style={STYLES.value} />
          </View>
        ))}
      </View>
    </SettingsScreen>
  )
}

const STYLES = StyleSheet.create({
  row: { height: 60, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { width: 160, height: 16 },
  value: { width: 56, height: 16 },
})
