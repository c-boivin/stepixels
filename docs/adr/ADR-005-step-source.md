# ADR-005 · Where does the app read the steps from?

- **Status**: Accepted
- **Date**: 2026-11-25
- **Authors**: stepixels team

## Context

- The whole app is built on the user's steps: 100 steps reveal one pixel. This is also our **hardware feature** for the course (a sensor).
- The step source was left open in ADR-003.
- The app must count the steps walked **while it was closed**: nobody keeps the app open while walking. The steps are read when the app opens and when it comes back to the foreground, with no live update (backlog rule R12).
- It must work on **iOS and Android** (ADR-001). We demo on an iPhone with **Expo Go** and on a **Samsung S22** (Android 16).
- The phones already count the steps: iOS in its motion data (CoreMotion), Android in **Health Connect**, the health data store built into Android 14 and later, which Samsung Health writes to.
- Expo has no health module. Its pedometer (`expo-sensors`) reads past steps **on iOS only**: on Android it only counts live, while the app is open (Expo SDK 58 docs).
- The team has two people and 5 days (November 23–27, 2026), on Windows computers (no Mac).

## Decision

Read the steps the phone already stored, with one source per platform, behind **one module with the same functions on both platforms**: `src/lib/steps.ts` (`getStepsSince`, `getStepsAccess`, `requestStepsAccess`).

- **iOS**: the Expo pedometer (`Pedometer.getStepCountAsync`, CoreMotion), in `steps.ios.ts`. Works in Expo Go.
- **Android**: **Health Connect** (`react-native-health-connect`, `READ_STEPS` permission), in `steps.android.ts`. It needs a **development build** (`pnpm android` = `expo run:android`), and we support **Android 14 and later** only (`minSdkVersion` 34).
- Metro picks the platform file, so the iOS app never loads the Health Connect code. Screens import `~/lib/steps` only, never a native module.

Rejected:

- **HealthKit** on iOS (Apple Health): needs a development build, so a Mac with Xcode, and probably a paid Apple developer account to install it on an iPhone. CoreMotion gives the same daily steps in Expo Go.
- **Expo pedometer on Android** (`watchStepCount`): counts only while the app is open, with no history. The steps walked with the app closed would be lost.
- **Google Fit API**: deprecated by Google in favor of Health Connect.
- **Counting the steps ourselves in the background** (background task + sensor): heavy on the battery, killed by Android's battery savers, and the count would differ from the phone's health app.

## Consequences

- \+ The steps include those walked while the app was closed, and match the phone's health app (Health Connect removes duplicates between the apps that write steps).
- \+ One module, the same functions on both platforms: the screens never check the platform, and the Health Connect import lives in one file.
- \+ iOS keeps the Expo Go workflow, with no Mac needed.
- \- Android needs a development build: Android Studio (SDK and JDK) on the computer that builds it, and a new build after each native change (new native library or `app.json` change). JavaScript changes still reload live.
- \- iOS keeps only the **last 7 days** of steps. Enough for a daily counter, not for a longer history.
- \- Health Connect only has the steps written **after** Samsung Health was allowed to write them: allow it on the demo phone as early as possible.
- \- Health Connect does not say whether it can still show its permission dialog (no "can ask again", unlike iOS). After a refusal, the app sends the user to the Health Connect settings.
- \- Android 13 and older are not supported (Health Connect is a separate app there, with an extra permission screen to build).
