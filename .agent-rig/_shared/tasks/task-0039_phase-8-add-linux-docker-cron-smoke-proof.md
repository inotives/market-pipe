---
id: task-0039
title: "Phase 8: add Linux Docker cron smoke proof"
type: task
status: done
assigned_to: worker
created_by: human
created_on: 2026-07-12
updated_on: 2026-07-12
priority: normal
parent: ""
depends_on:
  - task-0038
message: "Reviewed: default tests stay Docker-free, and the opt-in Linux Docker
  cron smoke renders, installs, verifies, and executes representative commands
  successfully."
---




# Task

## Context

Phase 8 plan: `docs/phases/phase-08-generated-host-cron.md`.

The production scheduler model is Linux cron, but development is happening on macOS. The repo needs an opt-in Linux proof path that validates the generated artifact under Linux cron assumptions without waiting for wall-clock execution.

## Goal

Add an opt-in Docker-based Linux smoke test for cron artifact installation and representative command execution.

## Scope

- Add an opt-in smoke path that uses Docker as the Linux truth source.
- Use a Linux image with Node 22 and cron available.
- Render the cron artifact locally as part of the smoke flow.
- Install the rendered artifact inside the Linux container.
- Verify the installed cron lines are present as expected.
- Run one or more representative rendered commands inside the same container to prove the artifact assumptions match the Linux runtime.
- Keep the smoke opt-in so default tests still run without Docker.
- Document the exact opt-in command in the repo and record one successful run in task notes.
- Do not wait for real scheduled wall-clock execution.

## Planner Notes

- The main proof is artifact acceptance plus command viability under Linux, not an hour-long live cron wait.
- Keep the smoke path boring and easy to rerun from macOS.
- If Docker is unavailable, default tests must still pass cleanly.

## Implementation Plan

1. Add a Docker-backed smoke command or test helper gated behind an explicit env var.
2. Install cron inside the test container and copy in the rendered artifact.
3. Verify cron accepts the artifact and that expected lines are installed.
4. Run representative rendered commands in-container.
5. Update docs with the opt-in Linux proof command.
6. Run typecheck, tests, and one successful opt-in Docker smoke; append the command/result summary to task notes.

## Acceptance Criteria

- [x] Default `npm test` does not require Docker.
- [x] The opt-in Docker smoke renders the cron artifact locally and validates it under Linux.
- [x] The smoke proves the cron file installs successfully in the container.
- [x] The smoke verifies expected installed cron lines.
- [x] The smoke runs representative rendered commands successfully inside the Linux container.
- [x] Repo docs include the exact opt-in Docker smoke command.
- [x] Task notes include one successful opt-in Docker validation run summary.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.

## Notes

- Added `tests/docker-cron-smoke.test.js` with an opt-in gate at `MARKET_PIPE__RUN_DOCKER_CRON_SMOKE=1`.
- The smoke flow:
  - renders the cron artifact locally from `dist/cli.js`
  - mounts the rendered file plus a stub absolute `market-pipe` binary into a Linux `node:22-bookworm` container
  - installs `cron` in-container
  - installs the rendered file with `crontab`
  - verifies expected installed cron lines
  - executes representative rendered commands extracted from the cron file itself
- Updated `README.md` and `docs/phases/phase-08-generated-host-cron.md` with the exact opt-in Docker smoke command.
- Successful opt-in Docker validation run:
  - command: `MARKET_PIPE__RUN_DOCKER_CRON_SMOKE=1 npm test`
  - result: `opt-in Docker cron smoke renders, installs, verifies, and executes representative cron commands under Linux` passed in `47757.839833ms`
  - suite summary: `tests 112`, `pass 96`, `fail 0`, `skipped 16`
- Verification:
  - `npm run typecheck`
  - `npm test`
  - `MARKET_PIPE__RUN_DOCKER_CRON_SMOKE=1 npm test`
