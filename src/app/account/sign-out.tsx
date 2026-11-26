import { useRouter } from 'expo-router'
import { useState } from 'react'

import { Message } from '~/components/views/Message'
import { SignOut } from '~/components/views/SignOut'

import { i18n } from '~/lib/i18n'
import { authRepository } from '~/repositories/auth.repository'
import { backupRepository } from '~/repositories/backup.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { ErrorBoundaryProps } from 'expo-router'

/**
 * Sign-out (#41): the validations not sent yet go to the account first; then the local progress
 * leaves the phone (it stays on the account), then the session. The reset time, the onboarding
 * and the time of the last validation are kept. The app starts again on image 01, as a guest.
 * Offline with something not sent yet, nothing changes: the screen asks to try again.
 */
export default function SignOutPage() {
  const router = useRouter()
  // an error while signing out goes to the ErrorBoundary below
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)

  if (failure) throw failure.error

  function onCancel() {
    if (router.canGoBack()) router.back()
    else router.replace('/settings')
  }

  async function onConfirm(): Promise<'offline' | null> {
    try {
      // "Tes images restent sauvegardées": nothing leaves the phone before it is on the account
      await backupRepository.sendPending()
    } catch {
      return 'offline'
    }
    // a send that could not reach the account (offline with an expired session) sends nothing
    // without failing: what is still waiting must not be deleted
    if (validationsRepository.getUnsynced().length > 0) return 'offline'

    try {
      // the later of the kept time and the phone's: steps already validated are never offered again
      const local = validationsRepository.getLastValidatedAt()
      const kept = await preferencesRepository.getLastValidatedAt()
      if (local !== null && (kept === null || local > kept)) await preferencesRepository.setLastValidatedAt(local)
      // the images unlocked by SUIVANT belong to the account: the guest starts again on image 01
      await preferencesRepository.forgetUnlockedImage()
      // a restore still due belongs to the account that leaves
      await preferencesRepository.setRestorePendingSince(null)
      // the progress leaves the phone last: if a write above fails, it stays here
      validationsRepository.clear()
      await authRepository.signOut()
    } catch (error) {
      // the phone may be empty while the account is still signed in: its progress comes back at
      // the next send (#36), as after a sign-in
      await preferencesRepository.setRestorePendingSince(new Date()).catch(() => {})
      setFailure({ error })
      return null
    }
    // the settings and this screen leave the history: the home screen opens as a guest
    if (router.canDismiss()) router.dismissAll()
    router.replace('/')
    return null
  }

  return <SignOut onConfirm={onConfirm} onCancel={onCancel} />
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Message
      title={i18n.t('common.error.title')}
      description={i18n.t('common.error.description')}
      button={{ label: i18n.t('common.error.button'), onPress: retry }}
    />
  )
}
