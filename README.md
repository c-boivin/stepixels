# stepixels

React Native app built for the ECV M2 mobile course, by a team of two.

| Stack | Version |
| --- | --- |
| [Expo](https://docs.expo.dev/versions/v58.0.0/) (React Native) | SDK 58 (React Native 0.88, React 19) |
| [Expo Router](https://docs.expo.dev/router/introduction) | every file in `src/app` is a route |
| TypeScript | strict mode |

## Documentation

- [`docs/adr`](docs/adr): architecture decisions and why we made them.
- [`docs/conventions.md`](docs/conventions.md): code conventions, used in code reviews.
- [`docs/course.md`](docs/course.md): course requirements and technical guidance.

## Setup

```bash
pnpm install   # also installs the commit-msg hook (commitlint)
```

Then install [Expo Go](https://expo.dev/go) on your phone.

## Commands

```bash
pnpm start                 # Metro dev server: scan the QR code with Expo Go
pnpm ios | android | web   # start and open on a platform
pnpm lint                  # lint
pnpm exec tsc --noEmit     # typecheck
```

Add a dependency with `pnpm exec expo install <package>`: it picks the version compatible with SDK 58.

## Contributing

- One branch per change, then a pull request reviewed by the other team member. The branch is deleted once merged.
- Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): description`.
