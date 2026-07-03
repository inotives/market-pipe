---
id: task-0011
title: "Phase 2: add CoinGecko pagination support"
type: task
status: ready
assigned_to: worker
created_by: human
created_on: 2026-07-03
updated_on: 2026-07-03
priority: normal
parent: ""
depends_on:
  - task-0010
---

# Task

## Context

Phase 2 plan: `docs/phases/phase-02-coingecko.md`.

Pagination should exist only where the CoinGecko endpoint supports `page` / `per_page`.

## Goal

Add bounded pagination support for applicable CoinGecko endpoints without making default runs unexpectedly large.

## Scope

- Confirm which Phase 2 endpoints expose `page` / `per_page`.
- Apply pagination only to those endpoints.
- Defaults:
  - `MARKET_PIPE__COINGECKO_PAGE_LIMIT=1`
  - `MARKET_PIPE__COINGECKO_PER_PAGE=250`
- CLI overrides:
  - `--page-limit <count>`
  - `--per-page <count>`
- Preserve idempotent upserts across multiple pages.

## Planner Notes

- Do not fake pagination for endpoints that do not support it.
- Keep the page loop bounded by `page_limit`.
- Validate positive integer values.
- If CoinGecko demo docs show no pagination for the current Phase 2 endpoints, document that and only add config/CLI validation if still useful.

## Implementation Plan

1. Verify pagination parameters in the CoinGecko docs.
2. Add config/env parsing for page defaults.
3. Add CLI overrides.
4. Add bounded page loop for applicable entities.
5. Add tests for page count, per-page value, and idempotent multi-page upserts.

## Acceptance Criteria

- [ ] Pagination is implemented only for endpoints with documented `page` / `per_page`.
- [ ] Default page limit is `1`.
- [ ] CLI overrides work for applicable entities.
- [ ] Invalid page values fail clearly.
- [ ] Multi-page mocked runs upsert without duplicate raw rows.

## Notes
