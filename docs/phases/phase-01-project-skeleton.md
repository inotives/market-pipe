# Phase 1 - Project Skeleton

## Purpose

Create a runnable TypeScript CLI scaffold that proves the project shape before real market-data sources are added.

This phase should include the first narrow CoinGecko source module shape, not only an empty CLI. The source contract is the core architectural decision, so it should be exercised once while the codebase is still small.

## Scope

- TypeScript project with strict compiler settings.
- `npm` package setup.
- TypeScript compile check.
- CLI entrypoint with canonical installed command `market-pipe --help`.
- Local development script: `npm run market-pipe -- --help`.
- `package.json` `bin` entry for `market-pipe`.
- CLI entry file shebang: `#!/usr/bin/env node`.
- `commander` for CLI command parsing.
- `yaml` for source `config.yaml` parsing.
- Node's built-in test runner.
- Config loading from environment variables.
- Environment variables use the `MARKET_PIPE__*` prefix to avoid collisions.
- Config loading order: existing process environment wins, then `.env.local` from the current working directory if present.
- Database config resolution: `MARKET_PIPE__DATABASE_URL` wins; otherwise build from `MARKET_PIPE__POSTGRES_HOST`, `MARKET_PIPE__POSTGRES_PORT`, `MARKET_PIPE__POSTGRES_DB`, `MARKET_PIPE__POSTGRES_USER`, and `MARKET_PIPE__POSTGRES_PASSWORD`.
- `dotenv` support for local `.env.local` loading.
- `market-pipe config check --for <scope>` to report missing command-relevant settings without calling external APIs.
- Each CLI command validates its own required config before doing work; `config check` is only a diagnostic convenience.
- `.env.example` template for local Postgres and CoinGecko API settings.
- `.env.local` for local secrets, ignored by git.
- Docker Compose reads the same `.env.local` values used by the app.
- Minimal README quickstart for local setup, config, database bootstrap, and `coins_list` smoke run.
- Postgres connection helper.
- Dockerized local Postgres setup for development and tests via `compose.yaml`.
- Idempotent raw SQL bootstrap file using source-owned schemas and tables.
- Raw insert idempotency path for source-owned raw tables.
- First CoinGecko source module slice for `coins_list`.
- Source module code path: `src/features/coingecko/`.
- CoinGecko source module files: `cli.ts`, `runner.ts`, `schemas.ts`, `feature.ts`, and `config.yaml`.
- Raw table for `coingecko.raw_coingecko__coins_list`.
- Canonical CLI command: `market-pipe coingecko run --entity coins_list`.
- Local development command: `npm run market-pipe -- coingecko run --entity coins_list`.
- `coins_list` raw grain: one current row per CoinGecko `id`.
- Raw API table columns: `id`, `endpoint`, `payload_jsonb`, `created_at`, `updated_at`, `deleted_at`.
- Raw API `id` meaning: endpoint-owned stable identity for one raw row. It may be a payload ID, a composite key built from multiple payload fields, or a mapped value when the endpoint has no natural ID.
- Raw validation gates only the minimum endpoint contract needed for identity and safe storage.
- `coins_list` validation requires `id`, `symbol`, and `name`, allows extra fields, and stores the full payload in `payload_jsonb`.
- Minimal endpoint metadata for each raw endpoint: `entity`, `endpoint`, `table`, and `idField`.
- Endpoint metadata meaning: `entity` is the internal CLI/table identifier, while `endpoint` is the upstream API path such as `/coins/list`.
- CoinGecko endpoint metadata lives in `src/features/coingecko/config.yaml`.
- Phase 1 `config.yaml` includes only `coins_list`; no disabled placeholders for future endpoints.
- `coins_list` stores endpoint path `/coins/list` in config; the base URL stays in provider/config code.
- `coins_list` stores `idField: id` in config; custom or composite ID derivation waits until an endpoint needs it.
- Deterministic tests use fixtures or mocks; live CoinGecko API calls are opt-in smoke runs.
- Normal `coingecko run --entity coins_list` requires both `MARKET_PIPE__DATABASE_URL` and `MARKET_PIPE__COINGECKO_API_KEY`.
- `coins_list` upsert behavior: first insert sets `created_at`; later daily refreshes update the same `id` row, replace `payload_jsonb`, and set `updated_at`.
- `coins_list` deletion behavior: if an asset disappears from the API, its `updated_at` stops changing; `deleted_at` stays nullable and is reserved for an explicit user decision to mark the asset deleted.
- JSON unpacking belongs in dbt staging, not raw ingestion.
- One minimal insert test against local Postgres.

## Out Of Scope

- CoinGecko API calls.
- dbt models.
- CSV parsing.
- Alpha Vantage integration.
- Production systemd installation.
- Generic provider framework.
- CLI commands for setting `deleted_at`.
- Migration tooling.
- Explicit `--env-file` support.
- User-facing offline mode for `coingecko run`.
- dbt scaffolding.
- Lint and format tooling.
- Generic expression language for endpoint IDs.
- Disabled placeholder endpoint configs.

## Acceptance Signals

- `npm test` passes.
- TypeScript compile check passes.
- Local Postgres can start with Docker Compose from `compose.yaml`.
- `npm run market-pipe -- --help` shows the intended command shape.
- `npm run market-pipe -- config check --for coingecko` reports missing CoinGecko config without touching external APIs.
- `npm run market-pipe -- config check --for db` reports missing database config without touching external APIs.
- `coingecko run --entity coins_list` fails fast with a clear message when its required config is missing.
- Fixture or mocked paths are for tests, not a separate user-facing offline mode.
- `npm run market-pipe -- db bootstrap` creates source-owned schemas and raw tables.
- Re-running `npm run market-pipe -- db bootstrap` is safe.
- Fixture or mocked tests can land `coins_list` rows.
- An opt-in live smoke run can call CoinGecko and land `coins_list` rows when network/API access is available.
- Local config can be copied from `.env.example` to `.env.local`.
- Local app and Docker Compose configuration come from the same `.env.local` file.
- Installed npm users can provide config through shell, systemd, Docker, or CI environment variables.
- README quickstart is enough for a fresh clone to run Phase 1 locally.
- The package exposes an installed `market-pipe` binary.
- A test can insert a new `coins_list` row and update the same `id` on a later run without creating a duplicate row.
- A test proves missing API rows do not automatically set `deleted_at`.
- Phase 1 only reserves `deleted_at`; it does not add a deletion command.
- Raw ingestion does not unpack `payload_jsonb` into source-specific normalized columns.
- The `coins_list` metadata documents and tests its `idField`.
- The `coins_list` slice proves CLI registration, runner shape, validation boundary, and raw landing convention.

## Open Decisions

None.
