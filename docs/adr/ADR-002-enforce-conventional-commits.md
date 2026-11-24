# ADR-002 · Enforce Conventional Commits with commitlint

- **Status**: Accepted
- **Date**: 2026-11-23
- **Authors**: stepixels team

## Context

- The course requires commit messages in the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format: `type(scope): description`.
- Code review is graded individually: a readable history helps the reviewer understand each change.
- With two people and 5 days, it is easy to forget the format when moving fast.

## Decision

Check every commit message automatically, on each team member's machine:

- **commitlint** with the `@commitlint/config-conventional` configuration;
- **husky** runs commitlint before every commit (`commit-msg` hook) and rejects a badly formatted message.

Rejected:

- **Relying on everyone's discipline**: nothing prevents mistakes, and we only see them during review.
- **Checking only on GitHub (CI)**: the mistake is detected after the push, so we have to rewrite the history.

## Consequences

- \+ A badly formatted message is rejected immediately, before the commit is created.
- \+ A consistent history, easy to read during reviews and the final presentation.
- \- The hook is installed by `pnpm install` (`prepare` script): each member must run the install after cloning the repository.
- \- The check only runs locally: `git commit --no-verify` bypasses it.
- \- The pull request title, reused as the merge commit message, is not checked: we must review it ourselves.
