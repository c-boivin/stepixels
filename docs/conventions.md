# Code conventions

Rules every team member follows, so the code looks like it was written by one person.
They follow the teacher's example repository ([`bastienrobert/ticketing`](https://github.com/bastienrobert/ticketing), `apps/mobile`), within the frame of course slide 62 (see ADR-002).
**Read this before writing or reviewing code.** A pull request that breaks a rule gets a review comment pointing to the rule.

## Folders

See `docs/adr/ADR-002-app-architecture.md` for the frame and the dependency rules. This table is the up-to-date list: it follows the teacher's example repository as it evolves. Where does new code go?

Create a folder or file only when a feature needs it (see `CLAUDE.md`).

| The code is… | Folder |
|---|---|
| a screen (route) | `src/app/` |
| the content of a screen, possibly used by several routes | `src/components/views/<View>/` |
| a reusable block that depends only on its props | `src/components/ui/<Name>/` |
| state shared between screens | `src/contexts/<Name>Context.tsx` |
| reusable React logic | `src/hooks/use<Name>.ts` |
| loading and adapting a page's data | `src/data/get-<page>-page.ts` + `src/data/adapters/` |
| access to one resource, wherever it is stored (API, local database or both) | `src/repositories/<resource>.repository.ts` |
| local database: Drizzle schema and generated migrations | `src/db/schema.ts` + `src/db/migrations/` |
| pure TypeScript and clients (API client, database client, i18n, business rules) | `src/lib/` (`api.ts`, `db.ts`, `i18n.ts`…) |
| colors (light and dark palettes, `useColors()`) | `src/styles/theme.ts` |

## One component = one folder

```
EventCard/
├── EventCard.tsx          → the component
├── EventCardLoading.tsx   → its skeleton, if it has one
└── index.ts               → export { EventCard } from './EventCard'
                             export type { EventCardParams, EventCardProps } from './EventCard'
```

- Import the folder (`~/components/ui/EventCard`), never the internal file.
- PascalCase names. **Named exports** only. Route files are the exception: they use `export default` (required by Expo Router).
- A view's sub-components live in sub-folders and are prefixed with the view name: `views/Catalogue/CatalogueFilters/`, `views/Catalogue/CatalogueHeader/`.
- A private sub-component can live in the same folder without being exported by `index.ts` (`CatalogueFilters/CatalogueFiltersCategory.tsx`).
- A route file can hold its own private components and styles when they are only used there (`events/[id].tsx`).

## Types: `Params` vs `Props`

- `XParams` = **the data** returned by the adapter (`EventCardParams`).
- `XProps` = **what the parent passes**. When a component displays one item, its props extend the params, and the parent spreads the item: `interface EventCardProps extends EventCardParams { favorite: boolean; onPress: () => void }` → `<EventCard {...item} favorite={…} onPress={…} />`.
- The data type of a page is declared and exported in its route: `export interface CataloguePageData` in `app/(tabs)/index.tsx`.
- The raw API type (`XRaw`) lives in the adapter, declares only the fields we use, and marks the nullable ones (`venue: string | null`).
- Declared with `export interface`, right above the component. JSDoc (`/** … */`) on non-obvious fields and on exported functions.

## Routes

- A route reads its parameters, starts its request and renders a view:

```tsx
export default function CataloguePage() {
  const [refreshing, page, refresh] = useRequest(getCataloguePage)

  return (
    <Suspense fallback={<CatalogueLoading mode="all" />}>
      <Catalogue mode="all" page={page} refreshing={refreshing} onRefresh={refresh} />
    </Suspense>
  )
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Message
      title={i18n.t('catalogue.error.title')}
      description={i18n.t('catalogue.error.description')}
      button={{ label: i18n.t('catalogue.error.button'), onPress: retry }}
    />
  )
}
```

- Typed parameters: `useLocalSearchParams<'/events/[id]'>()` (typed routes are enabled in `app.json`).
- Navigation: `router.push({ pathname: '/events/[id]', params: { id } })` to open, `router.dismiss()` to close a sheet, `router.navigate('/')` to go to a tab.
- Root layout: a `Stack` that holds the `(tabs)` group and the detail screens (a detail can open as a sheet: `presentation: 'formSheet'`). App-wide providers wrap the `Stack`.
- Unknown deep links land on `+not-found.tsx`, which offers a way back.

## State

- **Route**: parameters and the data request. **View**: interaction state (search, filters). **Context**: state shared by several screens. See ADR-002.
- `ui` components hold no business state: they receive props and call `onX` callbacks.
- **Derived values are computed during render**, never stored in another state (the filtered list is computed from the query, the category and the events).
- Update from the previous value with the function form: `setX((previous) => …)`.
- **Immutability**: `filter`, `map`, `[...a, x]`, `{ ...o, k }`, `toSorted`. Never `push` or mutate a state.
- A context file exports its provider and a `use<Name>Context()` hook, which throws if it is used outside the provider. One context holds both the state and its actions (`{ favoriteIds, toggleFavorite }`), driven by a `useReducer`.

## Data

```
route ──► data/get-<page>-page.ts ──► repositories/<resource>.repository.ts ──► lib/api.ts (API)
               │ (adapter)               ▲                                 └──► lib/db.ts (local database)
               ▼                         │
          page data              contexts (shared state, e.g. favorites)
```

- `lib/api.ts` exports one `fetchApi(path, init?)`: it calls `${API_URL}${path}` with the `RequestInit` (`signal`, `method`…), throws an **`ApiError`** (with its HTTP `status`) on a non-`ok` response, returns `null` for a `204`, and otherwise the payload as `unknown`.
- `API_URL` comes from `EXPO_PUBLIC_API_URL` (`src/const.ts`). `.env.example` is committed; `.env` is not. Everything in `EXPO_PUBLIC_` is readable in the app: never put a secret there.
- A **repository** (`<resource>Repository`, an object of functions) is the only code that knows where a resource is stored: it calls `fetchApi` and/or the local database. Getters and contexts call repositories, never `fetchApi` or the database directly.
- A getter `get-<page>-page.ts` calls a repository, **checks the payload** (`Array.isArray`, item found…) and returns the page data, or `null` when the payload is unusable or the item does not exist. A getter that reads the network takes an `AbortSignal`.
- **The adapter prepares everything for display**: date and price formatting (`Intl.DateTimeFormat` / `Intl.NumberFormat`, `'fr-FR'`, `timeZone: 'Europe/Paris'`, formatters created once as constants), defaults for `null` fields, labels. Views and components do no formatting.
- Never call `fetch` outside `lib/api.ts`, and never load data outside a route (or a context, for shared state).

## Local storage

The storage choice is still open: it will be an ADR. These rules apply to whichever storage we choose (course slides 64–69).

- One storage per kind of data: React state for the interface, AsyncStorage for small preferences, SQLite for lists and records, **SecureStore for secrets** (tokens), FileSystem for files and media.
- SQLite and AsyncStorage are **not encrypted**: never store a secret there.
- With SQLite + Drizzle: the schema lives in `src/db/schema.ts`, migrations are generated (never written by hand) into `src/db/migrations/`, the client is created once in `lib/db.ts`, and the root layout applies the migrations at launch (`useMigrations`) before rendering the app.
- SQL values always go through parameters (`?` or Drizzle), never inside the SQL string.
- Clear the user's local data on sign-out.
- No secrets in logs.

## Loading, empty and error states

- Loading: a **skeleton** that mirrors the real content (`Skeleton`, `XLoading` components), marked `accessible` with `accessibilityState={{ busy: true }}` and a loading label.
- Error: the route's `ErrorBoundary`, with a "Retry" button. It tells the two cases apart: an `ApiError` means the server answered with an error; any other error means the network is unreachable, so it shows an "offline" message.
- Offline: show the last local copy when there is one (with its date when useful), refresh from the API when it is reachable, then update the copy. No copy: a message and a "Retry" button (course slide 70).
- Short notices that do not block the screen ("you are offline"): `ui/Toast`.
- An action that changes server data (add a favorite…): **optimistic update**. The UI changes at once (`useOptimistic` in a transition), then the action is sent; on failure, an alert explains it and the state is read again from the source.
- Empty and "no results": handled by the list (`ListEmptyComponent`), with a different message for each case (nothing at all, no favorite yet, no result for these filters) and an action when one is useful (reset filters, browse events).
- Pull-to-refresh on lists: `refreshing` + `onRefresh` from `useRequest`.
- When the app becomes active again, or a screen gets the focus (`useIsFocused`), revalidate the data that may have changed. Retries are limited and spaced out; listeners and requests are cleaned up.

## Texts (i18n)

See "Texts" in `docs/specs.md`.

- **No hard-coded text in components.** Every text shown or read to the user (titles, buttons, messages, accessibility labels and hints) comes from `i18n.t('<key>')`.
- Texts live in `src/data/messages/fr.json`, grouped by screen or feature (`catalogue`, `favorites`, `event`, `navigation`).
- Keys in `snake_case`, nested by meaning: `catalogue.error.title`, `catalogue.error.button`.
- Variables: `"Ajouter aux favoris : %{title}"` → `i18n.t('favorites.add_label', { title })`.
- Plurals: an object with `zero`, `one` and `other` → `i18n.t('catalogue.event_count', { count })`.
- Each state has its own texts: `loading`, `error` (`title`, `description`, `button`), `empty`, `no_results`.
- French typography: the apostrophe `’` and a space before `:` (`"Catégorie : %{category}"`).

## Styles

The app has a light and a dark theme ("Themes" in `docs/specs.md`): **layout in `STYLES`, colors in the JSX**.

- `const STYLES = StyleSheet.create({...})` at the **bottom** of the file, with layout only: **no color in `STYLES`**.
- Descriptive camelCase keys (`card`, `content`, `title`, `badge`). Shared state styles first: `pressed: { opacity: 0.75 }`.
- Colors come from `const colors = useColors()` (`src/styles/theme.ts`) and are added in the JSX: `style={[STYLES.title, { color: colors.text }]}`. Same for color props: `<Icon color={colors.accent} />`, `placeholderTextColor={colors.muted}`.
- Palette keys: `background`, `surface`, `text`, `muted`, `border`, `control`, `accent`, `error`. A new color is added to **both** `LIGHT` and `DARK`. Never a hard-coded color.
- Every text and every surface gets a color: a missing one stays black on a dark background. Check each screen in both themes on the phone.
- Layout with `flex` and `gap` for lists and rows. Margins are fine for vertical spacing inside a text block (`marginTop` between a title and its description).
- Screen content is centered with a maximum width: `width: '100%', maxWidth: 600, alignSelf: 'center'`.
- Dynamic styles: arrays (`style={[STYLES.label, { color: selected ? colors.surface : colors.text }]}`) or a function for `Pressable` (`style={({ pressed }) => [STYLES.button, pressed && STYLES.pressed]}`).
- Constants in UPPER_CASE at the top of the file (`CATEGORY_WIDTHS`).

## Lists and screens

- `FlatList` for lists, with `keyExtractor={(item) => String(item.id)}` (never the index), `ListHeaderComponent` for what scrolls with the list (header, filters), `ListEmptyComponent` for empty states, and `extraData` when a row depends on other state (favorites).
- `ScrollView` only for short content.
- Safe areas: `<SafeAreaView edges={…}>` from `react-native-safe-area-context`, and `contentInsetAdjustmentBehavior="automatic"` on scroll views.
- Keyboard: `keyboardDismissMode="on-drag"`, `keyboardShouldPersistTaps="handled"`, and `Keyboard.dismiss()` before navigating.
- Platform-specific code with `Platform.OS` / `Platform.select`.

## Icons

- `ui/Icon` wraps `expo-symbols` behind **our own names** (`'heart'`, `'close'`), each mapped to an SF Symbol (iOS) and a Material symbol (Android, web).
- Icons are decorative: hidden from the screen reader (`accessible={false}`, `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`). The button around them carries the label.

## Accessibility

- Title: `accessibilityRole="header"`.
- Button: `accessibilityRole="button"` + `accessibilityLabel` (from i18n). Toggles add `accessibilityState={{ selected }}`.
- `accessibilityHint` when the result of the action is not obvious ("Show the event details").
- Card: **one** `accessibilityLabel` that sums up its content (category, title, venue, date).
- Changing counter: `accessibilityLiveRegion="polite"`.
- Touch targets at least 44 × 44.
- A sheet can be closed with the screen reader's escape gesture (`onAccessibilityEscape`).

## Code style

- No semicolons, single quotes, `}>` on the same line as the last JSX attribute.
- Imports through the `~/` alias (`~/components/ui/Icon`). Relative imports only inside the same component folder (`./CatalogueFilters`, `../Catalogue`).
- Import groups, separated by a blank line: libraries (React, React Native, Expo) → components → contexts and hooks → data and lib → types (`import type`) → theme.
- `import type` or inline `type` for type-only imports.
- Comments in English: short lowercase `//` comments that explain **why**, and JSDoc on exported functions and hooks.
- Small functions. Event handlers are named `on<Action>` (`onEventPress`, `onFiltersReset`).
