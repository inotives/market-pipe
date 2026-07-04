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

Current status: Phase 4 Custom CSV ingestion is implemented alongside Phase 3 Alpha Vantage and Phase 2 CoinGecko ingestion.

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

This section describes the current local flow through Phase 4.

Install dependencies:

```bash
npm install
```

Copy local config:

```bash
cp .env.example .env.local
cp .env.local .env
```

Fill in `MARKET_PIPE__COINGECKO_API_KEY` and `MARKET_PIPE__ALPHAVANTAGE_API_KEY` in `.env.local`.

Start local Postgres:

```bash
npm run postgres:start
```

Bootstrap raw tables:

```bash
npm run market-pipe -- db bootstrap
```

Run config checks:

```bash
npm run market-pipe -- config check --for db
npm run market-pipe -- config check --for coingecko
npm run market-pipe -- config check --for alphavantage
```

Custom CSV does not require an API key. It uses explicit local files passed with `--file`.

Run tests:

```bash
npm test
npm run typecheck
```

Run the basic ingestion slice:

```bash
npm run market-pipe -- coingecko run --entity coins_list
```

Run Phase 2 simple entities:

```bash
npm run market-pipe -- coingecko run --entity asset_platforms_list
npm run market-pipe -- coingecko run --entity trending_search
npm run market-pipe -- coingecko run --entity crypto_global
npm run market-pipe -- coingecko run --entity derivatives_exchanges
npm run market-pipe -- coingecko run --entity exchanges
npm run market-pipe -- coingecko run --entity coins_categories
```

Run parameterized entities:

```bash
npm run market-pipe -- coingecko run --entity coins_id_history --id bitcoin --date 01-07-2026
npm run market-pipe -- coingecko run --entity coins_id_ohlc --id bitcoin --vs-currency usd --days 30
```

Pagination is supported only for `exchanges` and `derivatives_exchanges`. Override the defaults only when needed:

```bash
npm run market-pipe -- coingecko run --entity exchanges --page-limit 2 --per-page 250
```

After npm package installation, the canonical command shape is:

```bash
market-pipe coingecko run --entity coins_list
market-pipe coingecko run --entity coins_id_history --id bitcoin --date 01-07-2026
market-pipe coingecko run --entity exchanges --page-limit 2 --per-page 250
market-pipe alphavantage run --symbol MSFT
market-pipe alphavantage run
market-pipe custom-csv run --entity PPIACO --file data/csv/PPIACO.csv
```

## Configuration

Environment variables use the `MARKET_PIPE__*` prefix to avoid collisions.

Important Phase 1 variables:

```bash
MARKET_PIPE__DATABASE_URL=postgres://market_pipe:market_pipe@localhost:5432/market_pipe
MARKET_PIPE__COINGECKO_API_KEY=
MARKET_PIPE__ALPHAVANTAGE_API_KEY=
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
npm run market-pipe -- config check --for alphavantage
npm run market-pipe -- db bootstrap
npm run market-pipe -- coingecko run --entity coins_list
npm run market-pipe -- alphavantage run --symbol MSFT
npm run market-pipe -- custom-csv run --entity PPIACO --file data/csv/PPIACO.csv
```

Installed package commands omit the npm wrapper:

```bash
market-pipe --help
market-pipe config check --for db
market-pipe config check --for coingecko
market-pipe config check --for alphavantage
market-pipe db bootstrap
market-pipe coingecko run --entity coins_list
market-pipe alphavantage run --symbol MSFT
market-pipe custom-csv run --entity PPIACO --file data/csv/PPIACO.csv
```

## Custom CSV

Phase 4 adds four configured local-file entities:

- `CORESTICKM159SFRBATL`
- `PPIACO`
- `bitcoin_historical_ohlcv`
- `ethereum_historical_ohlcv`

Run them through the CLI with explicit local paths:

```bash
npm run market-pipe -- custom-csv run --entity CORESTICKM159SFRBATL --file data/csv/CORESTICKM159SFRBATL.csv
npm run market-pipe -- custom-csv run --entity PPIACO --file data/csv/PPIACO.csv
npm run market-pipe -- custom-csv run --entity bitcoin_historical_ohlcv --file data/csv/bitcoin-historical-ohlcv.csv
npm run market-pipe -- custom-csv run --entity ethereum_historical_ohlcv --file data/csv/ethereum-historical-ohlcv.csv
```

Installed package form:

```bash
market-pipe custom-csv run --entity CORESTICKM159SFRBATL --file data/csv/CORESTICKM159SFRBATL.csv
market-pipe custom-csv run --entity PPIACO --file data/csv/PPIACO.csv
market-pipe custom-csv run --entity bitcoin_historical_ohlcv --file data/csv/bitcoin-historical-ohlcv.csv
market-pipe custom-csv run --entity ethereum_historical_ohlcv --file data/csv/ethereum-historical-ohlcv.csv
```

Behavior notes:

- `--entity` is required.
- `--file` is required.
- Only local filesystem paths are supported; remote URLs are rejected.
- `custom_csv` row ids are stable by configured `idFields`, not by file path.
- Re-running the same file or a moved file updates the same raw row ids instead of duplicating them.

## Phase Plan

1. Project Skeleton
2. CoinGecko
3. Alpha Vantage
4. Custom CSV
5. dbt Transforms
6. Production Scheduling

See [docs/phases/README.md](docs/phases/README.md).

## Development

Default checks are:

```bash
npm test
npm run typecheck
```

Tests use deterministic fixtures or mocks by default. Live CoinGecko and Alpha Vantage smoke runs are opt-in and require API keys. Custom CSV fixture smoke tests run by default with temporary local files.
Use a date within the past 365 days for CoinGecko demo/public API keys when running `coins_id_history`.

Alpha Vantage Phase 3 notes:

- `alphavantage run` without `--symbol` uses the YAML symbol list: `SPCX`, `TSM`, `MSFT`, `GOOG`, `NVDA`
- the default configured run plans 5 Alpha Vantage requests
- the free-tier assumption for this phase is `quota.dailyRequestLimit: 25`
- over-quota runs fail before making API requests
- all-symbol mode waits `rateLimit.delayMs: 15000` between symbol requests

Opt-in DB-backed verification:

```bash
MARKET_PIPE__RUN_DB_TESTS=1 npm test
```

Opt-in live CoinGecko smoke:

```bash
MARKET_PIPE__RUN_LIVE_COINGECKO=1 npm test
```

Opt-in live Alpha Vantage smoke:

```bash
MARKET_PIPE__RUN_LIVE_ALPHAVANTAGE=1 npm test
```

The default live Alpha Vantage smoke symbol is `MSFT`. Override it only when needed:

```bash
MARKET_PIPE__RUN_LIVE_ALPHAVANTAGE=1 MARKET_PIPE__ALPHAVANTAGE_LIVE_SYMBOL=NVDA npm test
```

Manual one-symbol Alpha Vantage smoke:

```bash
npm run market-pipe -- alphavantage run --symbol MSFT
```

## Repository Layout

```text
market-pipe/
├── docs/
│   ├── adr/
│   ├── phases/
│   └── project_specs.md
├── src/
│   └── features/
│       ├── alphavantage/
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
