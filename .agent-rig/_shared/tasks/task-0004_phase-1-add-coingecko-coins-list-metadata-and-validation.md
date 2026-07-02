---
id: task-0004
title: "Phase 1: add CoinGecko coins_list metadata and validation"
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

This task creates the first CoinGecko source module shape without implementing live ingestion.

## Goal

Add `coins_list` endpoint metadata and raw validation under `src/features/coingecko/`.

## Scope

- Source module code path: `src/features/coingecko/`.
- Files:
  - `cli.ts`
  - `runner.ts`
  - `schemas.ts`
  - `feature.ts`
  - `config.yaml`
- Phase 1 `config.yaml` includes only `coins_list`.
- No disabled placeholder endpoint configs.
- `coins_list` metadata:
  - `entity: coins_list`
  - `endpoint: /coins/list`
  - `table: coingecko.raw_coingecko__coins_list`
  - `idField: id`
- Validation requires `id`, `symbol`, and `name`.
- Validation allows extra fields and preserves the full payload.

## Planner Notes

- `entity` is the internal CLI/table identifier.
- `endpoint` is the upstream API path, not the full URL.
- Base URL stays in provider/config code.
- Raw validation gates only the minimum endpoint contract needed for identity and safe storage.
- Do not add a generic expression language for endpoint IDs.

## Implementation Plan

1. Add CoinGecko feature folder and module files.
2. Add YAML config loading for `coins_list`.
3. Add schema validation for `coins_list` payload rows.
4. Add tests for metadata loading and validation.

## Acceptance Criteria

- [ ] `src/features/coingecko/config.yaml` contains only `coins_list`.
- [ ] `coins_list` metadata documents and tests its `idField`.
- [ ] `coins_list` validation accepts `id`, `symbol`, `name`, plus extra fields.
- [ ] Invalid rows missing identity fields fail validation.
- [ ] No future CoinGecko endpoints are stubbed.

## Notes
