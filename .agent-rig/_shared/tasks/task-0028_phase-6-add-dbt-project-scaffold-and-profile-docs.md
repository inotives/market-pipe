---
id: task-0028
title: "Phase 6: add dbt project scaffold and profile docs"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-10
priority: normal
parent: ""
depends_on: []
---




# Task

## Context

Phase 6 plan: `docs/phases/phase-06-dbt-transforms.md`.

Phase 6 proves the dbt transform contract with a CoinGecko-only first slice. Direct `dbt` commands are first-class; `market-pipe transform ...` helpers come later.

## Goal

Create the minimal `transforms/` dbt project scaffold and document the external dbt runtime expectation.

## Scope

- Add `transforms/dbt_project.yml`.
- Configure the project name/profile for `market_pipe`.
- Configure model paths for staging and marts.
- Configure models as views by default.
- Add `.gitignore` coverage for project-local dbt runtime artifacts, including `transforms/.dbt/`, `transforms/target/`, and `transforms/dbt_packages/`.
- Document local dbt installation guidance for `dbt-postgres`.
- Do not add dbt as an npm dependency.

## Planner Notes

- `dbt` is an external CLI dependency.
- Direct commands should work later as:
  - `dbt run --project-dir transforms --profiles-dir transforms/.dbt`
  - `dbt test --project-dir transforms --profiles-dir transforms/.dbt`
- Keep this task scaffold-only; no models yet.

## Implementation Plan

1. Add the dbt project skeleton under `transforms/`.
2. Add ignored dbt runtime directories.
3. Add README or Phase 6 docs for installing `dbt-postgres`.
4. Add any lightweight tests that can validate file presence/config without requiring installed dbt.

## Acceptance Criteria

- [ ] `transforms/dbt_project.yml` exists.
- [ ] The dbt project is named/profiled for `market_pipe`.
- [ ] Staging and marts model paths are configured.
- [ ] Models default to `view` materialization.
- [ ] dbt runtime artifacts are gitignored.
- [ ] Docs state that dbt is external and recommend `dbt-postgres`.
- [ ] No dbt npm dependency is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
