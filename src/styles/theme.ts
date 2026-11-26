import { useColorScheme } from 'react-native'

// Colors from the Figma variables (fond, blanc, encre, gris, points, accent, accent-texte, accent-fonce, pastille)
// Small text uses gris and accent-texte: both reach the 4.5:1 contrast of WCAG AA on the background
const LIGHT = {
  /** Background of every screen. */
  background: '#FBF7EE',
  /** Cards, modal. */
  surface: '#FFFFFF',
  /** Main text, numbers, outlines. */
  text: '#3B2418',
  /** Labels, subtitles, inactive icons (used at 60% opacity). */
  muted: '#7A6556',
  /** Dividers. */
  border: '#E8DFD0',
  /** Unrevealed cells, disabled button. */
  control: '#E8DFD0',
  /** Primary button, big orange elements (numbers, active icons). Too light for small text: use `accentText`. */
  accent: '#FF5A00',
  /** Small orange text: overlines, links, settings values. */
  accentText: '#B83E00',
  /** Error messages, prefixed with "!" (small text, so the same color as `accentText`). */
  error: '#B83E00',
  /** Shadow of the orange icons. */
  accentDark: '#D94800',
  /** Background of the highlighted number. */
  pill: '#FFE3CF',
}

export type Colors = typeof LIGHT

// Dark theme = V2 (docs/specs.md): the app is forced to light in app.json, so this copy is never used yet
const DARK: Colors = { ...LIGHT }

export const COLORS = Object.freeze({ light: LIGHT, dark: DARK })

/** Read the palette of the phone's current theme. */
export function useColors(): Colors {
  return useColorScheme() === 'dark' ? COLORS.dark : COLORS.light
}

/**
 * Text styles from the Figma text styles (shape only: add the color in the JSX with `useColors()`).
 * Silkscreen texts are written in upper case in `fr.json`, not with `textTransform`.
 * The fonts must be loaded with `useFonts` under these names (`Silkscreen`, `DMMono`).
 */
export const TYPO = Object.freeze({
  /** Pixel/Chiffre 80: daily step counter. */
  number80: { fontFamily: 'Silkscreen', fontSize: 80, lineHeight: 80 },
  /** Pixel/Heure 64: chosen reveal time. Line height = font size, as in Figma: without it iOS adds space and the time is not centered. */
  hour64: { fontFamily: 'Silkscreen', fontSize: 64, lineHeight: 64 },
  /** Pixel/Titre écran 40: screen titles. */
  screenTitle40: { fontFamily: 'Silkscreen', fontSize: 40, lineHeight: 44 },
  /** Pixel/Logo 32: logo on the loading screen. */
  logo32: { fontFamily: 'Silkscreen', fontSize: 32 },
  /** Pixel/Titre modale 28: modal titles. */
  modalTitle28: { fontFamily: 'Silkscreen', fontSize: 28 },
  /** Pixel/Titre 26: onboarding and account titles. */
  title26: { fontFamily: 'Silkscreen', fontSize: 26 },
  /** Pixel/Roue 22: neighbor hours in the time wheel. */
  wheel22: { fontFamily: 'Silkscreen', fontSize: 22 },
  /** Pixel/Bouton 14: buttons. */
  button14: { fontFamily: 'Silkscreen', fontSize: 14 },
  /** Pixel/Sur-titre 12: overlines. */
  overline12: { fontFamily: 'Silkscreen', fontSize: 12 },
  /** Pixel/Libellé 11: card tags, field labels. */
  label11: { fontFamily: 'Silkscreen', fontSize: 11 },
  /** Texte/Fait 17: sentence above the card, field values. */
  fact17: { fontFamily: 'DMMono', fontSize: 17 },
  /** Texte/Courant 15: subtitles, settings rows. */
  body15: { fontFamily: 'DMMono', fontSize: 15 },
  /** Texte/Petit 13: consent, links, legal texts. */
  small13: { fontFamily: 'DMMono', fontSize: 13 },
})
