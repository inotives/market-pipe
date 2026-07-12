---
id: task-0038
title: "Phase 8: add committed cron artifacts and operator docs"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-12
updated_on: 2026-07-12
priority: normal
parent: ""
depends_on:
  - task-0037
---

# Task

## Context

Phase 8 plan: `docs/phases/phase-08-generated-host-cron.md`.

Once the renderer exists, the repo needs checked-in cron artifacts and concise operator docs so the scheduling contract is visible without reverse-engineering the CLI.

## Goal

Commit the generated cron artifact shape into the repo and document how operators render, inspect, and install it.

## Scope

- Add checked-in cron artifacts under `ops/cron/`.
- Use the current `coingecko` schedule contract plus derived transform jobs as the seeded example.
- Document:
  - how to render the artifact
  - how to inspect it
  - how to install it with `crontab`
  - the expectation that cron runs in UTC
  - the expectation that the host uses an installed `market-pipe` binary path
- Update README and any operator-facing scheduling docs touched by this phase.
- Keep docs aligned with the actual CLI and artifact shape.
- Do not add Docker smoke proof in this task.

## Planner Notes

- Keep the docs operational and brief.
- Do not promise automatic crontab installation.
- The checked-in artifact should be generated from the real renderer, not hand-maintained prose masquerading as an example.

## Implementation Plan

1. Add the `ops/cron/` artifact path.
2. Generate and commit the seeded cron artifact from the current schedule.
3. Update README and related operator docs with the render/install flow.
4. Verify docs match the CLI and artifact shape.
5. Run typecheck and tests.

## Acceptance Criteria

- [ ] `ops/cron/` contains a checked-in example cron artifact.
- [ ] The committed artifact matches the current renderer contract.
- [ ] README and related operator docs explain render, inspect, and install flow with `crontab`.
- [ ] Docs state that cron runs in UTC and uses an installed `market-pipe` binary path.
- [ ] No crontab auto-install behavior is introduced.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

