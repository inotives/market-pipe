# ADR 0002 - Agent Local Datastore As Source

## Status

Accepted

## Context

`market-pipe` should be useful as a warehouse ingestion tool, but the user also wants agents to collect data while working in other repositories and later push those records into the warehouse.

Making SQLite a switchable backend for every existing source would require broad database portability work across CoinGecko, Alpha Vantage, Custom CSV, bootstrap SQL, and tests. That adds complexity before the local-agent workflow is proven.

The local-agent workflow may eventually need its own runtime: project-local YAML schedules, local ingestion jobs, SQLite writes, job run history, retry state, and sync targets beyond the current Postgres warehouse. That shape is closer to a separate tool, tentatively `agent-pipe`, than to another `market-pipe` source.

## Decision

Add an Agent Local Datastore as a new source module.

Agents write project-local records into SQLite databases under `.agent-pipe/`. `market-pipe` then ingests those SQLite records into Postgres raw tables with idempotent upserts.

SQLite is used for stability and local simplicity. Turso/libSQL is deferred.

Phase 5 will prove only the warehouse sync contract: project namespace, entity namespace, row identity, payload shape, and idempotent upsert. The standalone scheduler/runtime remains deferred until that contract is stable.

## Consequences

- Existing source modules stay Postgres-oriented.
- Agent-collected data has a low-friction local write target.
- Project identity must be part of row identity to avoid collisions across repositories.
- Warehouse landing stays source-owned but project-scoped: each configured project gets raw tables named from its SQLite datastore, such as `agent_pipe.raw_local__records`.
- Sync is one-way from SQLite to Postgres in this phase.
- A future `agent-pipe` can be split out without changing the warehouse raw contract if it writes the same SQLite row shape.
- Scheduler YAML, local job execution, retry state, and cloud sync adapters are intentionally out of scope for Phase 5.
