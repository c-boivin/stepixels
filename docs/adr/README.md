# Architecture Decision Records (ADR)

An ADR records **one important technical decision**: its context, the decision, the rejected alternatives and its consequences.
We use them to justify our choices during the final presentation.

## Rules

- One file per decision: `ADR-<3-digit number>-<short-title>.md`.
- Start from [`TEMPLATE.md`](TEMPLATE.md).
- An accepted ADR is never edited. If we change our mind, we write a new ADR that **supersedes** the old one, and we set the old one's status to "Superseded by ADR-XXX".
- Every ADR goes through a pull request reviewed by the other team member.

## List

| # | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-why-react-native.md) | Why React Native? | Accepted |
| [ADR-002](ADR-002-enforce-conventional-commits.md) | Enforce Conventional Commits with commitlint | Accepted |
| [ADR-003](ADR-003-app-architecture.md) | How do we structure the app? | Proposed |
| [ADR-004](ADR-004-ui-text-i18n.md) | How do we manage the app's texts? | Proposed |
| [ADR-005](ADR-005-light-and-dark-themes.md) | How do we support light and dark themes? | Proposed |
