# Market Pipe Context

## Glossary

### Source Module

A market-data input module owned by one source, such as CoinGecko, custom CSV, or Alpha Vantage. A source module owns its CLI registration, runner, request or file handling, validation schemas, and raw landing behavior.

In code, source modules live under `src/features/<source>/` to match the planned project layout.

### Symbol

An Alpha Vantage equity identifier configured for ingestion, such as `MSFT` or `TSM`. A symbol is source-specific input identity, not a normalized asset identity.
