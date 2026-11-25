import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

import { secureSessionStorage } from '~/lib/secure-session-storage'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
// Public key only: the secret key never enters the app (ADR-003)
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY must be set in .env (see .env.example)')
}

/** The one Supabase client of the app (accounts, backup, community total). */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL to read a session from on iOS and Android
    detectSessionInUrl: false,
  },
})

// Refresh the session only while the app is in the foreground, as the Expo guide advises:
// the refresh loop would otherwise keep running in the background.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
