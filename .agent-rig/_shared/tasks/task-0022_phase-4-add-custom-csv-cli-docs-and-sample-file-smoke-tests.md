---
id: task-0022
title: "Phase 4: add Custom CSV CLI docs and sample-file smoke tests"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0021
---

# Task

## Context

Phase 4 plan: `docs/phases/phase-04-custom-csv.md`.

This task closes Phase 4 by exposing Custom CSV ingestion through the CLI and documenting it.

## Goal

Add `market-pipe custom-csv run`, README/docs updates, and default sample-file smoke tests.

## Scope

- Add CLI command: `market-pipe custom-csv run`.
- Require `--entity`.
- Require `--file`.
- Support only local filesystem paths.
- Do not infer default files from `data/csv`.
- Add default tests using deterministic temporary CSV fixture files.
- Update README with commands and behavior.

## Planner Notes

- Remote CSV URLs are out of scope.
- Downloaded public CSV files under `data/csv` are local test/demo inputs and should not be committed or packaged as required runtime assets.
- CSV fixture smoke tests should run by default because they do not hit paid APIs or networks.

## Implementation Plan

1. Add Custom CSV CLI registration.
2. Wire `--entity` and `--file` validation.
3. Add CLI tests for missing flags and sample ingestion commands.
4. Add README usage docs for all four configured sample entities.
5. Run typecheck, default tests, and DB-backed tests when Postgres is available.

## Acceptance Criteria

- [ ] `market-pipe custom-csv run --entity <entity> --file <path>` is registered.
- [ ] Missing `--entity` fails clearly.
- [ ] Missing `--file` fails clearly.
- [ ] Remote URLs are rejected or unsupported clearly.
- [ ] CSV fixture ingestion tests run by default.
- [ ] README documents Custom CSV setup, entities, commands, and idempotence behavior.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
