# Technical specs

How we build the app: technical choices that are not major enough for an ADR (see [`docs/adr/README.md`](adr/README.md)).
Each section gives the rule, why we chose it, what we rejected and its limits. The detailed code rules are in [`docs/conventions.md`](conventions.md).

A spec can change when the team agrees: update the section in a pull request and explain why in its description.

## Commit messages: Conventional Commits, checked by commitlint

**Rule.** Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): description`. **commitlint** (`@commitlint/config-conventional`) checks each message before the commit, through a **husky** `commit-msg` hook, and rejects a badly formatted one.

**Why.** The course requires this format, and code review is graded individually: a readable history helps the reviewer. With two people and 5 days, it is easy to forget the format when moving fast.

**Rejected.**

- Relying on everyone's discipline: nothing prevents mistakes, we only see them in review.
- Checking only on GitHub (CI): the mistake is found after the push, and the history must be rewritten.

**Limits.**

- The hook is installed by `pnpm install` (`prepare` script): each member runs it after cloning.
- The check only runs locally: `git commit --no-verify` bypasses it.
- Pull request titles, reused as merge commit messages, are not checked: review them yourself.

## Texts: French screens through i18n

**Rule.** Every text shown or read to the user goes through **i18n-js**, with the phone's language read by **expo-localization**, like in the teacher's example repository:

- `src/lib/i18n.ts` creates one `i18n` instance, French by default and as fallback.
- `src/data/messages/fr.json` holds every text, grouped by screen or feature.
- Components call `i18n.t('catalogue.error.title')`, with variables (`%{title}`) and plurals (`zero` / `one` / `other`).

Code and documentation stay in English; only the screens are in French.

**Why.** The course requires a message for every state (loading, error, empty list, no results) and correct plurals, and accessibility labels are texts too. One file keeps all texts in one place, separate from the English code.

**Rejected.**

- Hard-coded French strings: French text mixed with English code, plurals rewritten in each component, texts spread across many files.
- react-i18next: more features, but heavier to set up and different from the teacher's reference.
- English screens: our users and the jury are French-speaking.

**Limits.**

- Two more dependencies (`i18n-js`, `expo-localization`), to install with `pnpm exec expo install`.
- `i18n.t()` accepts any string: TypeScript does not detect a misspelled or missing key. Check the texts on the phone.
- Every new text needs a key in `fr.json`.

## Themes: light and dark

**Rule.** The app follows the phone's setting (`"userInterfaceStyle": "automatic"` in `app.json`). **Layout and colors are separated**: `STYLES` holds the layout only, like the teacher's code but without colors, and a component reads the current palette with `useColors()` and adds the colors in its JSX.

`src/styles/theme.ts`:

```ts
import { useColorScheme } from 'react-native'

const LIGHT = { background: '#f5f5f7', surface: '#ffffff', text: '#1d1d1f' /* … */ }
const DARK: Colors = { background: '#000000', surface: '#1c1c1e', text: '#f5f5f7' /* … */ }

export type Colors = typeof LIGHT

export const COLORS = Object.freeze({ light: LIGHT, dark: DARK })

/** Read the palette of the phone's current theme. */
export function useColors(): Colors {
  return useColorScheme() === 'dark' ? COLORS.dark : COLORS.light
}
```

In a component:

```tsx
export function EventCard({ title, venue }: EventCardProps) {
  const colors = useColors()

  return (
    <View style={[STYLES.card, { backgroundColor: colors.surface }]}>
      <Text style={[STYLES.title, { color: colors.text }]}>{title}</Text>
      <Text style={[STYLES.venue, { color: colors.muted }]}>{venue}</Text>
    </View>
  )
}

const STYLES = StyleSheet.create({
  card: { padding: 20, borderRadius: 20 },
  title: { fontSize: 20, fontWeight: '600' },
  venue: { fontSize: 14 },
})
```

Color props that are not styles use the same `colors`: `<Icon color={colors.accent} />`.

**Why.** Many users keep their phone in dark mode, and the theme can change while the app runs. The teacher's example repository is light only, with fixed colors in `STYLES`: separating the colors keeps his `STYLES` pattern with only one more tool to learn.

**Rejected.**

- Light only, like the teacher: simplest, but the app ignores the phone's setting.
- Styles built per theme (`const useStyles = createThemedStyles((colors) => ({…}))`, one `StyleSheet` per theme and a hook that picks the current one): all colors stay in the styles, but it is a function that builds a hook, more abstract to explain, with two tools (`useStyles()` and `useColors()`), and further from the teacher's code.
- The template's theming (`ThemedText`, `ThemedView`, `useTheme`): a wrapper component for every text and view, different from the course.

**Limits.**

- Colors are written in the JSX: reading a style means looking at two places.
- A forgotten color is not detected: a text without `color` stays black on a dark background. Check every screen in both themes on the phone, and look for missing colors in reviews.
- TypeScript forces `DARK` to have the same keys as `LIGHT`, but we must still choose a second palette: the teacher only provides a light one.
