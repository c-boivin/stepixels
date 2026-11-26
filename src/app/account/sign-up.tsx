import { useLocalSearchParams, useRouter } from 'expo-router'
import { Keyboard } from 'react-native'

import { SignUp } from '~/components/views/SignUp'

import { CATALOGUE } from '~/data/images/catalogue'
import { i18n } from '~/lib/i18n'
import { canUnlockImage } from '~/lib/progress'
import { authRepository, toAccountError } from '~/repositories/auth.repository'
import { backupRepository } from '~/repositories/backup.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { SignUpError, SignUpForm, SignUpTexts } from '~/components/views/SignUp'

/**
 * Sign-up (#33): signed in at once, then back to the screen the user came from. With `unlock`
 * (#35), it is the "GARDE TON IMAGE" screen a guest's `SUIVANT` opens: the account keeps the
 * images, then the next one is unlocked.
 */
export default function SignUpPage() {
  const router = useRouter()
  const unlock = Number(useLocalSearchParams<{ unlock?: string }>().unlock) || null
  const texts: SignUpTexts | undefined =
    unlock === null
      ? undefined
      : {
          title: i18n.t('account.save_image.title'),
          subtitle: i18n.t('account.save_image.subtitle', { number: String(unlock).padStart(2, '0') }),
          button: i18n.t('account.save_image.button'),
        }

  function onBack() {
    Keyboard.dismiss()
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  async function onSubmit(form: SignUpForm): Promise<SignUpError | null> {
    try {
      await authRepository.signUp(form)
    } catch (error) {
      const { kind } = toAccountError(error)
      // a wrong password cannot happen on a sign-up: anything unexpected is "unknown"
      return kind === 'email_taken' || kind === 'offline' ? kind : 'unknown'
    }
    // the guest's progress goes to the new account; offline, it waits for the next send (ADR-004)
    backupRepository.sendPending().catch(() => {})
    // the image the guest finished is now kept: the next one opens (#35)
    if (unlock !== null && canUnlockImage(CATALOGUE, validationsRepository.getAll(), unlock)) {
      await preferencesRepository.unlockSavedImage(unlock).catch(() => {})
    }
    // outside the try: the account exists, a navigation problem is not a sign-up error
    onBack()
    return null
  }

  function onSignIn() {
    Keyboard.dismiss()
    router.replace(unlock === null ? '/account/sign-in' : { pathname: '/account/sign-in', params: { unlock: String(unlock) } })
  }

  return <SignUp texts={texts} onSubmit={onSubmit} onSignIn={onSignIn} onBack={onBack} />
}
