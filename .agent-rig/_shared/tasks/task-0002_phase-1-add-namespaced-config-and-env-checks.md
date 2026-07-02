---
id: task-0002
title: "Phase 1: add namespaced config and env checks"
type: task
status: ready
assigned_to: "worker"
created_by: human
created_on: 2026-07-02
updated_on: 2026-07-02
priority: normal
parent: ""
depends_on: ["task-0001"]
---

# Task

## Context

Phase 1 plan: `docs/phases/phase-01-project-skeleton.md`.

This task adds config loading and validation. It depends on the CLI scaffold from `task-0001`.

## Goal

Implement namespaced Market Pipe configuration loading and scoped config checks.

## Scope

- Load existing process environment first.
- Load `.env.local` from the current working directory when present.
- Use `dotenv` for local `.env.local` support.
- Use `MARKET_PIPE__*` environment variable names.
- Database config resolution:
  - `MARKET_PIPE__DATABASE_URL` wins.
  - Otherwise build from `MARKET_PIPE__POSTGRES_HOST`, `MARKET_PIPE__POSTGRES_PORT`, `MARKET_PIPE__POSTGRES_DB`, `MARKET_PIPE__POSTGRES_USER`, and `MARKET_PIPE__POSTGRES_PASSWORD`.
- CoinGecko config key: `MARKET_PIPE__COINGECKO_API_KEY`.
- `market-pipe config check --for coingecko`.
- `market-pipe config check --for db`.
- Per-command config validation hooks for later tasks.

## Planner Notes

- Installed npm users provide config through shell, systemd, Docker, or CI env vars.
- `.env.local` is local-development convenience, not the only production config mechanism.
- `config check` is diagnostic only; commands must validate their own required config.
- Do not add explicit `--env-file` support in Phase 1.

## Implementation Plan

1. Add config module.
2. Add `.env.local` loading behavior.
3. Implement scoped validation for `coingecko` and `db`.
4. Wire `config check --for <scope>` into the CLI.
5. Add focused tests for env precedence and missing-config messages.

## Acceptance Criteria

- [ ] Existing process env wins over `.env.local`.
- [ ] `.env.local` can provide local config when process env is absent.
- [ ] `npm run market-pipe -- config check --for coingecko` reports missing CoinGecko config without calling external APIs.
- [ ] `npm run market-pipe -- config check --for db` reports missing database config without opening a database connection.
- [ ] Error messages name the missing `MARKET_PIPE__*` variables.

## Notes
