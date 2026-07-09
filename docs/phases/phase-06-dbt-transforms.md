# Phase 6 - dbt Transforms

## Purpose

Add queryable models over raw CoinGecko data while keeping SQL transforms out of TypeScript.

dbt should appear only after raw data is landing reliably. The CLI remains the orchestration surface by wrapping dbt commands.

## Scope

- dbt project under `transforms/`.
- Staging models for CoinGecko entities.
- Reference marts for coins and asset platforms.
- CLI command: `market-pipe transform run`.
- dbt tests for null keys and duplicate grains.

## Out Of Scope

- Incremental models.
- Full warehouse modeling framework.
- Dashboard-specific marts.
- TypeScript data shaping that belongs in SQL.

## Acceptance Signals

- `market-pipe transform run` builds from loaded raw data.
- dbt tests catch null keys.
- dbt tests catch duplicate grains.
- CoinGecko raw tables can produce stable staging models.

## Open Decisions

- What is the first useful mart: coin reference, platform reference, or both?
- Should dbt profiles be generated from environment variables or documented as a local setup step?
- Should transform runs be source-specific or always run the whole dbt project at this stage?
