# Phase 7 - Source-Owned dbt Relation Naming

## Purpose

Replace the generic dbt output contract from Phase 6 with source-owned relation names.

Phase 6 proved the dbt runtime and CoinGecko-first transform slice, but it landed output relations in generic schemas:

```text
staging.stg_coingecko__*
marts.dim_*
```

That contract is not the long-term warehouse shape. This phase corrects it to source-owned naming so raw, staging, and marts for a source stay together:

```text
coingecko.raw_coingecko__<entity>
coingecko.stg__<entity>
coingecko.mart__<entity>
```

This is the default dbt output pattern for future sources unless a later phase explicitly overrides it.

## Scope

- Update the Phase 6 CoinGecko dbt output contract.
- Rename staging model identities to `stg__<entity>`.
- Rename mart model identities to `mart__<entity>`.
- Materialize staging and mart views into the source-owned `coingecko` schema.
- Keep raw sources unchanged in `coingecko.raw_coingecko__<entity>`.
- Update docs and tests to use the new relation names.
- Establish the source-owned schema pattern as the default for future dbt-enabled sources.

## Out Of Scope

- Python migration.
- New CoinGecko entities beyond the current Phase 6 slice.
- Alpha Vantage, Custom CSV, or Agent Local dbt models.
- Compatibility views for the old `staging.*` and `marts.*` names.
- Intermediate models.
- Incremental models.
- Persisted table materializations.
- Production scheduling.

## Acceptance Signals

- dbt staging relations land as:
  - `coingecko.stg__coins_list`
  - `coingecko.stg__asset_platforms_list`
- dbt mart relations land as:
  - `coingecko.mart__coins_list`
  - `coingecko.mart__asset_platforms_list`
- Internal dbt model names and `ref()` calls use the new `stg__*` and `mart__*` identities.
- The old generic-schema contract is removed from docs and tests.
- `dbt run --project-dir transforms --profiles-dir transforms/.dbt` builds the renamed models successfully.
- `dbt test --project-dir transforms --profiles-dir transforms/.dbt` runs the renamed model tests successfully.
- The opt-in dbt smoke path verifies the four new `coingecko.*` relations directly.
- `npm run typecheck` passes.
- `npm test` passes.

## Open Decisions

- None for implementation.
