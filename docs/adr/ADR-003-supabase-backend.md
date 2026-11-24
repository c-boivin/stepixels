# ADR-003 · Which backend for accounts and progress backup?

- **Status**: Accepted
- **Date**: 2026-11-24
- **Authors**: stepixels team

## Context

- The app runs on **iOS and Android** (ADR-001). Users need an **account** so they can get their progress back after reinstalling the app or on a new phone.
- Users sign in with an **e-mail and a password**. They can reset a forgotten password, sign out and delete their account. The App Store and Google Play both require account deletion inside the app.
- **Health data stays on the phone**: steps are read on the device (HealthKit on iOS, Health Connect on Android). Only the results the app computes from them are sent.
- The account holds personal data (e-mail, first name): we want it hosted in the **European Union** (GDPR).
- The team has two people with a web background, and 5 days (November 23–27, 2026). The client library must be pure JavaScript, so this part needs no extra native code.
- A backend is optional for the course [51]. Its slide lists local data, a public API, or a hosted service (Supabase, Firebase).

## Decision

**Supabase**, in a European Union region: **Supabase Auth** (e-mail + password) for accounts, and its **Postgres** database to back up the progress.

- The app uses `@supabase/supabase-js` with the project's **public key** only. The secret key (`service_role`) never enters the app or the repository.
- **Row Level Security** is on for every table: each account reads and writes only its own rows.
- The session is stored in **SecureStore** (`expo-secure-store`), never in AsyncStorage or SQLite (course slides 68–69).
- **The phone computes, the server saves.** Business rules run on the phone. The server stores their results and gives them back when the user signs in.

Rejected:

- **Local data only (no backend)**: simplest, but the progress is lost when the phone changes or the app is reinstalled.
- **Firebase**: a hosted service too, with an e-mail + password sign-in. But Firestore is a document database, while our data is a set of related records, and its security rules use their own language. With Supabase, the tables and access rules are plain SQL, which both members can read in a review.
- **Our own server** (like the teacher's events API): we would have to build and secure sign-up, password hashing, password reset e-mails and hosting ourselves. Not possible in 5 days.
- **The teacher's events API**: it only serves demo events, with no accounts.

## Consequences

- \+ Sign-up, sign-in, password reset e-mails and sessions come ready-made: we only build the screens.
- \+ The same client works on iOS and Android.
- \+ Postgres checks the access rules (Row Level Security), so a bug in the app cannot read another account's rows.
- \+ The data stays in the European Union, and deleting an account can remove all its rows.
- \- The app depends on an external service: if the free project is paused or down, sign-in fails. The app must keep working offline and send its changes later.
- \- Without Row Level Security, the public key would give access to every row: each new table needs its policies, checked in review.
- \- SecureStore warns about values larger than 2 KB, and a Supabase session can exceed that: the sign-up pull request must handle it.
- \- Where the phone stores the progress (local database) and how the offline queue works are not decided here: they belong to the local storage ADR announced in ADR-002.
- \- The database schema lives in the Supabase project: its SQL must be committed to the repository so both members can recreate it.
