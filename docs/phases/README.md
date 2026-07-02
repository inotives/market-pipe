# Market Pipe Phase Plan

This directory holds the high-level project plan for `market-pipe`.

The phase docs are not worker tickets. They define project sequencing, scope boundaries, open decisions, and acceptance signals. After a phase is agreed, implementation work should be split into AgentRig tasks under `.agent-rig/_shared/tasks/`.

## Phase Sequence

1. [Project Skeleton](phase-01-project-skeleton.md)
2. [CoinGecko](phase-02-coingecko.md)
3. [dbt Transforms](phase-03-dbt-transforms.md)
4. [Custom CSV](phase-04-custom-csv.md)
5. [Alpha Vantage](phase-05-alpha-vantage.md)
6. [Production Scheduling](phase-06-production-scheduling.md)

## Planning Rules

- Keep the CLI as the main product surface.
- Use `market-pipe ...` as the canonical user-facing command; use `npm run market-pipe -- ...` only for local development before package installation.
- Preserve raw data before transforms in source-owned schemas and raw tables.
- Prefer source-specific modules over a generic provider framework.
- Add shared code only after at least two features need it.
- Keep orchestration outside the app: systemd, cron, n8n, GitHub Actions, and agents should all call the same CLI commands.

## Not Yet

Do not plan these until repeated pain justifies them:

- Backfill framework.
- Web dashboard.
- Source dependency graph.
- Alerting service.
- Queue workers.
- Provider abstraction layer.
- YAML-defined sources.
- Incremental dbt models.
- Historical schema registry.

## Ready For Task Breakdown

A phase is ready for AgentRig task creation when:

- Goals and non-goals are clear.
- CLI commands and data boundaries are named.
- Acceptance criteria are testable.
- Open decisions are either answered or explicitly deferred.
