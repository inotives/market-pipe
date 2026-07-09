# New TypeScript Market Data CLI Execution Plan

## Goal

Build a small TypeScript CLI-based data-ingestion tool using the useful concepts from the existing project, but without Prefect.

The primary objective is to make market-data pipelines easy to control by agents and external automation tools such as n8n.

The new project should expose stable, scriptable CLI commands for CoinGecko API data, custom CSV files, and Alpha Vantage API data. Humans, agents, systemd, cron, n8n, GitHub Actions, or other orchestrators should all call the same commands. The project should keep raw data preservation, idempotent loading, simple transforms, and production operability, while leaving room for future providers such as exchanges, FRED, and Yahoo Finance-compatible APIs.

## Non-Goals

- No Prefect.
- No event-driven automations.
- No deployment registration layer.
- No source scaffolding generator in the first version.
- No generalized plugin system.
- No distributed workers.
- No long-running app server.
- No dashboard unless the lack of one becomes a real operating problem.

## Recommended Stack

- Runtime: Node.js 22 LTS.
- Language: TypeScript.
- Package manager: `pnpm`.
- CLI: first-class product surface, built with a small command parser such as `commander` or `yargs`.
- Local execution: `tsx`.
- Production execution: compiled JS or `tsx`, whichever is simpler for deployment.
- Validation: `zod`.
- Database: Postgres.
- Postgres client: `pg`.
- HTTP: built-in `fetch`.
- Scheduling: systemd timer on Linux production. Cron is acceptable for local or very small deployments.
- Transforms: dbt only if the transformed models are useful to query. Keep SQL transforms out of TypeScript.
- Testing: Node's built-in test runner or Vitest. Pick one; do not add both.

## Target Shape

```text
new-project/
  src/
    cli.ts
    config.ts
    db.ts
    raw.ts
    features/
      coingecko/
        cli.ts
        runner.ts
        schemas.ts
        feature.ts
      custom_csv/
        cli.ts
        runner.ts
        schemas.ts
        feature.ts
      alphavantage/
        cli.ts
        runner.ts
        schemas.ts
        feature.ts
      transforms/
        cli.ts
        runner.ts
      index.ts
    transforms.ts
  sql/
    001_raw_tables.sql
  transforms/
    dbt_project.yml
    models/
  scripts/
    run-hourly.sh
    run-daily.sh
    market-pipe-ingest-hourly.service
    market-pipe-ingest-hourly.timer
    market-pipe-ingest-daily.service
    market-pipe-ingest-daily.timer
  tests/
```

This structure is feature-based. Each market-data source owns its CLI registration, runner, provider mapping, and validation schemas. Shared code stays at the top level only when two or more features already use it.

## Architecture

### Feature modules

Each feature should be self-contained:

```text
src/features/coingecko/
  cli.ts       # registers coingecko commands
  runner.ts    # runCoingecko(...)
  schemas.ts   # zod schemas for fields the project depends on
  feature.ts   # feature metadata and dbt selector map
```

Start with three files per feature. Add `client.ts` or `constants.ts` only when `runner.ts` gets noisy.

The root CLI should compose feature CLIs from a feature registry:

```ts
import { features } from "./features";

for (const feature of features) {
  feature.registerCommands(program);
}
```

Do not put provider-specific logic in root `cli.ts`, `raw.ts`, or `db.ts`.

The registry can start as a plain static list:

```ts
import { coingeckoFeature } from "./coingecko/feature";
import { customCsvFeature } from "./custom_csv/feature";
import { alphaVantageFeature } from "./alphavantage/feature";

export const features = [coingeckoFeature, customCsvFeature, alphaVantageFeature];
```

This is dynamic enough for adding providers without introducing runtime plugin loading. Add filesystem-based discovery only if maintaining the registry becomes painful.

### CLI-first execution

The CLI is the product. Everything else exists to support it.

Every source must be runnable from the command line:

```bash
npm run market-pipe -- coingecko run --entities coins_list global coins_markets
npm run market-pipe -- custom-csv run --file ./data/prices.csv --entity ohlcv
npm run market-pipe -- alphavantage run --symbols AAPL MSFT NVDA --interval 1d
npm run market-pipe -- transform run
```

Schedulers call CLI commands. Source logic must not know whether it was started manually, by cron, or by systemd.

The CLI should be useful interactively:

```bash
market-pipe --help
market-pipe coingecko --help
market-pipe coingecko run --entities global coins_markets
market-pipe alphavantage run --symbols AAPL MSFT --interval 1d
market-pipe db bootstrap
market-pipe transform run
```

For v1, avoid interactive prompts. Commands should run from flags and environment variables so they work cleanly in scripts.

CLI commands must also be orchestrator-friendly:

- Exit `0` on success.
- Exit non-zero on failure.
- Write normal logs to stdout/stderr.
- Support `--json` for machine-readable summaries.
- Never require prompts for scheduled or automated commands.
- Make all operational choices explicit through flags or environment variables.
- Keep command names, flags, and JSON fields stable so agents can rely on them.
- Prefer one command that completes one clear job over hidden background behavior.

### Raw landing

Keep the existing idea of preserving raw provider payloads.

Use one generic raw table unless volume or query patterns prove that source-specific tables are needed:

```sql
create schema if not exists raw;

create table if not exists raw.records (
  id text primary key,
  source text not null,
  entity text not null,
  source_record_id text,
  observed_at timestamptz,
  extracted_at timestamptz not null,
  loaded_at timestamptz not null default now(),
  batch_id text not null,
  is_valid boolean not null,
  validation_errors jsonb not null default '[]'::jsonb,
  payload jsonb not null
);

create index if not exists raw_records_source_entity_extracted_at_idx
  on raw.records (source, entity, extracted_at desc);

create index if not exists raw_records_batch_id_idx
  on raw.records (batch_id);
```

Use deterministic IDs and `on conflict do nothing` for idempotency. Do not update raw rows.

### Feature contract

Each feature module should expose one simple runner:

```ts
type RunSourceOptions = {
  entities?: string[];
  batchId?: string;
};

type EntityRunSummary = {
  entity: string;
  extracted: number;
  inserted: number;
  skipped: number;
  invalid: number;
};

type SourceRunSummary = {
  source: string;
  batchId: string;
  entities: EntityRunSummary[];
};
```

Each feature should also expose minimal metadata:

```ts
type SourceKind = "api" | "file";

type FeatureDefinition = {
  name: string;
  kind: SourceKind;
  registerCommands: (program: Command) => void;
  dbtSelectors?: Record<string, string>;
};
```

Use this for command registration and transform selection only. Do not create a base source class.

The runner should:

1. Read settings.
2. Fetch provider data.
3. Convert responses to raw records.
4. Validate minimally with tolerant schemas.
5. Insert raw records.
6. Return counts.

### Validation

Validate only the fields the project depends on:

- provider ID used as `source_record_id`
- timestamp used as `observed_at`
- required numeric fields used by downstream models

Allow unknown provider fields. Provider payloads change; raw ingestion should not fail because a provider adds a field.

Schema-invalid but JSON-loadable records should still land with `is_valid = false` and validation details.

### Transforms

Keep dbt if the new project still wants queryable staging and mart models.

Rules:

- TypeScript only loads raw data.
- dbt owns unpacking, deduping, typing, and marts.
- Staging models filter to `is_valid = true`.
- No transform logic in TypeScript unless it is needed to form stable raw identity.

### Ingest-to-dbt chaining

Yes, the new CLI should support chaining dbt after ingestion.

Keep it boring: the CLI runs ingestion first, then runs dbt with a feature-specific selector if ingestion succeeds.

Example:

```bash
market-pipe coingecko run --entities asset_platforms_list --transform
```

Expected behavior:

1. Run CoinGecko `asset_platforms_list` ingestion.
2. If ingestion exits successfully, run:

```bash
dbt run --project-dir transforms --profiles-dir transforms --select stg_coingecko__asset_platforms_list+
dbt test --project-dir transforms --profiles-dir transforms --select stg_coingecko__asset_platforms_list+
```

The `+` selector should include downstream `stg -> int -> mart` models that depend on that staging model.

Do not build an event system for this. A normal function call or child process after successful ingestion is enough.

Each feature owns its dbt selector map:

```ts
const dbtSelectors = {
  coins_list: "stg_coingecko__coins_list+",
  asset_platforms_list: "stg_coingecko__asset_platforms_list+",
  global: "stg_coingecko__global+",
  global_defi: "stg_coingecko__global_defi+",
  coins_markets: "stg_coingecko__coins_markets+",
} as const;
```

For multi-entity runs, run ingestion for all selected entities first, then run one dbt command per unique selector. If any ingestion entity fails, skip dbt and exit non-zero.

Scheduled commands can use the same flag:

```bash
market-pipe run hourly --transform
market-pipe run daily --transform
```

### Scheduling

Use systemd timers in production.

Example hourly script:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/market-pipe
npm run market-pipe -- coingecko run --entities global global_defi coins_markets
npm run market-pipe -- alphavantage run --symbols AAPL MSFT NVDA --interval 1d
npm run market-pipe -- transform run
```

Example daily script:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/market-pipe
npm run market-pipe -- coingecko run --entities coins_list asset_platforms_list
npm run market-pipe -- custom-csv run --file ./data/ohlcv.csv --entity ohlcv
npm run market-pipe -- alphavantage run --symbols AAPL MSFT NVDA --interval 1d
npm run market-pipe -- transform run
```

Start with two schedules:

- Hourly: market snapshots and global metrics.
- Daily: reference lists and daily OHLCV.

Add more timers only when the source frequency requires it.

### External orchestrators

The CLI-first design should make future orchestrators such as n8n easy to adopt.

n8n, GitHub Actions, Airflow, or any other orchestrator should be able to run the same commands that a human or systemd timer runs:

```bash
market-pipe coingecko run --entities asset_platforms_list --transform --json
market-pipe custom-csv run --file ./data/ohlcv.csv --entity ohlcv --transform --json
market-pipe alphavantage run --symbols AAPL MSFT NVDA --interval 1d --transform --json
```

Do not add an n8n-specific integration in v1. Shell commands over SSH, Docker exec, or a hosted worker are enough.

Machine-readable output should be stable enough for orchestrators:

```json
{
  "source": "coingecko",
  "batchId": "2026-07-01T15:00:00.000Z",
  "entities": [
    {
      "entity": "coins_markets",
      "extracted": 250,
      "inserted": 248,
      "skipped": 2,
      "invalid": 0
    }
  ],
  "transform": {
    "status": "passed",
    "selector": "stg_coingecko__coins_markets+"
  }
}
```

This keeps the project scheduler-agnostic: systemd now, n8n later, no app rewrite.

## Source Plan

### Phase 1 - Project Skeleton

Deliverables:

- TypeScript project with strict compiler settings.
- `npm run market-pipe -- --help`.
- Config loading from environment variables.
- Postgres connection helper.
- Raw table bootstrap SQL.
- One minimal insert test against local Postgres.

Acceptance:

- `pnpm test` passes.
- `npm run market-pipe -- db bootstrap` creates raw tables.
- A test can insert and skip a duplicate raw record.

### Phase 2 - CoinGecko

Deliverables:

- `coingecko` source module.
- CLI command: `npm run market-pipe -- coingecko run`.
- Entities:
  - `coins_list`
  - `asset_platforms_list`
  - `global`
  - `global_defi`
  - `coins_markets`
- Retries for `429`, `500`, `502`, `503`, and `504`.
- Page cap settings for `coins_markets`.

Acceptance:

- Mocked tests cover each entity.
- Live smoke run is opt-in.
- Raw rows land idempotently.

### Phase 3 - Alpha Vantage

Deliverables:

- `alphavantage` source module.
- CLI command: `market-pipe alphavantage run`.
- Configured symbols list.
- Daily OHLCV ingestion.
- API-key based request handling.

Acceptance:

- Mocked tests cover symbol iteration and timestamp identity.
- Re-running the same day skips duplicates.
- dbt staging grain is `symbol, observed_at, interval`.

### Phase 4 - Custom CSV

Deliverables:

- `custom_csv` source module.
- CLI command: `market-pipe custom-csv run`.
- File input via `--file`.
- Entity input via `--entity`.
- Basic column mapping for OHLCV-style CSV files.

Acceptance:

- Tests cover file parsing and invalid rows.
- Raw rows land idempotently.
- dbt staging models expose stable symbols, timestamps, and OHLCV values.

### Phase 5 - Agent Local Datastore

Deliverables:

- `agent_local` source module.
- SQLite reader for project-local `.agent-pipe/data/local.sqlite` files.
- Configured project/entity mappings.
- Raw table: `agent_local.raw_agent_local__records`.
- CLI command: `market-pipe agent-local run`.

Acceptance:

- One local SQLite row lands as one warehouse raw row.
- Project identity prevents collisions across repositories.
- Same entity names in different projects do not collide.
- Re-running the same local records updates existing raw rows instead of duplicating.

### Phase 6 - dbt Transforms

Deliverables:

- dbt project under `transforms/`.
- Staging models for CoinGecko entities.
- Reference marts for coins and asset platforms.
- `market-pipe transform run` wrapper around dbt.

Acceptance:

- `market-pipe transform run` builds from loaded raw data.
- dbt tests catch null keys and duplicate grains.

### Future Source Expansion

The first supported features are:

- `coingecko`: API source.
- `custom_csv`: file source.
- `alphavantage`: API source.
- `agent_local`: SQLite source.

Future features should fit the same registry contract:

- Crypto exchanges: Binance, Kraken, Bybit, Crypto.com.
- Government/economic data: FRED.
- Market data APIs: Yahoo Finance-compatible APIs.
- Additional CSV contracts.

Adding a future source should usually mean:

1. Add `src/features/<source>/feature.ts`.
2. Add `src/features/<source>/cli.ts`.
3. Add `src/features/<source>/runner.ts`.
4. Add `src/features/<source>/schemas.ts`.
5. Add dbt models under `transforms/models/<source>/` if needed.
6. Register the feature in `src/features/index.ts`.

Do not add provider-specific conditionals to root CLI code.

### Phase 7 - Production Scheduling

Deliverables:

- `scripts/run-hourly.sh`.
- `scripts/run-daily.sh`.
- systemd service and timer units.
- deployment notes.
- log inspection runbook.

Acceptance:

- `systemctl status` shows timer state.
- `journalctl -u <service>` shows job logs.
- Manual CLI runs and timer runs use the same commands.

## Migration From Existing Project

Reuse the ideas, not the Python implementation.

Keep:

- Raw payload preservation.
- Deterministic raw record IDs.
- Idempotent inserts.
- Tolerant source validation.
- dbt-owned transforms.
- Source/entity naming.
- Opt-in live smoke tests.
- Production data access boundaries.

Drop:

- Prefect flows.
- Prefect deployments.
- Prefect automations.
- Prefect events.
- Work pools and work queues.
- Source scaffolding until repetition hurts.

Translate:

- Python `runner.py` modules -> TypeScript feature runners.
- Python source `cli.py` modules -> TypeScript feature `cli.ts` modules.
- Pydantic schemas -> Zod schemas.
- `psycopg` loader -> `pg` insert helper.
- Make targets -> `pnpm` scripts and shell scripts.

## CLI Command Map

```text
market-pipe db bootstrap
market-pipe coingecko run [--entities ...]
market-pipe custom-csv run --file <path> --entity <entity>
market-pipe alphavantage run [--symbols ...] [--interval 1d]
market-pipe transform run [--select ...]
market-pipe run hourly [--transform]
market-pipe run daily [--transform]
```

`market-pipe run hourly` and `market-pipe run daily` are convenience commands that call the same source runners as the source-specific commands. They should stay small and obvious.

## Operational Defaults

Environment variables:

```text
DATABASE_URL=
COINGECKO_API_KEY=
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
COINGECKO_MARKETS_VS_CURRENCY=usd
COINGECKO_MARKETS_PER_PAGE=250
COINGECKO_MARKETS_MAX_PAGES=1
ALPHAVANTAGE_API_KEY=
ALPHAVANTAGE_SYMBOLS=AAPL,MSFT,NVDA
```

Logging:

- Write structured JSON lines to stdout.
- Let systemd capture logs.
- Do not build a logging service.

Failure behavior:

- One failed source command exits non-zero.
- The shell script stops at the failed command.
- systemd records failure.
- Manual rerun is the recovery path for v1.

## What Not To Build Yet

- Backfill framework.
- Web dashboard.
- Source dependency graph.
- Alerting service.
- Queue workers.
- Provider abstraction layer.
- YAML-defined sources.
- Incremental dbt models.
- Historical schema registry.

Add these only after the new project has repeated pain that justifies them.

## First Week Execution Order

1. Create the TypeScript repo and raw table bootstrap.
2. Implement raw insert idempotency.
3. Implement CoinGecko `global` only.
4. Add one systemd-style shell script locally, even before installing the timer.
5. Add the rest of CoinGecko entities.
6. Add dbt staging for CoinGecko.
7. Install the hourly timer on production.
8. Add custom CSV.
9. Add Alpha Vantage.

This order proves the production path early instead of spending the first week building framework code.

## Done Criteria

The new project is successful when:

- A fresh machine can install dependencies and bootstrap raw tables from docs.
- `npm run market-pipe -- coingecko run` loads raw rows.
- `npm run market-pipe -- transform run` builds useful models.
- `npm run market-pipe -- coingecko run --entities asset_platforms_list --transform` ingests raw rows and runs the related dbt staging, intermediate, and mart models.
- systemd runs hourly and daily jobs without Prefect.
- Re-running jobs skips duplicates instead of mutating raw data.
- The codebase remains small enough that adding a source means editing one source file, one CLI registration, and optional dbt models.
