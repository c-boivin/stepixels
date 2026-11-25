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

## Themes: light in V1, dark in V2

**Rule.** **V1 is light only**: `"userInterfaceStyle": "light"` in `app.json`, so the keyboard, the alerts and the status bar stay light whatever the phone's setting. The dark theme is planned for V2 (the design has no dark palette yet). The code is already ready for it: **layout and colors are separated**: `STYLES` holds the layout only, like the teacher's code but without colors, and a component reads the current palette with `useColors()` and adds the colors in its JSX.

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

**Contrast.** Every text smaller than 24 px reaches at least 4.5:1 on its background (WCAG AA). So small orange text uses `accentText`, never `accent` (2.93:1, for big elements only: 24 px text and more, primary button background, active icons), and grey text uses `muted`. Button labels on `accent` use `text` (4.63:1).

In V1, `DARK` is a copy of `LIGHT` and is never used. For V2: draw the dark palette, fill `DARK`, and set `"userInterfaceStyle": "automatic"`. No component has to change.

**Why.** The design is cream only, and drawing and checking a second palette does not fit in the 5 days. Many users keep their phone in dark mode, so we keep the dark theme for V2 and write the code for it now: it costs only `useColors()`. The teacher's example repository is light only, with fixed colors in `STYLES`: separating the colors keeps his `STYLES` pattern with only one more tool to learn.

**Rejected.**

- Following the phone's setting in V1 (`"automatic"`) without a dark palette: the keyboard, alerts and status bar would turn dark on a cream screen, and the status bar text would be unreadable.
- Light only with colors in `STYLES`, like the teacher: simplest now, but every component would have to change in V2.
- Styles built per theme (`const useStyles = createThemedStyles((colors) => ({…}))`, one `StyleSheet` per theme and a hook that picks the current one): all colors stay in the styles, but it is a function that builds a hook, more abstract to explain, with two tools (`useStyles()` and `useColors()`), and further from the teacher's code.
- The template's theming (`ThemedText`, `ThemedView`, `useTheme`): a wrapper component for every text and view, different from the course.

**Limits.**

- Colors are written in the JSX: reading a style means looking at two places.
- A forgotten color is not detected: a text without `color` will stay black on a dark background in V2. Look for missing colors in reviews.
- TypeScript forces `DARK` to have the same keys as `LIGHT`, but the dark palette must still be designed (V2).

## Database schema: SQL migrations in `supabase/migrations/`

**Rule.** The Supabase schema (ADR-003) is written in SQL and committed in `supabase/migrations/`, in the Supabase CLI format: one file per change, named `<UTC timestamp>_<name>.sql` (for example `20261125090827_initial_schema.sql`).

- A migration that is merged is **never edited**: a change to the schema is a new migration.
- Each migration holds the tables with their Row Level Security policies, and the functions they need. Every table has Row Level Security on, and references the user with `on delete cascade` (ADR-003).
- Every table also gets its **`grant`s**, matching its policies and nothing more (for example `grant select, insert on public.validations to authenticated`). Postgres checks the role's privileges on the table first, then Row Level Security: Supabase no longer grants table privileges to `anon` and `authenticated` by default, so a table without `grant` refuses every request, whatever its policies say.
- A comment explains each `security definer` function: why it needs admin rights, and what it is allowed to touch.

**Why.** ADR-003 asks for the schema's SQL in the repository, so both members can recreate the database and review every change. One file per change keeps a history of the schema in the pull requests, and the CLI format lets us apply the files with the Supabase CLI later without renaming them.

**Rejected.**

- One `supabase/schema.sql` file: simpler to paste into the SQL editor, but no history: a review cannot tell which change is new and which is already applied.
- Editing the schema in the Supabase dashboard only: nothing in the repository, nothing to review, and the schema cannot be recreated.

**Limits.**

- The Supabase CLI is not set up in the project (no `supabase/config.toml`): for now, each new migration is pasted into the SQL editor of the Supabase project, in order, by the member who merges it.
- Nothing checks that the Supabase project matches the files: a migration applied twice or forgotten is only noticed when the app fails.
- The local `validations` table (Drizzle, ADR-004) has the same columns: a column change needs a migration on both sides, checked in review.
