# Architecture Decision Records (ADR)

An ADR records **one major technical decision**: its context, the decision, the rejected alternatives and its consequences.
We use them to justify our choices during the final presentation.

## ADR or spec?

- **ADR**: a major technical choice, hard to undo, that shapes the whole project. Examples: the framework (React Native), the backend or database, the app architecture.
- **Spec** ([`docs/specs.md`](../specs.md)): every other technical choice about how we build the app (libraries, tooling, implementation rules). Example: how we manage texts or themes.

## Rules

- One file per decision: `ADR-<3-digit number>-<short-title>.md`.
- Start from [`TEMPLATE.md`](TEMPLATE.md).
- An accepted ADR is never edited. If we change our mind, we write a new ADR that **supersedes** the old one, and we set the old one's status to "Superseded by ADR-XXX".
- Every ADR goes through a pull request reviewed by the other team member. **The pull request is the proposal: approving it accepts the ADR.** So an ADR is written with the status `Accepted` from the start, and every ADR on `main` is accepted.

## List

| # | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-why-react-native.md) | Why React Native? | Accepted |
| [ADR-002](ADR-002-app-architecture.md) | How do we structure the app? | Accepted |
| [ADR-003](ADR-003-supabase-backend.md) | Which backend for accounts and progress backup? | Accepted |
