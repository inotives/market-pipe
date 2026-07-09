---
id: task-0023
title: "Phase 5: add Agent Local config and feature skeleton"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-09
priority: normal
parent: ""
depends_on: []
---



# Task

## Context

Phase 5 plan: `docs/phases/phase-05-agent-local-datastore.md`.

This phase ingests canonical `agent-pipe` SQLite `records` rows into project-owned Postgres raw tables.

## Goal

Add the Agent Local source module skeleton, portable config, feature registration, and naming helpers.

## Scope

- Add `src/features/agent_local/`.
- Add `src/features/agent_local/config.yaml` with a portable `agent-pipe` project entry.
- Add config loading and validation for `projectId`, `projectName`, and `sqlitePath`.
- Support `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH` as the local live-fixture override for the selected project.
- Add identifier helpers for schema/table naming:
  - schema = snakecase `projectId`
  - table = `raw_<sqlite_db_name>__records`
  - `local.sqlite` -> `raw_local__records`
- Register the source feature in the existing feature index/build flow.
- Do not add a SQLite npm dependency.

## Planner Notes

- Use native `node:sqlite` in later tasks; this task only establishes module/config shape.
- Avoid quoted Postgres identifiers. Lowercase, replace non-alphanumeric characters with `_`, and collapse repeated underscores.
- Do not add entity lists or `idFields`; entities come from `records.entity`.

## Implementation Plan

1. Add `feature.ts` and `config.yaml` for `agent_local`.
2. Add `loadAgentLocalConfig`, project lookup, env override handling, and naming helpers.
3. Register `agentLocalFeature` with the existing feature registry.
4. Update package build copying so `agent_local/config.yaml` lands in `dist`.
5. Add focused tests for config validation, env override, and naming helpers.

## Acceptance Criteria

- [ ] `agent_local` feature is registered.
- [ ] Config contains a portable `agent-pipe` project entry.
- [ ] `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH` overrides the configured SQLite path.
- [ ] `agent-pipe` sanitizes to `agent_pipe`.
- [ ] `.agent-pipe/data/local.sqlite` maps to `raw_local__records`.
- [ ] No SQLite npm package is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
- Reviewer: accepted on 2026-07-09. Feature registration, config portability, env override, naming helpers, `npm run typecheck`, and `npm test` all verified locally.
