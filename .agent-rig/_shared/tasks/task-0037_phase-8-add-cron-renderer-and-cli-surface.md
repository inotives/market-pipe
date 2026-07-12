---
id: task-0037
title: "Phase 8: add cron renderer and CLI surface"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-12
updated_on: 2026-07-12
priority: normal
parent: ""
depends_on:
  - task-0036
message: "Reviewed: cron renderer CLI and deterministic output pass, and late
  daily transform wraparound now fails explicitly with regression coverage."
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

- [x] `market-pipe schedule cron render --bin <path> --output <path>` writes a cron artifact.
- [x] Optional `--env-file` and `--log-dir` flags are supported in rendered commands.
- [x] One cron line is rendered per scheduled config item.
- [x] `manual` items are omitted.
- [x] Hourly and daily transform jobs are rendered at the derived `+10 minute` offsets.
- [x] Invalid schedule metadata fails render with a non-zero exit.
- [x] Renderer output is deterministic.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.

## Notes

- Reviewer return 2026-07-12:
  - `src/schedule/renderer.ts` derives the daily transform job with `(latest + 10) % 1440`, which wraps a late source like `23:55` to `00:05`. Repro: `renderCronArtifact()` with one daily source at `23:55:00` renders `transform run` before the source line. That violates the intended "`+10 minutes after the latest source job`" behavior for late-day schedules. Add a failing test for the wraparound case and decide the contract explicitly instead of silently wrapping.
- Reviewer fix 2026-07-12:
  - Decided the contract explicitly: daily transform render now fails if the latest daily source is later than `23:50:00` UTC, because a five-field cron entry cannot run `+10 minutes after` without crossing into the next day.
  - Added a regression test in `tests/schedule.test.js` for a `23:55:00` daily source and updated `src/schedule/renderer.ts` to throw `daily transform cron cannot be scheduled +10 minutes after a source later than 23:50 UTC`.
- Added root command registration in `src/schedule/cli.ts` and `src/cli.ts` for `market-pipe schedule cron render`.
- Added `src/schedule/renderer.ts` to gather schedulable config items from registered feature loaders, render plain five-field cron lines, prepend `CRON_TZ=UTC`, and derive hourly/daily `transform run` jobs at `+10 minutes`.
- Kept the feature seam small by adding optional `loadConfig` hooks to config-backed features; the renderer scans those loaders generically instead of branching on feature names.
- Enforced renderer-only validation for five-field cron compatibility by failing daily schedules with non-zero seconds.
- Added coverage in `tests/cli.test.js` and `tests/schedule.test.js` for artifact writing, deterministic ordering, `manual` omission, invalid schedule failure, and derived transform timing.
- Verification:
  - `npm run build --silent`
  - `node --test tests/schedule.test.js`
  - `npm run typecheck`
  - `npm test`
