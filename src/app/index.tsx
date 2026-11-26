import { useEffect, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'

import { getStepsAccess, getStepsSince, requestStepsAccess } from '~/lib/steps'

import type { StepsAccess } from '~/lib/steps'

import { TYPO, useColors } from '~/styles/theme'

// TEMPORARY (#15): shows today's steps so the step source can be checked on both phones
// against the phone's health app. The home screen (#27) replaces this whole file.
export default function HomePage() {
  const colors = useColors()
  const [steps, setSteps] = useState<number | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function readSteps(access: Promise<StepsAccess>) {
      if ((await access) !== 'granted') return
      const count = await getStepsSince(startOfToday())
      if (!isCancelled) setSteps(count)
    }

    // ask once at launch, then only read again when the app comes back to the foreground (R12)
    readSteps(requestStepsAccess()).catch(console.warn)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') readSteps(getStepsAccess()).catch(console.warn)
    })

    return () => {
      isCancelled = true
      subscription.remove()
    }
  }, [])

  return (
    <View style={[STYLES.screen, { backgroundColor: colors.background }]}>
      {steps !== null && <Text style={[TYPO.number80, { color: colors.text }]}>{steps}</Text>}
    </View>
  )
}

function startOfToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const STYLES = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
