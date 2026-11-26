import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

import { secureSessionStorage } from '~/lib/secure-session-storage'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
// Public key only: the secret key never enters the app (ADR-003)
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY must be set in .env (see .env.example)')
}

/**
 * Key of the session in SecureStore: Supabase's default one (`sb-<project>-auth-token`), written
 * here so that the sign-out can remove the session itself (#41). Same key, so no one is signed out.
 */
const SESSION_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`

/** The one Supabase client of the app (accounts, backup, community total). */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: secureSessionStorage,
    storageKey: SESSION_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    // No URL to read a session from on iOS and Android
    detectSessionInUrl: false,
  },
})

/** Removes the session kept on the phone, without Supabase: for a sign-out that takes too long (#41). */
export function removeStoredSession(): Promise<void> {
  return secureSessionStorage.removeItem(SESSION_STORAGE_KEY)
}

// Refresh the session only while the app is in the foreground, as the Expo guide advises:
// the refresh loop would otherwise keep running in the background.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
