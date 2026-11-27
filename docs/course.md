# Course reference

Summary of the teacher's course slides "ECV Mobile APP" (slide numbers in brackets).
The slides are the reference: if this summary and the slides disagree, the slides win.
For our own decisions, see `docs/adr/` and `docs/specs.md`.

- [Part 1 — Project brief](#part-1--project-brief): requirements, schedule, grading, presentation.
- [Part 2 — Technical guide](#part-2--technical-guide): React, React Native, navigation, HTTP, architecture, persistence, security, offline mode, native APIs, permissions, sensors.

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
  - **Last reviewed commit**: `d621601` (2026-11-18, "feat(mobile): add calendar event after purchase"), reviewed on 2026-11-25; checked again on 2026-11-27: no new commit. Since `4356dca`: switch to a development build (`expo run:ios` / `expo run:android`), mocked Apple Pay from a local native module loaded with `requireOptionalNativeModule`, and adding the event to the calendar with the permission flow of slides 76–77 (`lib/calendar.ts`, native permission texts in `src/data/messages/native/fr.json` through `locales` in `app.json`).
- Exercise 1 correction (React web catalogue) and exercise 2 correction (React Native carousel): source of our first code conventions.

### Not yet covered

Slides 92–94 (final delivery) are not summarized yet: the Thursday PDF stops at slide 91. Add them here when they are shared.

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

Dependencies go in **one direction only**. Our detailed version: `docs/adr/ADR-002-app-architecture.md`.

### Persistence: which storage for which data? [63–64]

| Storage | For | Examples |
|---|---|---|
| React state | The interface in progress, in memory | Search text, open sheet |
| AsyncStorage | Preferences, keys and values | Chosen theme, onboarding seen |
| SQLite | Local tables, SQL queries | Favorites, cached catalogue |
| SecureStore | Small secrets | Session token |
| FileSystem | Files and media, documents or cache | Photos, downloaded files |

### SQLite with expo-sqlite [65–66]

- A persistent database on the device, with an explicit schema, created at app launch:

```ts
const database = await openDatabaseAsync('app.db')

await database.execAsync(`
  CREATE TABLE IF NOT EXISTS favorites (
    event_id INTEGER PRIMARY KEY
  )
`)
```

- Write then read back: insert without duplicates (`INSERT OR IGNORE`), read at startup, and **always pass values as parameters** (`?`), never inside the SQL string.

```ts
await database.runAsync(
  `INSERT OR IGNORE INTO favorites (event_id) VALUES (?)`,
  event.id,
)

const favorites = await database.getAllAsync<FavoriteRaw>(
  'SELECT event_id FROM favorites',
)
```

### SQLite with Drizzle ORM [67]

- Schema written in TypeScript, migrations applied at startup, reactive queries.

```tsx
const expo = openDatabaseSync('app.db', { enableChangeListener: true })
const db = drizzle(expo)

export default function App() {
  const migration = useMigrations(db, migrations)
  if (migration.error) return <ErrorScreen />
  if (!migration.success) return <Loading />
  return <Favorites />
}

function Favorites() {
  const { data } = useLiveQuery(db.select().from(favorites))
  return <FavoritesList items={data} />
}
```

### Data and security [68–69]

The phone keeps a copy of the data:

- **Visible bundle**: `EXPO_PUBLIC_` variables are readable in the app. Private keys stay on the server.
- **HTTPS**: valid certificate; the server checks authorization.
- **Minimal collection**: only the permissions we need; a defined retention time.
- **Sensitive data**: no secrets in logs; purge local data on sign-out.
- **Local storage**: SQLite and AsyncStorage are **not encrypted** by default. Use **SecureStore** (`expo-secure-store`) for secrets:

```ts
await SecureStore.setItemAsync('session-token', sessionToken)
const storedToken = await SecureStore.getItemAsync('session-token')
await SecureStore.deleteItemAsync('session-token')
```

### Offline mode [70–72]

The offline catalogue, in 3 steps:

1. **Read the cache**: the last copy, on the device.
2. **Display**: the data is visible, with the date of the copy.
3. **Refresh**: call the API if it is reachable, then save the new cache.

No network: keep the copy. No cache: a message and a **Retry** action.

Persistence in the cloud (writes made offline):

| Device | Server |
|---|---|
| The action is **pending**, in a persistent queue | The action is **accepted or refused** |
| Retried when the connection comes back | Business confirmation; conflicts handled explicitly |

Network, resume and retries:

- **Network**: `expo-network` gives a signal, but only the request proves the API is reachable.
- **AppState**: when the app becomes `active` again, revalidate the data; background work is limited.
- **Requests**: retries are limited and spaced out; clean up (cancel requests, remove listeners).

### Native APIs: what the phone can do [73–75]

Use the phone's capabilities while respecting the user. Each capability is an Expo module:

| Capability | Module | Use |
|---|---|---|
| Position | `expo-location` | GPS |
| Haptics | `expo-haptics` | Touch feedback |
| Camera | `expo-camera` | Photo and QR code |
| Motion | `expo-sensors` | Tilt and movement |
| Notifications | `expo-notifications` | Local alerts |

Two development strategies [75]:

- **Expo Go**: a fixed set of modules (camera, location, haptics, sensors, notifications).
- **Development build**: native modules compiled into the project. Needed for NFC (`react-native-nfc-manager`), Face ID (`expo-local-authentication`), push notifications on Android (SDK 53 and later) and any third-party module with native code.

### Permissions [76–79]

**One capability, one consent.** A permission has 3 states [76]:

| State | Meaning | What to do |
|---|---|---|
| `undetermined` | Not asked yet | Explain, then ask at the right moment |
| `granted` | Allowed | Use the capability |
| `denied` | Refused | `canAskAgain` ? ask again : open the Settings |

Read the state first, then ask or react to the refusal.

**Respect the refusal** [77]: explain, leave the choice, allow or not to continue.

- **Simple refusal**: explain the benefit, avoid asking again and again.
- **System settings**: when `canAskAgain === false`, `Linking.openSettings()`.
- **Alternative**: offer another way (type the code, continue without scanning).
- **Back in the app**: when `AppState` becomes `active`, read the permission again.
- **Blocking screen**: only if the capability is essential. Explain, then open the Settings.

Camera permission [78]: wait for the state, offer one action, respect the refusal.

```tsx
const [permission, requestPermission] = useCameraPermissions()

if (!permission) return <ActivityIndicator />

if (!permission.granted) {
  const canAskAgain = permission.canAskAgain

  return (
    <Button
      title={canAskAgain ? 'Autoriser' : 'Réglages'}
      onPress={canAskAgain ? requestPermission : Linking.openSettings}
    />
  )
}
```

QR code scan [79]: detect the code once, then trigger the action. A ref blocks the scans that arrive before the state is updated.

```tsx
const scanned = useRef(false)
const [code, setCode] = useState<string | null>(null)

function scanCode(result: BarcodeScanningResult) {
  if (scanned.current) return
  scanned.current = true
  setCode(result.data)
}

<CameraView
  style={{ flex: 1 }}
  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
  onBarcodeScanned={code === null ? scanCode : undefined}
/>
```

### Sensors [80–81]

Haptic feedback and position [80]:

```ts
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

const { granted } = await requestForegroundPermissionsAsync()
if (!granted) return

const position = await getCurrentPositionAsync({ accuracy: Accuracy.Balanced })
```

**Listen, then release** [81]: subscribe only while the sensor is enabled, and remove the subscription in the effect's cleanup.

```ts
useEffect(() => {
  if (!isSensorEnabled) return
  Accelerometer.setUpdateInterval(200)
  const subscription = Accelerometer.addListener(setMotion)
  return () => subscription.remove()
}, [isSensorEnabled])
```

### Delivery: tests [82–86]

The question of the part: how to test, measure and ship a reliable app? [82]

**Three levels of tests** [83], from the base of the pyramid to the top:

| Level | Tool | What it checks |
| --- | --- | --- |
| Unit | Jest | Business rules, pure functions: inputs and outputs |
| Components | React Native Testing Library | UI behavior: a press and its result, found by roles and labels |
| End-to-end (E2E) journey | Maestro | The installed app: navigation and persistence |

**Unit test** [84]: one defined input, one expected result. The example also checks that the input is not mutated.

```ts
it('ajoute un favori sans mutation', () => {
  const favorites = [12]
  const result = toggleFavorite(favorites, 42)

  expect(result).toEqual([12, 42])
  expect(favorites).toEqual([12])
})
```

**Component test** [85]: mock an action, trigger an event, check the linked action. The button is found by its role and accessible name, as a screen reader would.

```tsx
it('déclenche le favori', async () => {
  const user = userEvent.setup()
  const onToggle = jest.fn()

  await render(<FavoriteButton eventId={42} isFavorite={false} onToggle={onToggle} />)
  const button = screen.getByRole('button', { name: 'Ajouter aux favoris' })

  await user.press(button)
  expect(onToggle).toHaveBeenCalledTimes(1)
})
```

**Maestro** [86]: test a journey, a sequence of events that imitates a user, on the installed app. The example checks that a favorite survives a restart (persistence):

```yaml
appId: 'com.example.ticketing'
---
- launchApp:
    clearState: true
- tapOn:
    id: 'favorite-42'
- tapOn: 'Favoris'
- assertVisible: 'Événement démo'
- stopApp
- launchApp
- tapOn: 'Favoris'
- assertVisible: 'Événement démo'
```

### Delivery: quality [87–89]

**Measure before optimizing** [87]:

| Tool | Measures |
| --- | --- |
| React Native DevTools | React profiler: renders and their duration |
| Xcode Instruments | CPU time, memory and energy on iOS |
| Android Studio Profiler | CPU, memory and rendering on Android |
| EAS Observe | Startup and renders in production |

**Renders and resources** [88]: one targeted fix, then one measure to validate it.

- Lists: `FlatList` and stable keys, simple rows.
- Renders: state at the right level, `memo` only if the gain is measured.
- Images: suitable dimensions, thumbnails in lists.
- Resources: subscriptions cleaned up, limited JS work.
- List trade-off: a bigger render window uses more memory; a smaller one risks blank areas while scrolling.

**Accessible action** [89]: a role and a state, one named action, working with VoiceOver and TalkBack. The `testID` is what Maestro taps (`id: 'favorite-42'`).

```tsx
<Pressable
  testID={`favorite-${eventId}`}
  accessibilityRole='button'
  accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
  accessibilityState={{ selected: isFavorite }}
  onPress={onToggle}>
  <Text>{isFavorite ? '★' : '☆'}</Text>
</Pressable>
```

### Delivery: distribution [90–91]

**Build and distribute** [90]:

- `expo prebuild`: generates `ios/` and `android/`, with the native config applied.
- EAS Build: compiles the binary and signs the app.
- EAS Submit: sends the binary to the App Store or Google Play.
- Distribution: TestFlight or a Play test track, then release and store review.
- Before submitting: identifier, signature and versions consistent; screenshots, privacy details and store listing ready.

**Compatibility with the installed runtime** [91]:

| | EAS Update | EAS Build |
| --- | --- | --- |
| When | Only JS code and assets changed, still compatible | A native module or the native configuration changed |
| Needs | A compatible `runtimeVersion`, the binary already installed, the update tested | Compile and sign, install the new binary, the right distribution |
