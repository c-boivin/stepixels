# ADR-002 · How do we structure the app?

- **Status**: Superseded by ADR-006
- **Date**: 2026-11-24
- **Authors**: stepixels team

## Context

- Two people work on the same app in parallel for 5 days. Without shared rules, each person organizes files differently and pull requests become hard to review.
- The app has several screens, loads remote or simulated data, shares state between screens (for example favorites), stores data locally and uses native APIs. Each concern needs a clear place.
- The project was created with `create-expo-app`. The template contains demo code (`explore.tsx`, `themed-text.tsx`…) with its own conventions (kebab-case files, `@/` alias, `constants/`).
- We have three references from the teacher:
  - **Course slide 62** "Structuring the app": the layers and the rule that dependencies go in one direction.
  - **The example repository** [`bastienrobert/ticketing`](https://github.com/bastienrobert/ticketing) (`apps/mobile`, commit `7b08381`): a real Expo Router app that applies these layers, with details the slide does not give.
  - **The two exercise corrections**: older, written before Expo Router and React 19 data loading were introduced in the course.
- With Expo Router, files in `src/app/` are routes. Expo recommends keeping non-route code outside this folder.

## Decision

**The slide is the frame, the example repository is the manual.** We keep the 5 layers of slide 62 and follow the example repository for everything the slide does not specify.

### Layers (slide 62)

| Layer | Folder | Role |
|---|---|---|
| Routes | `src/app/` | Parameters and screen state |
| Components | `src/components/` | Rendering and interactions |
| Data | `src/data/` | Request and adaptation |
| Business logic | `src/lib/` | Independent rules |
| Hooks, when needed | `src/hooks/` | Reused logic |

### Structure (example repository)

```
src/
├── app/                        → routes (Expo Router)
│   ├── _layout.tsx             → root Stack + app-wide providers
│   ├── (tabs)/_layout.tsx      → tab bar (NativeTabs)
│   ├── (tabs)/index.tsx        → one file per tab
│   ├── <section>/[id].tsx      → dynamic route (detail screen)
│   └── +not-found.tsx          → unknown deep links
├── components/
│   ├── ui/<Name>/              → reusable blocks that depend ONLY on their props
│   └── views/<View>/           → the content of a screen, reusable by several routes
├── contexts/                   → state shared between screens (useReducer + context)
├── hooks/                      → reusable React logic (useRequest…)
├── data/
│   ├── get-<page>-page.ts      → load and adapt the data of one page
│   ├── adapters/               → turn raw API data into display-ready data
│   └── messages/fr.json        → app texts (see `docs/specs.md`)
├── lib/                        → pure TypeScript: API client, i18n, business rules
├── styles/theme.ts             → colors
└── const.ts                    → environment values (API URL)
```

### Who holds which state

Slide 62 puts "state" in routes. We split it in two, like the example repository:

- **The route** holds the **screen state**: URL parameters and the data request (`useRequest`). It passes the request's promise to a view.
- **The view** holds the **interaction state**: values that only change the display (search text, selected filter). That is the "rendering and interactions" of the slide.
- **A context** holds the state **shared by several screens** (favorites).

This split lets one view serve several routes: the same `Catalogue` view can show all events in one tab and only favorites in another (`mode="all"` / `mode="favorites"`).

### Data loading

```
route ──useRequest(getter)──► promise ──► view: use(promise)
  │                                         │
  ├─ <Suspense fallback={<XLoading />}>     └─ getter result `null` → "not found" / empty message
  └─ export function ErrorBoundary({ retry })  → error message + "Retry" button
```

- `useRequest` starts the getter when the screen mounts, cancels it when the screen leaves (`AbortController`), and offers `refresh` for pull-to-refresh.
- Loading: `<Suspense>` shows a skeleton that mirrors the content.
- Error: an exception (network, HTTP status) reaches the route's `ErrorBoundary`, which offers "Retry".
- Unusable payload or unknown id: the getter returns `null`, and the view shows a "not found" or empty message.
- This covers the 4 states required by slide 61: loading, success, empty list, error.

### Dependencies go in one direction

| Folder | Must not import |
|---|---|
| `components/ui/` | `app/`, `data/`, `components/views/`, `contexts/` |
| `components/` (all) | `app/`, `data/` |
| `contexts/` | `app/`, `data/`, `components/` |

Only routes load data. Accepted exception, as in the example repository: `data/` getters import the page data **types** declared in the routes (`import type`).

Rejected:

- **Everything in the route** (exercise corrections): the route owns all the state, so a screen shown in two tabs duplicates its state and logic.
- **A `{ kind: 'loading' | 'error' | 'ready' }` state** (exercise 1): it works, but every screen repeats the same `if` checks, and the example repository moved to `Suspense` + `ErrorBoundary`.
- **Keep the Expo template conventions**: nothing in the template says where data, adapters, shared state or business rules go.
- **Components that fetch their own data**: data logic gets spread across many files, and the same request can run several times.
- **Organize by feature** (`features/events/…`): useful for large apps, too much structure for 5 days, and different from the course.

## Consequences

- \+ The layers match slide 62: the jury recognizes the structure.
- \+ Each concern has one place: a reviewer knows where to look, and both members can work in parallel.
- \+ Screens are short: a route is a few lines, and loading, error and empty states cannot be forgotten.
- \+ `ui` components and `lib` functions depend only on their inputs, so they are easy to test (requirement "targeted tests").
- \- `Suspense`, `use()` and `ErrorBoundary` are React 19 concepts: both members must understand them to explain them at the presentation.
- \- We must first clean the template: remove the demo code, replace the `@/` alias with `~/`, and replace `constants/theme.ts` with `styles/theme.ts`.
- \- The dependency rules are only written rules until we add the example repository's lint configuration (`oxlint` with `no-restricted-imports`), which checks them automatically. This is planned for a later pull request.
- \- Local storage, offline mode and native APIs are not covered here: they will get their own ADRs.
