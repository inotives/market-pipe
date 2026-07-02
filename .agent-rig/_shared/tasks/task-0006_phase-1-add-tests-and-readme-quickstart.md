---
id: task-0006
title: "Phase 1: add tests and README quickstart"
type: task
status: ready
assigned_to: "worker"
created_by: human
created_on: 2026-07-02
updated_on: 2026-07-02
priority: normal
parent: ""
depends_on: ["task-0001", "task-0002", "task-0003", "task-0004", "task-0005"]
---

# Task

## Context

Phase 1 plan: `docs/phases/phase-01-project-skeleton.md`.

This task closes Phase 1 by making the scaffold verifiable from a fresh clone.

## Goal

Add the final Phase 1 checks and README quickstart for local setup, config, database bootstrap, and `coins_list` smoke run.

## Scope

- `.env.example` reflects the required local config template.
- `.env.local` remains ignored by git.
- README quickstart covers:
  - install dependencies
  - copy `.env.example` to `.env.local`
  - start local Postgres with Docker Compose
  - run `db bootstrap`
  - run config checks
  - run tests
  - run `coins_list` with local dev command
  - explain installed `market-pipe ...` command form
- Final Phase 1 test/compile pass.

## Planner Notes

- Keep README minimal.
- Do not document Phase 2+ commands as if they are implemented.
- Installed npm users can provide config through shell, systemd, Docker, or CI environment variables.

## Implementation Plan

1. Review `.env.example` and `.gitignore`.
2. Add or update README quickstart.
3. Run compile and tests.
4. Confirm Phase 1 acceptance signals are covered.

## Acceptance Criteria

- [ ] `.env.example` uses only `MARKET_PIPE__*` config keys.
- [ ] `.gitignore` ignores `.env.local`.
- [ ] README quickstart is enough for a fresh clone to run Phase 1 locally.
- [ ] `npm test` passes.
- [ ] TypeScript compile check passes.
- [ ] `npm run market-pipe -- --help` works.
- [ ] The package exposes an installed `market-pipe` binary.

## Notes
