---
id: task-0003
title: "Phase 1: add local Postgres and bootstrap SQL"
type: task
status: ready
assigned_to: "worker"
created_by: human
created_on: 2026-07-02
updated_on: 2026-07-02
priority: normal
parent: ""
depends_on: ["task-0001", "task-0002"]
---

# Task

## Context

Phase 1 plan: `docs/phases/phase-01-project-skeleton.md`.

This task creates the local Postgres path and the first source-owned raw table.

## Goal

Add Docker Compose local Postgres plus idempotent raw SQL bootstrap for `coingecko.raw_coingecko__coins_list`.

## Scope

- `compose.yaml` for local Postgres.
- Compose reads the same `.env.local` values used by the app.
- Idempotent raw SQL bootstrap file.
- `db bootstrap` command execution path.
- Source-owned schema: `coingecko`.
- Raw table: `coingecko.raw_coingecko__coins_list`.
- Raw API table columns:
  - `id`
  - `endpoint`
  - `payload_jsonb`
  - `created_at`
  - `updated_at`
  - `deleted_at`

## Planner Notes

- Bootstrap must be safe to rerun.
- Use raw SQL, not migration tooling.
- `deleted_at` is reserved only; do not add deletion commands.
- JSON unpacking belongs in dbt staging later, not raw ingestion.

## Implementation Plan

1. Add Compose service for local Postgres.
2. Add bootstrap SQL with `CREATE SCHEMA IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`.
3. Implement `db bootstrap` using the configured database URL.
4. Add an integration check against local Postgres.

## Acceptance Criteria

- [ ] Local Postgres can start with Docker Compose from `compose.yaml`.
- [ ] `npm run market-pipe -- db bootstrap` creates `coingecko.raw_coingecko__coins_list`.
- [ ] Re-running `npm run market-pipe -- db bootstrap` is safe.
- [ ] `db bootstrap` validates database config and fails clearly when missing.

## Notes
