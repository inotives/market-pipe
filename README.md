<p align="center">
  <img src="logo.png" alt="market-pipe logo" width="220">
</p>

<h1 align="center">market-pipe</h1>

<p align="center">
  CLI-first market data ingestion for Postgres.
</p>

<p align="center">
  <a href="License.md"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-white?style=for-the-badge&labelColor=000000"></a>
  <a href="docs/project_specs.md"><img alt="Status: planning" src="https://img.shields.io/badge/status-planning-white?style=for-the-badge&labelColor=000000"></a>
  <img alt="Runtime: TypeScript CLI" src="https://img.shields.io/badge/runtime-typescript%20cli-white?style=for-the-badge&labelColor=000000">
  <img alt="Database: Postgres" src="https://img.shields.io/badge/database-postgres-white?style=for-the-badge&labelColor=000000">
</p>

<p align="center">
  <a href="docs/project_specs.md">Spec</a>
  ·
  <a href="docs/phases/README.md">Phase Plan</a>
  ·
  <a href="docs/adr/">ADRs</a>
  ·
  <a href=".agent-rig/_shared/tasks/">Worker Tasks</a>
</p>

## What It Is

`market-pipe` is a TypeScript CLI for ingesting market data into Postgres.

The project keeps the CLI as the primary product surface so humans, agents, systemd, cron, n8n, GitHub Actions, and other orchestrators can all run the same commands.

Current status: planning and Phase 1 scaffolding.

## Core Model

Raw API data lands in source-owned schemas and tables, not one generic raw table.

Phase 1 starts with CoinGecko `coins_list`:

```text
coingecko.raw_coingecko__coins_list
```

Raw API tables use this contract:

```text
id
endpoint
payload_jsonb
created_at
updated_at
deleted_at
```

For `coins_list`, `id` is the CoinGecko coin ID. Daily runs update the same row for that ID and replace `payload_jsonb`. If an asset disappears from the API, `updated_at` stops changing; `deleted_at` is reserved for an explicit user decision.

JSON unpacking belongs in dbt staging later, not raw ingestion.

## Dependencies

Phase 1 targets:

- Node.js 22 LTS
- npm
- TypeScript
- Postgres
- Docker Compose for local Postgres
- `commander` for CLI parsing
- `yaml` for source config
- Node's built-in test runner

## Install and First Run

This section describes the planned Phase 1 local flow.

Install dependencies:

```bash
npm install
```

Copy local config:

```bash
cp .env.example .env.local
```

Fill in `MARKET_PIPE__COINGECKO_API_KEY` in `.env.local`.

Start local Postgres:

```bash
docker compose up -d
```

Bootstrap raw tables:

```bash
npm run market-pipe -- db bootstrap
```

Run config checks:

```bash
npm run market-pipe -- config check --for db
npm run market-pipe -- config check --for coingecko
```

Run the first ingestion slice:

```bash
npm run market-pipe -- coingecko run --entity coins_list
```

After npm package installation, the canonical command shape is:

```bash
market-pipe coingecko run --entity coins_list
```

## Configuration

Environment variables use the `MARKET_PIPE__*` prefix to avoid collisions.

Important Phase 1 variables:

```bash
MARKET_PIPE__DATABASE_URL=postgres://market_pipe:market_pipe@localhost:5432/market_pipe
MARKET_PIPE__COINGECKO_API_KEY=
```

Database config resolves in this order:

1. `MARKET_PIPE__DATABASE_URL`
2. Otherwise, the split `MARKET_PIPE__POSTGRES_*` fields from `.env.local`

Installed npm users can provide config through shell env vars, systemd, Docker, or CI secrets.

## Common Commands

Local development commands use npm's `--` argument separator:

```bash
npm run market-pipe -- --help
npm run market-pipe -- config check --for db
npm run market-pipe -- config check --for coingecko
npm run market-pipe -- db bootstrap
npm run market-pipe -- coingecko run --entity coins_list
```

Installed package commands omit the npm wrapper:

```bash
market-pipe --help
market-pipe config check --for db
market-pipe config check --for coingecko
market-pipe db bootstrap
market-pipe coingecko run --entity coins_list
```

## Phase Plan

1. Project Skeleton
2. CoinGecko
3. dbt Transforms
4. Custom CSV
5. Alpha Vantage
6. Production Scheduling

See [docs/phases/README.md](docs/phases/README.md).

## Development

Phase 1 checks are planned as:

```bash
npm test
npm run typecheck
```

Tests should use deterministic fixtures or mocks by default. Live CoinGecko smoke runs are opt-in and require `MARKET_PIPE__COINGECKO_API_KEY`.

## Repository Layout

```text
market-pipe/
├── docs/
│   ├── adr/
│   ├── phases/
│   └── project_specs.md
├── src/
│   └── features/
│       └── coingecko/
├── sql/
├── tests/
├── compose.yaml
├── .env.example
├── License.md
└── README.md
```

Some implementation paths are planned and may not exist until Phase 1 tasks are completed.

## License

MIT. See [License.md](License.md).
