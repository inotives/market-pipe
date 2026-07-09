---
id: task-0031
title: "Phase 6: add transform profile and CLI helpers"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-09
priority: normal
parent: ""
depends_on:
  - task-0030
---

# Task

## Context

Phase 6 plan: `docs/phases/phase-06-dbt-transforms.md`.

Direct dbt commands remain first-class. `market-pipe transform ...` exists only as thin convenience glue.

## Goal

Add project-local dbt profile generation and thin transform CLI helpers.

## Scope

- Add `market-pipe transform profile`.
- Add `market-pipe transform run`.
- Add `market-pipe transform test`.
- Generate `transforms/.dbt/profiles.yml` from `MARKET_PIPE__DATABASE_URL`.
- Shell out to:
  - `dbt run --project-dir transforms --profiles-dir transforms/.dbt`
  - `dbt test --project-dir transforms --profiles-dir transforms/.dbt`
- Fail clearly when `MARKET_PIPE__DATABASE_URL` is missing.
- Fail clearly when `dbt` is missing.
- Do not auto-install dbt or Python packages.
- Do not expose dbt pass-through flags in Phase 6.

## Planner Notes

- Keep the helper small. If it starts becoming a dbt abstraction layer, it is too much.
- The generated profile is project-local and ignored by git.
- Use existing config/env conventions.

## Implementation Plan

1. Add transform feature registration and CLI.
2. Add profile-generation helper that parses `MARKET_PIPE__DATABASE_URL` into a dbt Postgres profile.
3. Add child-process wrapper for `dbt run` and `dbt test`.
4. Add tests for profile content, missing DB config, missing dbt, and command arguments.
5. Update README command examples.

## Acceptance Criteria

- [ ] `market-pipe transform profile` writes `transforms/.dbt/profiles.yml`.
- [ ] Generated profile uses `MARKET_PIPE__DATABASE_URL`.
- [ ] `market-pipe transform run` invokes `dbt run` with project-local dirs.
- [ ] `market-pipe transform test` invokes `dbt test` with project-local dirs.
- [ ] Missing database config fails clearly.
- [ ] Missing dbt executable fails clearly with install guidance.
- [ ] No dbt npm dependency is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes

