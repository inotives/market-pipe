<p align="center">
  <img src="logo.png" alt="market-pipe logo" width="220">
</p>

<h1 align="center">market-pipe</h1>

<p align="center">
  CLI-first market data ingestion for Postgres.
</p>

<p align="center">
  <a href="License.md"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-white?style=for-the-badge&labelColor=000000"></a>
  <a href="docs/project_specs.md"><img alt="Status: active" src="https://img.shields.io/badge/status-active-white?style=for-the-badge&labelColor=000000"></a>
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

Implemented sources currently include CoinGecko, Alpha Vantage, Custom CSV, and Agent Local.

## Core Model

Raw data lands in source-owned schemas and tables, not one generic raw table.

Examples:

```text
coingecko.raw_coingecko__coins_list
alphavantage.raw_alphavantage__daily_stock_ohlcv
custom_csv.raw_custom_csv__economic_time_series
custom_csv.raw_custom_csv__crypto_ohlcv
agent_pipe.raw_local__records
```

API raw tables use this contract:

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

## Install and First Run

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

For Agent Local live testing, also set `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH` to the local `agent-pipe` datastore path.

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

Agent Local does not require an API key. It reads a configured SQLite `records` table and can use `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH` to point at a live local datastore.

Run tests:

```bash
npm test
npm run typecheck
```

Run CoinGecko entities:

```bash
npm run market-pipe -- coingecko run --entity coins_list
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

Run Agent Local against the live `agent-pipe` datastore:

```bash
MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH=/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite \
  npm run market-pipe -- agent-local run --project agent-pipe
```

After npm package installation, the canonical command shape is:

```bash
market-pipe coingecko run --entity coins_list
market-pipe coingecko run --entity coins_id_history --id bitcoin --date 01-07-2026
market-pipe coingecko run --entity exchanges --page-limit 2 --per-page 250
market-pipe alphavantage run --symbol MSFT
market-pipe alphavantage run
market-pipe custom-csv run --entity PPIACO --file data/csv/PPIACO.csv
market-pipe agent-local run --project agent-pipe
```

## Configuration

Environment variables use the `MARKET_PIPE__*` prefix to avoid collisions.

Important variables:

```bash
MARKET_PIPE__DATABASE_URL=postgres://market_pipe:market_pipe@localhost:5432/market_pipe
MARKET_PIPE__COINGECKO_API_KEY=
MARKET_PIPE__ALPHAVANTAGE_API_KEY=
MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH=/path/to/project/.agent-pipe/data/local.sqlite
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
npm run market-pipe -- agent-local run --project agent-pipe
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
market-pipe agent-local run --project agent-pipe
```

## Custom CSV

Custom CSV has four configured local-file entities:

- `CORESTICKM159SFRBATL`
- `PPIACO`
- `bitcoin_historical_ohlcv`
- `ethereum_historical_ohlcv`

Download the source CSV files from these pages:

- FRED data:
  - Core CPI: https://fred.stlouisfed.org/series/CORESTICKM159SFRBATL
  - PPI: https://fred.stlouisfed.org/series/PPIACO
- Crypto OHLCV:
  - Bitcoin: https://coinmarketcap.com/currencies/bitcoin/historical-data/
  - Ethereum: https://coinmarketcap.com/currencies/ethereum/historical-data/

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

## Agent Local

Agent Local syncs canonical `agent-pipe` SQLite `records` rows into project-owned Postgres raw tables.

Current configured project:

- `agent-pipe` -> `agent_pipe.raw_local__records`

Local development can point `market-pipe` at the live fixture with `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH`:

```bash
MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH=/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite \
  npm run market-pipe -- agent-local run --project agent-pipe
```

Filter to one entity:

```bash
npm run market-pipe -- agent-local run --project agent-pipe --entity rates
```

Run all configured projects:

```bash
npm run market-pipe -- agent-local run --all
```

Behavior notes:

- Pass exactly one of `--project` or `--all`.
- `--entity` filters `records.entity`; it is not a config allow-list.
- Unknown projects fail before SQLite is opened.
- Re-running the same SQLite rows updates the same raw ids instead of duplicating them.

## Phase Plan

1. Project Skeleton
2. CoinGecko
3. Alpha Vantage
4. Custom CSV
5. Agent Local Datastore
6. dbt Transforms
7. Production Scheduling

See [docs/phases/README.md](docs/phases/README.md).

## Development

Default checks are:

```bash
npm test
npm run typecheck
```

Tests use deterministic fixtures or mocks by default. Live CoinGecko and Alpha Vantage smoke runs are opt-in and require API keys. Custom CSV fixture smoke tests run by default with temporary local files.
Use a date within the past 365 days for CoinGecko demo/public API keys when running `coins_id_history`.

dbt runtime notes:

- `dbt` is an external CLI dependency for transforms; it is not installed through `npm`.
- Install the recommended adapter with `python -m pip install dbt-postgres`.
- For an isolated project-local install, use `UV_CACHE_DIR=.uv-cache python3 -m uv venv .venv-dbt`, then `.venv-dbt/bin/python -m ensurepip --upgrade`, then `.venv-dbt/bin/python -m pip install dbt-postgres`, and prepend `.venv-dbt/bin` to `PATH` when running dbt commands.
- Generate the project-local profile with `market-pipe transform profile`.
- Direct commands use the project-local profile directory: `dbt run --project-dir transforms --profiles-dir transforms/.dbt` and `dbt test --project-dir transforms --profiles-dir transforms/.dbt`.
- Convenience helpers mirror those direct commands: `market-pipe transform profile`, `market-pipe transform run`, and `market-pipe transform test`.
- The current CoinGecko dbt contract materializes these views:
  - `coingecko.stg__coins_list`
  - `coingecko.stg__asset_platforms_list`
  - `coingecko.mart__coins_list`
  - `coingecko.mart__asset_platforms_list`
- Opt-in dbt smoke coverage uses deterministic raw CoinGecko rows and runs only when both `MARKET_PIPE__RUN_DB_TESTS=1` and `MARKET_PIPE__RUN_DBT_SMOKE=1` are set and `dbt` is installed.

Opt-in dbt smoke:

```bash
MARKET_PIPE__RUN_DB_TESTS=1 MARKET_PIPE__RUN_DBT_SMOKE=1 npm test
```

Manual dbt flow:

```bash
npm run market-pipe -- transform profile
dbt run --project-dir transforms --profiles-dir transforms/.dbt
dbt test --project-dir transforms --profiles-dir transforms/.dbt
npm run market-pipe -- transform run
npm run market-pipe -- transform test
```

Alpha Vantage notes:

- `alphavantage run` without `--symbol` uses the YAML symbol list: `SPCX`, `TSM`, `MSFT`, `GOOG`, `NVDA`
- the default configured run plans 5 Alpha Vantage requests
- the free-tier assumption is `quota.dailyRequestLimit: 25`
- over-quota runs fail before making API requests
- all-symbol mode waits `rateLimit.delayMs: 15000` between symbol requests

Opt-in DB-backed verification:

```bash
MARKET_PIPE__RUN_DB_TESTS=1 npm test
```

Opt-in live Agent Local acceptance:

```bash
MARKET_PIPE__RUN_DB_TESTS=1 \
MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH=/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite \
npm test
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
│       ├── agent_local/
│       ├── coingecko/
│       └── custom_csv/
├── sql/
├── tests/
├── compose.yaml
├── .env.example
├── License.md
└── README.md
```

## License

MIT. See [License.md](License.md).
