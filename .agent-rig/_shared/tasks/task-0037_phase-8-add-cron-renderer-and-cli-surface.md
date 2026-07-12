---
id: task-0037
title: "Phase 8: add cron renderer and CLI surface"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-12
updated_on: 2026-07-12
priority: normal
parent: ""
depends_on:
  - task-0036
---

# Task

## Context

Phase 8 plan: `docs/phases/phase-08-generated-host-cron.md`.

After the config contract exists, the repo needs a deterministic cron renderer plus a small CLI entrypoint that operators and later tests can call directly.

## Goal

Implement `market-pipe schedule cron render` and the deterministic cron rendering logic.

## Scope

- Add the CLI surface:
  - `market-pipe schedule cron render --bin <absolute-market-pipe-path> --output <path>`
- Support optional render flags:
  - `--env-file <path>`
  - `--log-dir <path>`
- Scan registered features and read schedulable config metadata.
- Render one cron line per scheduled config item.
- Sort output deterministically by cadence, time, feature, and entity.
- Render separate transform jobs:
  - one hourly `market-pipe transform run`
  - one daily `market-pipe transform run`
- Set transform cron times to `+10 minutes` after the latest source job for that cadence.
- Fail clearly on invalid schedule metadata.
- Add unit coverage for render ordering, omission of `manual` items, invalid schedule failure, and transform timing.
- Do not add committed example cron artifacts or operator docs in this task.
- Do not add Docker smoke proof in this task.

## Planner Notes

- Cron syntax must stay plain five-field cron.
- Cron commands should use the provided `--bin` path, not `npm run ...`.
- Keep scheduling outside the app process; this is a renderer, not a daemon.
- Prefer simple shared renderer logic over feature-specific branching.

## Implementation Plan

1. Add scheduler command registration under the root CLI.
2. Implement a small renderer that gathers scheduled items from feature configs.
3. Derive transform cron entries from the rendered source schedule.
4. Write the cron artifact to the requested output path.
5. Add focused unit tests for ordering, validation, omission, and derived transform jobs.
6. Run typecheck and tests.

## Acceptance Criteria

- [ ] `market-pipe schedule cron render --bin <path> --output <path>` writes a cron artifact.
- [ ] Optional `--env-file` and `--log-dir` flags are supported in rendered commands.
- [ ] One cron line is rendered per scheduled config item.
- [ ] `manual` items are omitted.
- [ ] Hourly and daily transform jobs are rendered at the derived `+10 minute` offsets.
- [ ] Invalid schedule metadata fails render with a non-zero exit.
- [ ] Renderer output is deterministic.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

