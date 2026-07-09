---
id: task-0025
title: "Phase 5: add Agent Local Postgres raw table upsert"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-09
priority: normal
parent: ""
depends_on:
  - task-0024
---

# Task

## Context

Phase 5 plan: `docs/phases/phase-05-agent-local-datastore.md`.

Agent Local rows land in project-owned schemas and raw tables, for example `agent_pipe.raw_local__records`.

## Goal

Create and upsert Agent Local raw records into the correct Postgres project schema/table.

## Scope

- Create schema from sanitized `projectId`.
- Create raw table named `raw_<sqlite_db_name>__records`.
- Implement idempotent upsert on `id`.
- Store:
  - `id`, `project_id`, `project_name`, `entity`, `local_id`, `source`, `sqlite_path`
  - `captured_at`, `payload_jsonb`, `metadata_jsonb`
  - `local_created_at`, `local_updated_at`, `local_deleted_at`
  - warehouse `created_at`, `updated_at`
- Preserve soft deletes by writing `local_deleted_at`; do not hard-delete Postgres rows.
- Keep per-row upserts; do not introduce a bulk-loading framework.

## Planner Notes

- Use the same `pg` dependency and simple client pattern as existing sources.
- Validate generated schema/table identifiers before interpolation.
- This task may create Agent Local tables from the runner instead of static `sql/bootstrap.sql` if that keeps dynamic project table creation smaller.

## Implementation Plan

1. Add SQL creation for project schema and raw records table.
2. Add `ingestAgentLocalRows(project, rows, connectionString)`.
3. Upsert all mirrored fields and set warehouse `updated_at = now()`.
4. Add DB-backed tests for table creation, insert, rerun idempotence, update, and soft-delete passthrough.
5. Ensure existing `db bootstrap` behavior is not broken.

## Acceptance Criteria

- [ ] `agent-pipe` + `local.sqlite` creates `agent_pipe.raw_local__records`.
- [ ] Inserted rows preserve source IDs and payload JSON.
- [ ] Rerunning the same rows does not duplicate records.
- [ ] Changed payload or metadata updates the existing row.
- [ ] `deleted_at` from SQLite is stored as `local_deleted_at`.
- [ ] Existing source raw tables still bootstrap and test successfully.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

