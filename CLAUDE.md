# stepixels — team rules

ECV M2 group project: a React Native app (Expo SDK 58, TypeScript, Expo Router), built by a team of two in 5 days (November 23–27, 2026), graded by the course teacher.
Both team members use Claude Code with this file: **the same rules apply to everyone**, so the code looks like it was written by one person.

## Sources of truth (in this order)

1. Team decisions: `docs/adr/`, for major choices (ADR-002 = app architecture).
2. Technical specs, for the other technical choices (commits, texts, themes…): `docs/specs.md`.
3. Code conventions: `docs/conventions.md`.
4. Course reference (requirements, schedule, grading, technical guidance from the slides): `docs/course.md`.
5. Expo SDK 58 documentation (see "Expo" below).

**Before writing, editing or reviewing code in `src/`, read `docs/conventions.md` and `docs/adr/ADR-002-app-architecture.md`, and follow them exactly.** If a rule is missing or unclear, ask instead of using another convention (including the Expo template's).

If two sources disagree, stop and ask: do not pick one silently.

This file is shared by the team. If a rule here conflicts with a team member's request or with another source, do not choose: write a short recap of the conflict (the rules, where each comes from, the options) so the team can decide together.

## Rules

- **All documentation is in English**: docs, ADRs, README, code comments, commit messages, PR titles and descriptions.
- **The app's screens are in French, through i18n** (`docs/specs.md`): never hard-code a user-facing text, including accessibility labels. Add it to `src/data/messages/fr.json` and use `i18n.t()`.
- **Never invent a decision.** If something is not decided in an ADR, the specs or the conventions (data source, storage, hardware feature…), ask the user. Write a new ADR or spec only when the user asks for it.
- **ADR or spec?** (teacher's rule) An ADR is only for a **major** technical choice, hard to undo, that shapes the whole project: framework, backend or database, app architecture. Write it when the choice is made (format: `docs/adr/TEMPLATE.md`), with status `Proposed`. Every other technical choice is a section of `docs/specs.md` (rule, why, rejected, limits). If unsure, ask.
- **Never edit an accepted ADR.** Write a new one that supersedes it (see `docs/adr/README.md`).
- Keep the scope to the course requirements in `docs/course.md`. Propose extras, do not build them unasked.

## New course slides

New theory arrives during the week. When a team member shares new slides:

1. Update `docs/course.md`: add the content in English, in the matching part, with slide numbers in brackets. Remove it from the "Not yet covered" list.
2. List every existing rule (this file, `docs/specs.md`, `docs/conventions.md`, ADRs) that the new slides contradict or complete, and ask the team what to change. Do not change those rules silently.
3. Never commit the slide PDFs: they are the teacher's material.

## Teacher's example repository

The teacher updates https://github.com/bastienrobert/ticketing during the week. Its mobile app (`apps/mobile`) is the reference for architecture and code style. When a team member asks to check it:

1. Get its latest commits (clone or pull it outside this repository, for example in a temporary folder) and read the commits made after the "Last reviewed commit" written in `docs/course.md`.
2. List every difference with our rules (this file, `docs/specs.md`, `docs/conventions.md`, ADRs): what it contradicts, what it adds. Ask the team what to adopt. Do not change our rules silently.
3. Update "Last reviewed commit" in `docs/course.md`.

## Expo

Expo ships breaking changes with every SDK. APIs from older SDKs are often renamed, moved or removed, so **never write Expo or React Native code from memory**:

- Before using an Expo, EAS or React Native API, check the SDK 58 docs: https://docs.expo.dev/versions/v58.0.0/ (index of all docs: https://docs.expo.dev/llms.txt).
- Add a dependency with `pnpm exec expo install <package>`, never `pnpm add`: it picks the version compatible with SDK 58.
- Prefer Expo modules over third-party libraries.
- Expo Go only includes the modules bundled with Expo. A library with its own native code needs a development build: ask the team before adding one, because we demo with Expo Go.
- Never create or edit `ios/` or `android/`: they are generated. Configure native behavior in `app.json` and config plugins.
- Navigation uses Expo Router (`Link`, `router`, `useLocalSearchParams` from `expo-router`): see `docs/course.md` and ADR-002.

## Git workflow

- Never commit on `main`. One small branch per change, then a pull request reviewed by the other member (code review is graded individually).
- Commit messages and PR titles follow Conventional Commits: `type(scope): description` (enforced by commitlint on commit; PR titles are not checked, so check them yourself).
- Delete each branch once its pull request is merged: on GitHub ("Delete branch" button, or the repository setting "Automatically delete head branches"), then locally with `git switch main && git pull && git fetch --prune && git branch -d <branch>`.
- Use `pnpm` for every command.

## Before saying a task is done

```bash
pnpm exec tsc --noEmit   # must pass
pnpm lint                # must pass
pnpm exec expo-doctor    # after adding or updating a dependency
```

Then test on a phone with Expo Go (`pnpm start`). Report what was checked and what was not.
