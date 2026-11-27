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

## Themes: light and dark, following the phone

**Rule.** **The app follows the phone's light or dark setting**: `"userInterfaceStyle": "automatic"` in `app.json` (on Android it needs `expo-system-ui`), so the keyboard, the alerts and the status bar follow it too. The splash screen gets its dark background with the `dark` key of the `expo-splash-screen` plugin (a new build is needed). **Layout and colors are separated**: `STYLES` holds the layout only, like the teacher's code but without colors, and a component reads the current palette with `useColors()` and adds the colors in its JSX.

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

**Contrast.** Every text smaller than 24 px reaches at least 4.5:1 on its background (WCAG AA). So small orange text uses `accentText`, never `accent` (2.93:1, for big elements only: 24 px text and more, primary button background, active icons), and grey text uses `muted`. Button labels on `accent` use `onAccent`, dark in both themes (4.63:1 in light, 6.34:1 in dark): cream on orange is 2.48:1.

The dark palette is not in Figma: the team validated it from the light one, the same browns and orange inverted (dark brown background, cream text, lighter orange for small text). Each pair used by the code was checked against the contrast rule above.

**Why.** Many users keep their phone in dark mode, and a cream screen at night is glaring. The code was written for it from the start: once `useColors()` was in every component, the dark theme only cost a palette and one setting. The teacher's example repository is light only, with fixed colors in `STYLES`: separating the colors keeps his `STYLES` pattern with only one more tool to learn.

**Rejected.**

- Light only (`"light"`), the first V1 choice: simpler to check, but glaring at night for users in dark mode.
- A theme switch in the settings: one more screen row and a stored preference, for a need the phone's setting already covers.
- A darker orange in dark mode to keep cream button labels: the button would lose its bright orange.
- Light only with colors in `STYLES`, like the teacher: simplest, but every component would have to change for the dark theme.
- Styles built per theme (`const useStyles = createThemedStyles((colors) => ({…}))`, one `StyleSheet` per theme and a hook that picks the current one): all colors stay in the styles, but it is a function that builds a hook, more abstract to explain, with two tools (`useStyles()` and `useColors()`), and further from the teacher's code.
- The template's theming (`ThemedText`, `ThemedView`, `useTheme`): a wrapper component for every text and view, different from the course.

**Limits.**

- Colors are written in the JSX: reading a style means looking at two places.
- A forgotten color is not detected: a text without `color` stays black on the dark background. Look for missing colors in reviews, and check each screen in both themes on the phone.
- The dark palette has no Figma frame: a screen designed later must be checked in dark mode by hand.
- Pixel art colors come from each image's palette, not from the theme: some images may look dull on a dark card.

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

## Local storage: the phone's `validations` table has no `user_id`

**Rule.** The local `validations` table (`src/db/schema.ts`) has the same columns as the Supabase table, **except `user_id`**, plus a `synced` flag (ADR-004). The account's id is added when a row is sent to Supabase.

**Why.** One phone = one user: a guest has no id yet, and on sign-out the local validations are cleared (OQ-19). The column would always hold the same value, or nothing.

**Rejected.**

- An optional `user_id`, empty for a guest: closer to "same columns" in ADR-004, but every row would have to be updated at sign-up and sign-in, for no use while one account uses the phone.

**Limits.**

- A column change on one side still needs the same change on the other side (see "Database schema" above), `user_id` and `synced` apart.

## Tests: Jest and React Native Testing Library, no end-to-end tests

**Rule.** Two levels of tests:

- **Unit tests** with **Jest** (`jest-expo` preset, the one recommended by Expo): pure functions of `src/lib/` and repositories.
- **Component and screen tests** with **React Native Testing Library**, and `expo-router/testing-library` for routes.

Native modules do not run in Jest, which runs on the computer (Node): `test/setup.ts` replaces them for every test. The local database is a real in-memory SQLite database (`better-sqlite3`) with the same Drizzle migrations as the app; AsyncStorage uses its official Jest mock.

**Why.** The course grades "targeted tests" (Code: 3 points), and the jury will ask what we test. Jest and React Native Testing Library are what the Expo SDK 58 docs recommend. Testing the repositories on a real SQLite database proves that a validation is really saved and read back, not only that a function was called.

**Rejected.**

- A fake database (mock) in the repository tests: no extra dependency, but the test only checks calls, not the SQL or the migrations.
- Node's built-in SQLite instead of `better-sqlite3`: no extra dependency, but Drizzle 0.45 has no driver for it.

**Limits.**

- `better-sqlite3` and `esbuild` (used by `drizzle-kit`) run a script when installed: they are allowed in `pnpm-workspace.yaml` (`allowBuilds`). Any other package asking to run one is refused until the team agrees.
- `better-sqlite3` is SQLite on the computer, not `expo-sqlite`: a difference between the two is only seen on the phone.
- No coverage target yet: 80 % on `src/lib/` is set with the business rules tests (OQ-23).
- **No end-to-end tests.** The course presents a third level (slides 83 and 86): journeys run on the installed app, such as the onboarding then a restart, to check the navigation and the persistence. We know this level is missing. With more time, we would have set it up; within the five days of the project, we chose to spend the time on the unit and screen tests.

## Step access: a phone with no step source is not supported

**Rule.** The onboarding 4/4 (pedometer) reads the step access with `getStepsAccess()` (`src/lib/steps.ts`, ADR-005). When the phone has **no step source** (no motion sensor on iOS, Health Connect missing or out of date on Android), the access is `blocked`: the screen shows the button that opens the settings, as after a refusal. There is no special screen for this case in V1.

**Why.** It should not happen on the phones we target: every recent iPhone has the motion sensor, and Health Connect is built into Android 14 and later, the minimum version we support (ADR-005). It never happens on our demo phones (iPhone and Samsung S22). A special screen would be extra texts, design and tests for a case the jury will not see.

**Rejected.**

- A "Your phone cannot count your steps" screen: clearer for the user, but not needed for the P0. To add if the app is used on more phones.

**Limits.**

- On a phone with no step source, the user stays on the onboarding 4/4: the settings button does not help, and the app cannot be used.
