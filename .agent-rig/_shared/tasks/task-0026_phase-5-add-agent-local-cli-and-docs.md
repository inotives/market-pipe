---
id: task-0026
title: "Phase 5: add Agent Local CLI and docs"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-09
updated_on: 2026-07-09
priority: normal
parent: ""
depends_on:
  - task-0025
---



# Task

## Context

Phase 5 plan: `docs/phases/phase-05-agent-local-datastore.md`.

The main user surface is the CLI.

## Goal

Expose Agent Local ingestion through `market-pipe agent-local run` and document local usage.

## Scope

- Add CLI command: `market-pipe agent-local run`.
- Support:
  - `--project <projectId>`
  - `--entity <entity>`
  - `--all`
- Require exactly one of `--project` or `--all`.
- For `--project`, sync all rows for that `records.project_id`; `--entity` narrows the run.
- For `--all`, run all configured projects.
- Add README/docs usage with the live local fixture override.
- Do not add scheduler/runtime commands.

## Planner Notes

- Local development command:
  `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH=/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite npm run market-pipe -- agent-local run --project agent-pipe`
- Unknown configured project should fail before opening SQLite.
- `--entity` is a filter, not a configured allow-list.

## Implementation Plan

1. Add `cli.ts` for `agent_local`.
2. Wire CLI flags into the runner.
3. Add CLI tests for registration, missing flags, invalid flag combinations, unknown project, and entity filtering.
4. Update README or relevant docs with setup, command examples, table naming, and idempotence behavior.
5. Run typecheck and default tests.

## Acceptance Criteria

- [ ] `market-pipe agent-local run --project agent-pipe` is registered.
- [ ] `market-pipe agent-local run --project agent-pipe --entity rates` is registered.
- [ ] `market-pipe agent-local run --all` is registered.
- [ ] Missing both `--project` and `--all` fails clearly.
- [ ] Passing both `--project` and `--all` fails clearly.
- [ ] README/docs describe `agent_pipe.raw_local__records`.
- [ ] README/docs describe `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH`.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Notes
- Reviewer: accepted on 2026-07-09. Verified CLI registration, `--project`/`--all` validation, unknown-project failure, README Agent Local usage/docs, `npm run typecheck`, and `npm test`.
