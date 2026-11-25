# stepixels

React Native app built for the ECV M2 mobile course, by a team of two.

| Stack | Version |
| --- | --- |
| [Expo](https://docs.expo.dev/versions/v58.0.0/) (React Native) | SDK 58 (React Native 0.88, React 19) |
| [Expo Router](https://docs.expo.dev/router/introduction) | every file in `src/app` is a route |
| TypeScript | strict mode |

## Documentation

- [`docs/adr`](docs/adr): major technical decisions and why we made them.
- [`docs/specs.md`](docs/specs.md): other technical choices (commits, texts, themes).
- [`docs/conventions.md`](docs/conventions.md): code conventions, used in code reviews.
- [`docs/course.md`](docs/course.md): course requirements and technical guidance.

## Setup

```bash
pnpm install   # also installs the commit-msg hook (commitlint)
```

- **iPhone**: install [Expo Go](https://expo.dev/go).
- **Android**: the app reads the steps from Health Connect, which is not in Expo Go, so it runs in a **development build** ([ADR-005](docs/adr/ADR-005-step-source.md)). Android 14 or later.
  1. Install [Android Studio](https://developer.android.com/studio) (it brings the Android SDK and a JDK), then set `ANDROID_HOME` and `JAVA_HOME` ([Expo guide](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=physical&mode=development-build&buildEnv=local)).
  2. On the phone: turn on USB debugging, plug it in, accept the prompt.
  3. `pnpm android`: compiles the app, installs it and opens it. Build again after each native change (new native library, `app.json`); JavaScript changes reload live.
  4. On a Samsung phone: in Samsung Health, allow it to write "Steps" to Health Connect.

## Commands

```bash
pnpm start                 # Metro dev server: scan the QR code with Expo Go (iPhone); the Android development build connects to it over USB
pnpm android               # build and run the Android development build
pnpm ios | web             # start and open on a platform
pnpm lint                  # lint
pnpm typecheck             # typecheck the app, then scripts/ (its own tsconfig, with the Node types)
pnpm test                  # unit and component tests (Jest)
pnpm test:coverage         # tests + coverage summary (HTML report in coverage/, git-ignored)
pnpm db:generate           # after a change to src/db/schema.ts: generate the migration, then commit it
pnpm images:convert        # convert the pixel art PNGs into the JSON the app draws
```

Add a dependency with `pnpm exec expo install <package>`: it picks the version compatible with SDK 58.

## Adding a pixel art image

1. Draw the image as a PNG at its real size (one pixel = one cell): 16 × 16 (image 01 only), 32 × 32, 48 × 48 or 64 × 64, at most 32 colors, no transparency.
2. Put it in `assets/images/pixel-art/`, named `<number>-<name>.png` (for example `01-champignon.png`).
3. Run `pnpm images:convert`: it writes `src/data/images/<number>-<name>.json` (`number`, read from the file name, `width`, `height`, `palette`, `cells`) and refuses a PNG that breaks a rule, naming the file and the rule.
4. Add the image to `src/data/images/catalogue.ts` (its name key, its JSON and its PNG: the number comes from the JSON), and its name to `src/data/messages/fr.json` under `images`.
5. Commit the PNG, its JSON, the catalogue and `fr.json` together.

## Contributing

- One branch per change, then a pull request reviewed by the other team member. The branch is deleted once merged.
- Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): description`.
