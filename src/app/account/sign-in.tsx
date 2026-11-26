import { useRouter } from 'expo-router'
import { Keyboard } from 'react-native'

import { SignIn } from '~/components/views/SignIn'

import { authRepository, toAccountError } from '~/repositories/auth.repository'
import { backupRepository } from '~/repositories/backup.repository'

import type { SignInError, SignInForm } from '~/components/views/SignIn'

/** Sign-in (#34): then the home screen (the progress is restored with #36). */
export default function SignInPage() {
  const router = useRouter()

  function onBack() {
    Keyboard.dismiss()
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  async function onSubmit(form: SignInForm): Promise<SignInError | null> {
    // from now on, the guest's rows wait for the account's progress before anything is sent (#36)
    await backupRepository.beforeSignIn()
    try {
      await authRepository.signIn(form)
    } catch (error) {
      await backupRepository.signInFailed()
      const { kind } = toAccountError(error)
      return kind === 'email_taken' ? 'unknown' : kind
    }
    // the account's progress and reset time come back before the home screen opens;
    // offline, the restore is tried again before the next send
    await backupRepository.restore().catch(() => {})
    // outside the try: the user is signed in, a navigation problem is not a sign-in error
    Keyboard.dismiss()
    // the account screens leave the history: "back" on the home screen does not return here
    if (router.canDismiss()) router.dismissAll()
    router.replace('/')
    return null
  }

  function onSignUp() {
    Keyboard.dismiss()
    router.replace('/account/sign-up')
  }

  return <SignIn onSubmit={onSubmit} onSignUp={onSignUp} onBack={onBack} />
}
