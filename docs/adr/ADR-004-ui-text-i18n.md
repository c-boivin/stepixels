# ADR-004 · How do we manage the app's texts?

- **Status**: Proposed
- **Date**: 2026-11-24
- **Authors**: stepixels team

## Context

- The app's screens are in **French**, but all our code and documentation are in **English**.
- The course asks us to handle every state on screen with a useful message: loading, error, empty list, no results, and plurals ("1 favori" / "2 favoris").
- Accessibility labels read by the screen reader are also texts, and there are many of them.
- The teacher's example repository (`bastienrobert/ticketing`) has no hard-coded text: every string goes through an i18n library.

## Decision

All texts shown or read to the user go through **i18n-js**, with the phone's language read by **expo-localization**, like in the teacher's repository:

- `src/lib/i18n.ts` creates one `i18n` instance, with French as the default and fallback language.
- `src/data/messages/fr.json` holds every text, grouped by screen or feature.
- Components call `i18n.t('catalogue.error.title')`, with variables (`%{title}`) and plurals (`zero` / `one` / `other`).

Rejected:

- **Hard-coded French strings in the components**: simpler at first, but French text gets mixed with English code, plurals are rewritten in each component, and texts are spread across many files.
- **react-i18next**: more features (namespaces, hooks), but heavier to set up, and different from the teacher's reference.
- **English screens**: our users and the jury are French-speaking.

## Consequences

- \+ All the texts are in one file: easy to proofread, and easy to review in a pull request.
- \+ Plurals and variables are handled in one place.
- \+ Adding a language later means adding one JSON file (`en.json`).
- \- Two more dependencies (`i18n-js`, `expo-localization`), to install with `pnpm exec expo install`.
- \- `i18n.t()` accepts any string: TypeScript does not detect a misspelled or missing key. We must check the texts on the phone.
- \- Every new text needs a key in `fr.json`, which is a little slower than typing the text directly.
