# ADR-003 · Which backend for accounts and progress backup?

- **Status**: Accepted
- **Date**: 2026-11-24
- **Authors**: stepixels team

## Context

- In V1, a Stepixels **account is required**. It is created at the end of the onboarding, and its job is to **save the progress** (current image, streak, finished images, revealed days) so the user gets it back after reinstalling the app or on a new phone.
- Users sign in with an **e-mail and a password**. They can reset a forgotten password, sign out and delete their account. The App Store requires account deletion inside the app.
- **Health data never leaves the phone**: steps are read from HealthKit on the device. Only the total of each revealed day is sent.
- Users are in France: the data must be hosted in the **European Union**.
- The team has two people with a web background, and 5 days (November 23–27, 2026). We demo with **Expo Go**, so the client library must not need native code.
- A backend is optional for the course [51]. Its slide lists local data, a public API, or a hosted service (Supabase, Firebase).

## Decision

**Supabase**, in a European Union region: **Supabase Auth** (e-mail + password) for accounts, and its **Postgres** database to back up the progress.

- The app uses `@supabase/supabase-js` with the project's **public key** only. The `service_role` key never enters the app or the repository.
- **Row Level Security** is on for every table: each account reads and writes only its own rows.
- The session is stored in **SecureStore** (`expo-secure-store`), never in AsyncStorage or SQLite (course slides 68–69).
- **The phone computes, the server saves.** Business rules (days, reveals, streak, bonus) run on the phone. The server stores their results and gives them back when the user signs in. No business logic runs on the server.
- Only these leave the phone: first name, e-mail, the journey (start date, reveal time), the totals of each revealed or lost day, the streak, finished images, settings, and the date and version of the accepted terms.

Rejected:

- **Local data only (no backend)**: simplest, but the account and the progress restore on a new phone are the point of the V1.
- **Firebase**: a hosted service too, but Firestore is a document database, while our data is a set of related records (journey, days, finished images). Access rules use their own language, and its Expo setup is heavier than a JavaScript client.
- **Our own server** (like the teacher's events API): we would have to build and secure sign-up, password hashing, password reset e-mails and hosting ourselves. Not possible in 5 days.
- **The teacher's events API**: it only serves demo events, with no accounts.

## Consequences

- \+ Sign-up, sign-in, password reset e-mails and sessions come ready-made: we only build the screens.
- \+ Data is checked by Postgres rules (Row Level Security), so a bug in the app cannot read another account's rows.
- \+ `supabase-js` is pure JavaScript and SecureStore is included in Expo Go: no development build needed for this part.
- \+ The data stays in the European Union, and deleting an account can remove all its rows.
- \- The app depends on an external service: if the free project is paused or down, sign-in fails. Reveals must keep working offline (written locally first, sent later).
- \- Without Row Level Security, the public key would give access to every row: each new table needs its policies, checked in review.
- \- SecureStore warns about values larger than 2 KB, and a Supabase session can exceed that: the sign-up pull request must handle it.
- \- Where the phone stores the progress (local database) and how the offline queue works are not decided here: they belong to the local storage ADR announced in ADR-002.
- \- The database schema lives in the Supabase project: its SQL must be committed to the repository so both members can recreate it.
