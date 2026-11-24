# Course reference

Summary of the teacher's course slides "ECV Mobile APP" (slide numbers in brackets).
The slides are the reference: if this summary and the slides disagree, the slides win.
For our own decisions, see `docs/adr/`. For code conventions, see `docs/conventions.md`.

- [Part 1 — Project brief](#part-1--project-brief): requirements, schedule, grading, presentation.
- [Part 2 — Technical guide](#part-2--technical-guide): React, React Native, navigation, HTTP, architecture.

## Part 1 — Project brief

### Goal [46–47]

A React Native app (Expo, TypeScript) built by a team of two. The app must have:

- **Flow**: several screens in a coherent user flow.
- **Data**: remote or simulated data.
- **Native features**:
  - one hardware feature: camera, GPS or a sensor;
  - one other native interaction: haptics, sharing…
- **Robustness**:
  - local persistence that survives an app restart;
  - handled errors and targeted tests.

The app is demonstrated **on a phone**, and **every member must be able to explain the team's choices**.

### Schedule [48]

| Day | Focus |
|---|---|
| Monday | Team and subject, repository initialized |
| Tuesday | List and detail screens, offline mode |
| Wednesday | Native APIs, permissions |
| Thursday | Targeted tests, scope freeze |
| Friday | Delivery and final presentation |

Scope freeze on Thursday: after that, only fixes, tests and documentation.

### Grading /20 [49]

| Criterion | Points |
|---|---|
| Documentation | 5 |
| Code review (graded **individually**) | 5 |
| Features | 5 |
| Code: tests, linting / readability, optimization | 3 |
| Presentation | 2 |

What this means for us:

- Documentation: README, ADRs, clear PR descriptions.
- Code review: every PR is reviewed by the other member, with real comments (not just "LGTM").
- Code: `tsc` and lint pass, tests exist for the important logic, optimizations are justified.

### Final presentation [50]

- Demo of the user flow on a phone.
- Technical choices **justified by the ADRs**.
- Answers to the jury's questions.
- Ideas for future improvements.

### Backend options [51]

A backend is optional. Possible data sources:

| Local data | Public API | Hosted service |
|---|---|---|
| No server | Online demo data | Managed database |
| Embedded JSON | DummyJSON | Supabase |
| Simulated writes | JSONPlaceholder | Firebase |

The teacher's events API: `https://ticketing-server.bastien-robert.workers.dev/events`.

### Architecture Decision Records [53]

One ADR per important decision: context and constraints, decision and alternatives, consequences and limits. Our format and list: `docs/adr/`.

### Teacher's references

- Example repository: https://github.com/bastienrobert/ticketing (monorepo: `apps/mobile` is the Expo app, `apps/server` the events API, `docs/adr/` the ADRs). The teacher updates it during the week; see "Teacher's example repository" in `CLAUDE.md`.
  - **Last reviewed commit**: `7b08381` (2026-11-17, "feat(mobile): data refreshing using pull-to-refresh gesture").
- Exercise 1 correction (React web catalogue) and exercise 2 correction (React Native carousel): source of `docs/conventions.md`.

### Not yet covered

Slides 63–94 (storage, security, offline, native APIs, permissions, sensors, tests, quality, distribution) are not summarized yet. Add them here when the course is given.

## Part 2 — Technical guide

### Mobile constraints [6–7]

- Interface: touch gestures, accessible touch targets, variable screen sizes, portrait and landscape, OS conventions (navigation, back).
- Constraints: variable network and offline mode, OS updates and stores, sensors and permissions, app lifecycle (pause / resume, saved state), battery and background work.

### React basics [19–23]

- A component is a function that describes the UI. Props are read-only.
- `useState`: reactive value, triggers a render (search, favorites).
- `useRef`: value kept between renders, does **not** trigger a render (DOM reference, timer).
- `useEffect`: synchronization with the outside (network, subscription), with dependencies and a cleanup function.
- **Derived state**: store the search query, compute the filtered results during render. Never store a computed value in a second state.

### Shared state [28]

State shared by several screens (for example favorites): `useReducer` + Context. One context for the state, one for `dispatch`.

```tsx
const [favoriteIds, dispatch] = useReducer(reduceFavorites, [])

return (
  <FavoritesStateContext value={favoriteIds}>
    <FavoritesDispatchContext value={dispatch}>
      {children}
    </FavoritesDispatchContext>
  </FavoritesStateContext>
)
```

Reference: https://react.dev/learn/scaling-up-with-reducer-and-context

### Optimization [29]

- `useMemo`: memoize an expensive calculation (heavy filtering).
- `useCallback`: stabilize a function passed to a `memo` child.
- `useDeferredValue`: defer rendering of a heavy list during a reactive search.
- **Optimize only after measuring**, with the Profiler of the React DevTools.

Note: our project enables the React Compiler (`app.json` → `experiments.reactCompiler`), which already memoizes many values automatically.

### React Native [32–40]

- Rendering: `<View>`, `<Text>`, `<Pressable>` are rendered as native iOS and Android views (no DOM, no HTML, no CSS).
- Architecture: JavaScript (React + Hermes engine) talks to native code through **JSI** (direct access). **Fabric** renders the views, **TurboModules** expose native APIs. JSI replaced the old asynchronous "Bridge".
- Expo = tools around React Native: Expo SDK (modules and APIs), Metro (JavaScript bundle), EAS (builds and distribution).
- **Expo Go** = ready-made test client with the bundled modules only. **Development build** = our own client, needed for custom native modules.
- Base components: `View`, `Text`, `Pressable`, `Image`, `ScrollView` (short content), `FlatList` (virtualized list).
- `StyleSheet.create`: camelCase properties, sizes without `px`, no CSS cascade.
- Layout: Flexbox, `column` by default; `flex`, `gap`, `alignItems`. Sizes: `useWindowDimensions`. Safe areas: `react-native-safe-area-context`. Support portrait, landscape and accessible text sizes.

### Navigation with Expo Router [41, 55–57]

- Each file in `src/app/` is a route. Parameters go in the URL.
- **Stack**: push a detail screen or go back (list → detail, back button, `router.back()`).
- **Tabs**: switch between main sections (catalogue, favorites, profile); persistent navigation, each tab has its own role.
- Dynamic route `src/app/events/[id].tsx`:

```tsx
<Link href={{ pathname: '/events/[id]', params: { id: event.id } }}>
  See the event
</Link>
```

```tsx
const { id } = useLocalSearchParams<{ id: string }>()
return <EventDetail id={id} />
```

- Deep link: `<scheme>://events/42`. The scheme is declared in `app.json` (ours: `stepixels`).

### HTTP [58–61]

- Methods: `GET` read, `POST` create, `PATCH` update, `DELETE` delete.
- Responses: `2xx` success, `4xx` client error, `5xx` server error, plus **network error** (no response at all).
- Authentication: header `Authorization: Bearer <token>`; the server checks identity and rights.
- Request with `fetch`:

```ts
export async function getEvents(signal: AbortSignal) {
  const response = await fetch('https://ticketing-server.bastien-robert.workers.dev/events', { signal })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const payload: unknown = await response.json()
  return eventsAdapter(payload)
}
```

- `await` to wait, `response.ok` to check the status, the **adapter validates** the `unknown` payload.
- Every request has 4 states on screen:

| State | The screen shows |
|---|---|
| Loading | A visible indicator, adapted actions |
| Success | The data |
| Empty list | A useful message and a possible action |
| Error | An understandable message and a **Retry** button |

- Effect cleanup cancels the request: `return () => controller.abort()`.

### Architecture [62]

| Layer | Folder | Role |
|---|---|---|
| Routes | `src/app/` | Parameters and state |
| Components | `components/ui/` | Rendering and interactions |
| Data | `data/get-events.ts` | Request and adaptation |
| Business logic | `lib/` | Independent rules |
| Hooks (when needed) | `hooks/` | Reused logic |

Dependencies go in **one direction only**. Our detailed version: `docs/adr/ADR-003-app-architecture.md`.
