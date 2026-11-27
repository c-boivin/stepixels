# ADR-006 · How is the app structured, now that it is built?

- **Status**: Accepted
- **Date**: 2026-11-27
- **Authors**: stepixels team

## Context

- ADR-002 chose the app's structure on day 2, before any feature existed: the 5 layers of course slide 62, with the teacher's example repository as the manual.
- During the week, the app grew in ways ADR-002 did not plan:
  - the course added persistence and offline mode [63–72], and the example repository added a **`repositories/` layer** and a **`db/` folder** (commit `4356dca`);
  - our data comes from **three places** (Supabase, the SQLite database, AsyncStorage), plus the phone's step source (ADR-003, ADR-004, ADR-005);
  - our screens are a **linear flow** (onboarding, home, settings, account), not tabs;
  - no state ended up shared between screens: each screen reads it again from the phone's storage.
- ADR-002 also listed folders that the app never needed (`(tabs)/`, `contexts/`, `const.ts`), and planned a lint check of the dependency rules that was not added.
- An accepted ADR is never edited (`docs/adr/README.md`): this ADR describes the structure as it is at delivery, and supersedes ADR-002.

## Decision

**Same frame as ADR-002 (slide 62 + the example repository), with one more layer: `repositories/`, the only code that knows where a piece of data is stored.** Everything else in ADR-002 stays: `Suspense` + `ErrorBoundary` + `useRequest` for loading, routes for screen state, views for interaction state, dependencies in one direction.

### Layers

| Layer | Folder | Role |
|---|---|---|
| Routes | `src/app/` | URL parameters, the data request, the actions that write (validate, unlock, sign in) |
| Components | `src/components/ui/`, `src/components/views/` | Rendering and interactions |
| Data | `src/data/` | `get-<page>-page.ts` getters and adapters: load one page and prepare it for display |
| Repositories | `src/repositories/` | Read and write one resource, wherever it is stored |
| Business logic and clients | `src/lib/` | Pure rules (`day.ts`, `progress.ts`, `rules.ts`) and clients (`db.ts`, `supabase.ts`, `i18n.ts`, `steps.ts`) |
| Hooks | `src/hooks/` | Reused React logic (`useRequest`, `useAppActive`, `useCountdown`…) |

### Structure

```
src/
├── app/                        → routes (Expo Router), one Stack
│   ├── _layout.tsx             → root Stack, fonts, database migrations
│   ├── index.tsx               → onboarding the first time, home afterwards
│   ├── onboarding/             → welcome, rule, time, pedometer (4 steps)
│   ├── account/                → sign-up, sign-in, sign-out
│   └── settings.tsx
├── components/
│   ├── ui/<Name>/              → reusable blocks that depend only on their props
│   └── views/<View>/           → the content of a screen
├── data/
│   ├── get-<page>-page.ts      → load and adapt the data of one page
│   ├── adapters/               → turn stored data into display-ready data
│   ├── images/                 → the pixel art catalogue (JSON)
│   └── messages/fr.json        → app texts (docs/specs.md)
├── repositories/               → validations, preferences, auth, backup, community
├── db/                         → Drizzle schema and generated migrations (ADR-004)
├── lib/                        → business rules and clients
├── hooks/
└── styles/theme.ts             → layout constants and the light and dark palettes (docs/specs.md)
```

### Data flow

```
route ──► data/get-<page>-page.ts ──► repositories/<resource>.repository.ts ──► lib/supabase.ts (Supabase)
  │            (adapter)                       ▲                              ├─► lib/db.ts (SQLite)
  │                                            │                              └─► AsyncStorage / SecureStore
  └── actions (VALIDER, SUIVANT, sign-in) ─────┘
```

- **Reads** go through a getter, which calls repositories and the business rules, then adapts the result for the view.
- **Writes** are actions started by the user: the route calls the repository directly, then reads the screen again.
- **No shared state between screens.** The phone's storage is the source of truth (ADR-004): a screen reads it again when it opens and when the app comes back to the foreground (`useAppActive`).
- **Native modules** stay in `lib/`, behind one function with the same signature on every platform (`steps.ios.ts` / `steps.android.ts`, ADR-005). Screens never import a native module.

### Dependencies go in one direction

| Folder | Must not import |
|---|---|
| `components/ui/` | `app/`, `data/`, `repositories/`, `components/views/` |
| `components/` (all) | `app/`, `data/`, `repositories/` |
| `repositories/` | `app/`, `components/`, `data/` |
| `lib/` | `app/`, `components/`, `hooks/` (`lib/rules.ts` imports nothing) |

Accepted exceptions:

- As in ADR-002, getters import the page data **types** declared in the routes (`import type`).
- `lib/i18n.ts` reads the texts in `data/messages/fr.json`, as in the example repository.
- `lib/steps.android.ts` reads one preference (whether the steps access was already asked): Health Connect does not tell it (ADR-005).

Rejected:

- **Keep ADR-002 as is**: it would describe tabs, contexts and a `const.ts` the app does not have, and no place for the code that talks to Supabase and SQLite.
- **Getters that call Supabase and SQLite directly** (no repositories): the same storage code would be repeated in each getter, and switching a resource from local to remote would touch every screen.
- **A context for the progress, shared by home and settings**: one more concept to explain, for data the phone already stores; reading it again is fast and always up to date.
- **Writes through the getters**: a getter loads a page; mixing actions in it would hide side effects in a function that looks like a read.

## Consequences

- \+ The structure in this ADR is the one in the repository: the jury can check it file by file.
- \+ Each resource has one place: the offline queue, the backup and the session are each in one repository, tested on a real in-memory database.
- \+ Screens never know where data is stored: a resource moved from AsyncStorage to SQLite only changes its repository.
- \- Two kinds of code paths to learn: reads through getters, writes from the routes.
- \- With no shared state, a screen must remember to read its data again when it comes back (`useAppActive`, refresh after a save).
- \- The dependency rules are still only written rules: no lint check enforces them. `OnboardingTime` imports `DEFAULT_RESET_TIME` from `preferences.repository`, against the table above.
