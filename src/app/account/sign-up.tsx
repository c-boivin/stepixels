import { useRouter } from 'expo-router'
import { Keyboard } from 'react-native'

import { SignUp } from '~/components/views/SignUp'

import { authRepository, toAccountError } from '~/repositories/auth.repository'
import { backupRepository } from '~/repositories/backup.repository'

import type { SignUpError, SignUpForm } from '~/components/views/SignUp'

/** Sign-up (#33): signed in at once, then back to the screen the user came from. */
export default function SignUpPage() {
  const router = useRouter()

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
    // outside the try: the account exists, a navigation problem is not a sign-up error
    onBack()
    return null
  }

  function onSignIn() {
    Keyboard.dismiss()
    router.replace('/account/sign-in')
  }

  return <SignUp onSubmit={onSubmit} onSignIn={onSignIn} onBack={onBack} />
}
