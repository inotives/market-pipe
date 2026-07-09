# Market Pipe Context

## Glossary

### Source Module

A market-data input module owned by one source, such as CoinGecko, custom CSV, or Alpha Vantage. A source module owns its CLI registration, runner, request or file handling, validation schemas, and raw landing behavior.

In code, source modules live under `src/features/<source>/` to match the planned project layout.

### Symbol

An Alpha Vantage equity identifier configured for ingestion, such as `MSFT` or `TSM`. A symbol is source-specific input identity, not a normalized asset identity.

### Agent Local Datastore

A project-local SQLite database under a `.agent-pipe/` folder that agents can write to while working in another repository. It is a source of raw records for `market-pipe`, not a replacement storage backend for CoinGecko, Alpha Vantage, or Custom CSV ingestion.

### Agent Local Project

The repository or workspace that owns an agent local datastore, such as `crypto-trading`, `stock-trading`, or `market-research`. Agent local project identity namespaces records so different projects can reuse entity names without collisions.

### Agent Local Entity

A record family inside an agent local project's canonical `records` table, such as `rates`, `notes`, `tickers`, or `daily_ohlcv`. Entity names are local to a project.

### Raw

Source-owned records landed by ingestion modules with source payloads preserved for later transformation.

### Staging Model

A dbt model that lightly shapes raw source records into stable, typed columns while preserving source-level grain.

### Intermediate Model

A dbt model that holds reusable transform logic shared by multiple downstream models. Intermediate models are introduced only when shared logic exists.

### Mart

A dbt model intended for direct analytical use, such as a reference dimension or fact table.
