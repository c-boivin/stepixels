import { getLocales } from 'expo-localization'
import { I18n } from 'i18n-js'

import fr from '~/data/messages/fr.json'

// the screens are in French only (docs/specs.md): other languages fall back to French
export const i18n = new I18n(
  { fr },
  {
    locale: getLocales().at(0)?.languageCode ?? 'fr',
    defaultLocale: 'fr',
    enableFallback: true,
  },
)
