---
id: task-0024
title: "Phase 5: add Agent Local SQLite records extraction"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-09
priority: normal
parent: ""
depends_on:
  - task-0023
---



# Task

## Context

Phase 5 plan: `docs/phases/phase-05-agent-local-datastore.md`.

The SQLite source contract is the canonical `agent-pipe` `records` table, not arbitrary natural tables.

## Goal

Read and validate `records` rows from a configured Agent Local SQLite database.

## Scope

- Use native `node:sqlite`.
- Read only the SQLite `records` table.
- Support project filtering by `records.project_id`.
- Support optional entity filtering by `records.entity`.
- Trust `records.id` as the warehouse raw ID.
- Parse `payload_json` and nullable `metadata_json`.
- Preserve `created_at`, `updated_at`, and `deleted_at` as local lifecycle timestamps.
- Detect duplicate `records.id` values within a run before any DB writes.

## Planner Notes

- Required row fields: `id`, `project_id`, `entity`, `local_id`, and `payload_json`.
- `--entity` with no matching rows should fail clearly.
- Missing SQLite file, missing `records` table, invalid JSON, and missing required fields should fail before Postgres is touched.

## Implementation Plan

1. Add `runner.ts` or equivalent extraction module under `src/features/agent_local/`.
2. Implement `extractAgentLocalRows(projectId, options)` around `node:sqlite`.
3. Map SQLite text JSON into typed raw row objects with parsed `payload` and `metadata`.
4. Add duplicate ID validation.
5. Add deterministic temporary SQLite fixture tests.

## Acceptance Criteria

- [ ] Missing SQLite file fails clearly.
- [ ] Missing `records` table fails clearly.
- [ ] Missing required fields fail with useful row context.
- [ ] Invalid `payload_json` or `metadata_json` fails clearly.
- [ ] Duplicate `records.id` fails before DB writes.
- [ ] Project filtering reads only matching `records.project_id`.
- [ ] Entity filtering reads only matching `records.entity`.
- [ ] `records.id` is preserved exactly as the extracted raw ID.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
- Reviewer: accepted on 2026-07-09. SQLite extraction, validation failures, project/entity filtering, duplicate detection, `npm run typecheck`, and `npm test` all verified locally.
