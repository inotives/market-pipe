---
id: task-0001
title: "Phase 1: scaffold TypeScript CLI package"
type: task
status: ready
assigned_to: "worker"
created_by: human
created_on: 2026-07-02
updated_on: 2026-07-02
priority: normal
parent: ""
depends_on: []
---

# Task

## Context

Phase 1 plan: `docs/phases/phase-01-project-skeleton.md`.

This task creates the minimal TypeScript/npm CLI package shape. It should not implement CoinGecko ingestion, Postgres bootstrap, or config validation beyond what is needed for the CLI to load.

## Goal

Create a strict TypeScript CLI scaffold that exposes the future installed command `market-pipe` and the local development command `npm run market-pipe -- ...`.

## Scope

- `package.json` with npm scripts for local CLI execution, compile check, and tests.
- TypeScript config with strict compiler settings.
- CLI entry file with `#!/usr/bin/env node`.
- `package.json` `bin` entry for `market-pipe`.
- `commander` CLI parser.
- `yaml` dependency for later source config parsing.
- Node's built-in test runner.
- Placeholder command tree:
  - `market-pipe --help`
  - `market-pipe config check --for <scope>`
  - `market-pipe db bootstrap`
  - `market-pipe coingecko run --entity <entity>`

## Planner Notes

- Canonical user-facing command after package install is `market-pipe ...`.
- Local development command is `npm run market-pipe -- ...`.
- Do not add lint/format tooling in Phase 1.
- Do not add dbt scaffolding in Phase 1.

## Implementation Plan

1. Add npm/TypeScript package files.
2. Add CLI entrypoint and command registration skeleton.
3. Add compile and test scripts.
4. Add one minimal CLI/help test if cheap; deeper behavior tests can wait for later tasks.

## Acceptance Criteria

- [ ] `npm install` works from a fresh clone.
- [ ] TypeScript compile check passes.
- [ ] `npm test` passes.
- [ ] `npm run market-pipe -- --help` prints CLI help.
- [ ] Package metadata exposes a `market-pipe` binary.

## Notes
