# Phase 8 - Generated Host Cron

## Purpose

Add real host-cron support without adding an in-app scheduler.

This phase turns feature schedule metadata into installable cron artifacts. `coingecko` is the seeded use case, but the contract is generic: any feature becomes schedulable once its config includes valid schedule metadata plus the exact CLI args needed to run that unit.

Production proof should match the production model. Development may happen on macOS, but Linux cron behavior is verified through an opt-in Docker smoke path.

## Scope

- Add a cron-rendering CLI surface:
  - `market-pipe schedule cron render --bin <absolute-market-pipe-path> --output <path>`
- Optional render flags:
  - `--env-file <path>`
  - `--log-dir <path>`
- Scan all registered features with `config.yaml`.
- Collect schedulable config items from feature metadata.
- Render one cron line per scheduled config item.
- Keep output deterministic by sorting on cadence, time, feature, and entity.
- Extend the schedule contract for schedulable config items:
  - keep `type: hourly | daily | manual`
  - keep `minute` for hourly schedules
  - keep `timeUtc` for daily schedules
  - add `cliArgs: string[]`
- Seed `coingecko` with runnable cron metadata.
- Automatically include future features if they provide valid schedule metadata plus runnable `cliArgs`.
- Render separate transform cron jobs:
  - one hourly `market-pipe transform run`
  - one daily `market-pipe transform run`
- Set transform cron times to `+10 minutes` after the latest source job for that cadence.
- Commit operator-facing cron artifacts under `ops/cron/`.
- Document render, inspect, and install flow with `crontab`.
- Add an opt-in Linux Docker smoke path for cron proof from macOS development.

## Schedule Contract

The scheduler stays outside the app process. Feature configs describe when a unit should run and exactly how to invoke it.

Rules:

- `manual` items are excluded from generated cron.
- Any non-`manual` item must provide enough data to form a valid command.
- Generated source jobs use:
  - `market-pipe <feature> run ...`
- Generated transform jobs use:
  - `market-pipe transform run`
- Cron syntax stays plain five-field cron for portability.
- Cron runs in UTC.

`coingecko` works immediately because its scheduled units are already self-contained once `cliArgs` is added. Other features are included only when their config fully describes the runnable command. This avoids feature-specific scheduler code for partial configs such as file-driven or project-driven commands.

## Out Of Scope

- In-app scheduler runtime.
- `node-cron`, `bree`, or other long-running scheduler packages.
- Crontab auto-install or mutation commands.
- systemd timer generation.
- Wrapper scripts unless env or log handling proves they are required.
- Waiting on real wall-clock cron execution in tests.
- Expanding dbt chaining into source `run --transform` commands.

## Acceptance Signals

- `market-pipe schedule cron render` writes a deterministic cron artifact from current feature configs.
- Scheduled `coingecko` items render one cron line per scheduled entity.
- `manual` schedule items are omitted from the artifact.
- Invalid schedule metadata fails render with a non-zero exit.
- Hourly and daily `market-pipe transform run` entries render at the derived `+10 minute` offsets.
- The checked-in example cron artifact under `ops/cron/` matches the current schedule contract.
- `npm run typecheck` passes.
- `npm test` passes.
- An opt-in Docker smoke test proves Linux cron acceptance by:
  - rendering the artifact locally
  - installing it inside a Linux container with cron available
  - verifying the installed cron lines
  - running representative rendered commands inside the same container

## Open Decisions

- None for implementation.
