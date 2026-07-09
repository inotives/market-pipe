# Phase 5 - Agent Local Datastore

## Purpose

Add a SQLite-backed source module for agent-collected data from project-local `agent-pipe` datastores.

This phase lets agents store local records under a project's `.agent-pipe/` folder and later ingest those records into the `market-pipe` Postgres warehouse.

This phase deliberately proves the sync contract first: `agent-pipe` writes local SQLite records, and `market-pipe` syncs those records into Postgres raw tables.

## Source Model

Agent Local Datastore is a source module, similar to CoinGecko, Alpha Vantage, and Custom CSV. It is not a replacement database backend for existing source modules.

Default project-local SQLite path:

```text
.agent-pipe/data/local.sqlite
```

Phase 5 targets the normalized `agent-pipe` datastore shape that already exists under:

```text
/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite
```

That live datastore is the Phase 5 opt-in acceptance fixture. The path stays out of committed config and is supplied through an environment override for local testing.

Longer term, an agent-local runtime may live in each project repo, read project-local YAML schedules, write rows into SQLite, and then sync those rows to `market-pipe` Postgres or another configured warehouse. That runtime is outside this phase. Phase 5 only reads already-existing SQLite `records` rows and lands them in Postgres raw tables.

## Scope

- Source module: `src/features/agent_local/`.
- Config file: `src/features/agent_local/config.yaml`.
- Bootstrap support for project-owned Postgres schemas derived from configured project IDs.
- Raw tables named `raw_<sqlite_db_name>__records`, where `<sqlite_db_name>` is the SQLite filename without extension.
- CLI command: `market-pipe agent-local run`.
- Default SQLite path: `.agent-pipe/data/local.sqlite`.
- Configured project entries with `projectId`, `projectName`, and SQLite path.
- Optional environment override for the live SQLite fixture path.
- SQLite reads use native `node:sqlite`; Phase 5 does not add a SQLite npm dependency.
- One local SQLite row becomes one Postgres raw row.
- One-way ingestion from SQLite to Postgres.
- Sync contract for a future local agent runtime.

## Out Of Scope

- Making CoinGecko, Alpha Vantage, or Custom CSV write to SQLite.
- Turso/libSQL.
- Bidirectional sync.
- Conflict resolution beyond idempotent warehouse upsert.
- Arbitrary project-specific SQLite table mappings.
- Recomputing row identity from payload fields or configured field lists.
- dbt staging for agent-local records.
- Scheduler integration.
- Agent write SDK.
- Local YAML scheduler runtime.
- Local job runner or retry state.
- Direct sync adapters for GCP Cloud SQL, AWS, or other external warehouses.
- A separate `agent-pipe` package or CLI.

## Local SQLite Shape

Project datastores use the canonical `agent-pipe` `records` table.

Current live shape:

```sql
records (
  id text primary key,
  project_id text,
  entity text,
  local_id text,
  source text,
  captured_at text,
  payload_json text,
  metadata_json text,
  created_at text,
  updated_at text,
  deleted_at text
)
```

`market-pipe` does not read arbitrary natural tables in Phase 5. It reads `records`, validates required fields and JSON payloads, and stores each row in the matching Postgres raw table.

Current live `agent-pipe` entities include `coin_history`, `coins_list`, `notes`, `rates`, and `tickers`.

## Config Shape

```yaml
projects:
  - projectId: agent-pipe
    projectName: Agent Pipe
    sqlitePath: .agent-pipe/data/local.sqlite
```

`projectId` is the stable identity and is also the source of the Postgres schema name after sanitization. `projectName` is display metadata stored with each raw row.

For local live testing, `MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH` overrides the configured `sqlitePath` for the selected project. This keeps the committed config portable while allowing:

```text
/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite
```

No entity list is required in config. Entities are discovered from `records.entity`, and `--entity` filters those records.

## Warehouse Raw Shape

```sql
<schema>.raw_<sqlite_db_name>__records (
  id text primary key,
  project_id text not null,
  project_name text not null,
  entity text not null,
  local_id text not null,
  source text,
  sqlite_path text not null,
  captured_at timestamptz,
  payload_jsonb jsonb not null,
  metadata_jsonb jsonb,
  local_created_at timestamptz,
  local_updated_at timestamptz,
  local_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

For the live `agent-pipe` datastore:

```sql
agent_pipe.raw_local__records
```

Naming rules:

```text
schema = snakecase(projectId)
sqlite_db_name = basename(sqlitePath) without extension
table = raw_<sqlite_db_name>__records
```

Examples:

```text
projectId: agent-pipe -> schema: agent_pipe
sqlitePath: .agent-pipe/data/local.sqlite -> sqlite_db_name: local
records table -> agent_pipe.raw_local__records
```

Identifiers are sanitized by lowercasing, replacing non-alphanumeric characters with `_`, and collapsing repeated underscores. Quoted identifiers are intentionally avoided.

Warehouse `id` is copied from `records.id`. `market-pipe` does not rebuild IDs from payload fields.

Example live ID:

```text
agent-pipe:rates:["2025-04-26"]
```

`local_created_at`, `local_updated_at`, and `local_deleted_at` mirror SQLite record lifecycle fields. Warehouse `created_at` and `updated_at` remain Postgres ingestion timestamps.

## CLI Shape

```bash
market-pipe agent-local run --project agent-pipe
market-pipe agent-local run --project agent-pipe --entity rates
market-pipe agent-local run --all
```

Local development form:

```bash
MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH=/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite \
  npm run market-pipe -- agent-local run --project agent-pipe
```

These commands are warehouse-side sync commands. They do not create local schedules or write source data into SQLite.

## Validation Behavior

- Missing SQLite files fail clearly.
- Missing `records` table fails clearly.
- Missing `id`, `project_id`, `entity`, `local_id`, or `payload_json` fails with useful row context.
- Invalid `payload_json` or `metadata_json` fails before DB writes.
- Duplicate `records.id` values within one run fail before DB writes.
- Unknown configured projects fail before opening SQLite.
- `--entity` with no matching rows fails clearly.
- Re-running the same SQLite records updates existing warehouse rows instead of duplicating them.
- Rows with `deleted_at` are ingested and preserved as `local_deleted_at`; Phase 5 does not hard-delete Postgres rows.

## Acceptance Signals

- Config lookup supports multiple projects.
- Bootstrap creates project-owned raw tables such as `agent_pipe.raw_local__records`.
- A deterministic SQLite fixture with a `records` table ingests one Postgres raw row per SQLite record.
- Entity filtering reads only matching `records.entity` rows.
- Duplicate `records.id` values fail before Postgres writes.
- Reruns are idempotent.
- CLI supports `--project`, `--entity`, and `--all`.
- An opt-in live test ingests the full `/Users/inotives/workspaces/agent-pipe/.agent-pipe/data/local.sqlite` fixture and verifies Postgres counts by `project_id` and `entity` match SQLite.
- `npm run typecheck` passes.
- `npm test` passes.

## Open Decisions

- None for Phase 5 implementation.
