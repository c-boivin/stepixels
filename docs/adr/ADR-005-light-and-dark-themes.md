# ADR-005 · How do we support light and dark themes?

- **Status**: Proposed
- **Date**: 2026-11-24
- **Authors**: stepixels team

## Context

- We want the app to follow the phone's setting: a light theme and a dark theme. Many users keep their phone in dark mode, and the theme can change while the app is running.
- The teacher's example repository is **light only**: `app.json` sets `"userInterfaceStyle": "light"`, and each file computes its styles once, with fixed colors:

  ```tsx
  const STYLES = StyleSheet.create({
    title: { color: COLORS.text }, // one fixed value
  })
  ```

- With two themes, a color depends on the current theme, so a fixed value in `STYLES` is not enough.
- We want to stay as close as possible to the teacher's code (ADR-003, `docs/conventions.md`), and both team members must be able to explain the solution at the presentation.

## Decision

**Layout and colors are separated.** `STYLES` keeps the layout only, like in the teacher's code but without colors. A component reads the current palette with `useColors()` and adds the colors in its JSX.

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

Color props that are not styles (icon tint, placeholder) use the same `colors`: `<Icon color={colors.accent} />`.
`app.json` keeps `"userInterfaceStyle": "automatic"`.

Rejected:

- **Light only, like the teacher**: simplest, but the app ignores the phone's setting.
- **Styles built per theme** (`const useStyles = createThemedStyles((colors) => ({…}))`, which builds each `StyleSheet` once per theme and returns a hook that picks the current one): all colors stay in the styles and nothing is created at render time, but it is a function that builds a hook, which is more abstract to explain, needs two tools (`useStyles()` and `useColors()`), and moves further away from the teacher's `STYLES`.
- **The template's theming** (`ThemedText`, `ThemedView`, `useTheme`): every text and view must use a wrapper component, which is different from the course and the example repository.

## Consequences

- \+ `STYLES` stays the teacher's pattern: the code looks like the example repository, with one more line per component.
- \+ One tool to learn: `useColors()`, a hook that returns a palette.
- \+ TypeScript forces `DARK` to have the same keys as `LIGHT`: no color can be missing in dark mode.
- \- Colors are written in the JSX, so reading a style means looking at two places (layout at the bottom, colors in the JSX).
- \- A forgotten color is not detected: a text without `color` stays black on a dark background. **Every screen must be checked in both themes on the phone**, and reviewers must look for missing colors.
- \- A small `{ color }` object is created at each render: negligible for this app, and limited by the React Compiler enabled in `app.json`.
- \- We need a second palette: the teacher only provides a light one.
