# ADR-001 · Why React Native?

- **Status**: Accepted
- **Date**: 2026-11-23
- **Authors**: stepixels team

## Context

An iOS and Android app, a web team, a project of a few days.

- The team has two people with a web background (React, TypeScript).
- The project lasts 5 days (November 23–27, 2026) and the app must be demonstrated on a phone.
- The app must use a hardware feature (camera, GPS or sensor) and another native interaction (haptics, sharing…).

## Decision

React Native with Expo and TypeScript.

- Expo SDK 58 (React Native 0.88, React 19).
- Navigation with Expo Router: every file in `src/app/` is a screen.
- Testing on a phone with Expo Go, without installing Xcode or Android Studio.

Rejected:

- **Native Swift / Kotlin**: two codebases and two languages the team does not know. Not possible in 5 days.
- **Flutter**: also a single codebase, but in Dart, a new language for the team. We cannot reuse our React skills.
- **PWA**: hardware access is limited, especially on iOS with Safari (no vibration, Bluetooth or NFC, and push notifications only once the app is installed). Too risky for the "hardware feature" requirement.

## Consequences

- \+ One shared codebase, native components.
- \+ We reuse our React knowledge: components, state, hooks.
- \+ Expo provides the common native modules (sensors, camera, haptics…) without writing native code.
- \- Some modules require a native build: they do not work in Expo Go and need a development build.
- \- Expo ships breaking changes with every SDK: we must read the SDK 58 documentation, not an older version.
- \- Rendering differs between iOS and Android: we must test on both.
