---
id: task-0039
title: "Phase 8: add Linux Docker cron smoke proof"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-12
updated_on: 2026-07-12
priority: normal
parent: ""
depends_on:
  - task-0038
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

- [ ] Default `npm test` does not require Docker.
- [ ] The opt-in Docker smoke renders the cron artifact locally and validates it under Linux.
- [ ] The smoke proves the cron file installs successfully in the container.
- [ ] The smoke verifies expected installed cron lines.
- [ ] The smoke runs representative rendered commands successfully inside the Linux container.
- [ ] Repo docs include the exact opt-in Docker smoke command.
- [ ] Task notes include one successful opt-in Docker validation run summary.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

