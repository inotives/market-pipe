import pg from "pg";
import { checkConfig, getDatabaseUrl, loadEnv } from "../../config.js";
import { requestCoinGeckoJson } from "./client.js";
import { type CoinGeckoEndpoint, getCoinGeckoEndpoint } from "./feature.js";
import { type CoinsListRow, validateCoinsListRows } from "./schemas.js";

type Fetcher = typeof fetch;
type FetchOptions = {
  env?: Record<string, string | undefined>;
  sleep?: (ms: number) => Promise<void>;
};
type CoinGeckoRunParams = {
  id?: string;
  date?: string;
  vsCurrency?: string;
  days?: string;
  pageLimit?: string;
  perPage?: string;
  page?: string;
};
type RawRow = {
  id: string;
  payload: unknown;
};
const supportedOhlcDays = new Set(["1", "7", "14", "30", "90", "180", "365"]);
const paginatedEntities = new Set(["exchanges", "derivatives_exchanges"]);

export function validateCoinGeckoPayload(entity: string, payload: unknown): CoinsListRow[] {
  const endpoint = getCoinGeckoEndpoint(entity);
  if (endpoint.entity === "coins_list") {
    return validateCoinsListRows(payload);
  }

  throw new Error(`Unsupported CoinGecko entity: ${entity}`);
}

export async function fetchCoinsList(apiKey: string, fetcher: Fetcher = fetch, options: FetchOptions = {}): Promise<CoinsListRow[]> {
  const endpoint = getCoinGeckoEndpoint("coins_list");
  return validateCoinsListRows(await requestCoinGeckoJson({ apiKey, endpoint: endpoint.endpoint, fetcher, ...options }));
}

export async function fetchCoinGeckoEntity(
  entity: string,
  apiKey: string,
  fetcher: Fetcher = fetch,
  options: FetchOptions = {},
  params: CoinGeckoRunParams = {},
): Promise<unknown> {
  const validated = validateCoinGeckoRunParams(entity, params, options.env);
  if (!paginatedEntities.has(entity)) {
    return requestCoinGeckoJson({ apiKey, endpoint: buildCoinGeckoEndpoint(entity, validated), fetcher, ...options });
  }

  const rows = [];
  for (let page = 1; page <= Number(validated.pageLimit); page += 1) {
    const payload = await requestCoinGeckoJson<unknown>({
      apiKey,
      endpoint: buildCoinGeckoEndpoint(entity, { ...validated, page: String(page) }),
      fetcher,
      ...options,
    });
    const batch = requireArray(entity, payload);
    rows.push(...batch);
    if (batch.length < Number(validated.perPage)) {
      break;
    }
  }

  return rows;
}

export function extractCoinGeckoRows(entity: string, payload: unknown, params: CoinGeckoRunParams = {}): RawRow[] {
  const endpoint = getCoinGeckoEndpoint(entity);

  if (endpoint.entity === "coins_list") {
    return validateCoinsListRows(payload).map((row) => ({
      id: requiredId(endpoint.entity, row.id, "coin.id"),
      payload: row,
    }));
  }

  if (endpoint.entity === "asset_platforms_list") {
    return requireArray(endpoint.entity, payload).map((row) => ({
      id: assetPlatformId(row),
      payload: row,
    }));
  }

  if (endpoint.entity === "trending_search") {
    const root = requireRecord(endpoint.entity, payload);
    return [
      ...trendingRows("coin", root.coins, (row) => requiredId(endpoint.entity, recordValue(recordField(row, "item"), "id"), "item.item.id")),
      ...trendingRows("nft", root.nfts, (row) => requiredId(endpoint.entity, recordValue(row, "id"), "item.id")),
      ...trendingRows("category", root.categories, (row) => requiredId(endpoint.entity, scalarString(row, "id"), "item.id")),
    ];
  }

  if (endpoint.entity === "crypto_global") {
    requireRecord(endpoint.entity, payload);
    return [{ id: "global", payload }];
  }

  if (endpoint.entity === "derivatives_exchanges" || endpoint.entity === "exchanges" || endpoint.entity === "coins_categories") {
    const idLabel = endpoint.entity === "coins_categories" ? "category.id" : "exchange.id";
    return requireArray(endpoint.entity, payload).map((row) => ({
      id: requiredId(endpoint.entity, recordValue(row, "id"), idLabel),
      payload: row,
    }));
  }

  if (endpoint.entity === "coins_id_history") {
    const validated = validateCoinGeckoRunParams(endpoint.entity, params);
    return [{ id: `${validated.id}:${validated.date}`, payload }];
  }

  if (endpoint.entity === "coins_id_ohlc") {
    const validated = validateCoinGeckoRunParams(endpoint.entity, params);
    return [{ id: `${validated.id}:${validated.vsCurrency}:${validated.days}`, payload }];
  }

  throw new Error(`Unsupported CoinGecko entity: ${entity}`);
}

export async function ingestCoinsList(rows: CoinsListRow[], connectionString: string): Promise<number> {
  return ingestCoinGeckoRows("coins_list", rows.map((row) => ({ id: row.id, payload: row })), connectionString);
}

export async function ingestCoinGeckoRows(entity: string, rows: RawRow[], connectionString: string): Promise<number> {
  const endpoint = getCoinGeckoEndpoint(entity);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    for (const row of rows) {
      await client.query(
        `
          insert into ${endpoint.table} (id, endpoint, payload_jsonb)
          values ($1, $2, $3::jsonb)
          on conflict (id) do update
          set endpoint = excluded.endpoint,
              payload_jsonb = excluded.payload_jsonb,
              updated_at = now()
        `,
        [row.id, endpoint.endpoint, JSON.stringify(row.payload)],
      );
    }
  } finally {
    await client.end();
  }

  return rows.length;
}

export async function runCoinsList(fetcher: Fetcher = fetch): Promise<number> {
  return runCoinGeckoEntity("coins_list", fetcher);
}

export async function runCoinGeckoEntity(entity: string, fetcher: Fetcher = fetch, params: CoinGeckoRunParams = {}): Promise<number> {
  const env = loadEnv();
  const validatedParams = validateCoinGeckoRunParams(entity, params, env);

  const dbCheck = checkConfig("db", env);
  const coinGeckoCheck = checkConfig("coingecko", env);
  const missing = [...dbCheck.missing, ...coinGeckoCheck.missing];
  if (missing.length > 0) {
    throw new Error(`Missing coingecko run config: ${missing.join(", ")}`);
  }

  const connectionString = getDatabaseUrl(env);
  if (!connectionString) {
    throw new Error("Missing coingecko run config: MARKET_PIPE__DATABASE_URL");
  }

  return ingestCoinGeckoRows(
    entity,
    extractCoinGeckoRows(
      entity,
      await fetchCoinGeckoEntity(entity, env.MARKET_PIPE__COINGECKO_API_KEY ?? "", fetcher, { env }, validatedParams),
      validatedParams,
    ),
    connectionString,
  );
}

function buildCoinGeckoEndpoint(entity: string, params: CoinGeckoRunParams): string {
  const endpoint = getCoinGeckoEndpoint(entity);

  if (endpoint.entity === "coins_id_history") {
    const validated = validateCoinGeckoRunParams(entity, params) as { id: string; date: string };
    return `/coins/${encodeURIComponent(validated.id)}/history?${new URLSearchParams({ date: validated.date }).toString()}`;
  }

  if (endpoint.entity === "coins_id_ohlc") {
    const validated = validateCoinGeckoRunParams(entity, params) as { id: string; vsCurrency: string; days: string };
    return `/coins/${encodeURIComponent(validated.id)}/ohlc?${new URLSearchParams({
      vs_currency: validated.vsCurrency,
      days: validated.days,
    }).toString()}`;
  }

  if (paginatedEntities.has(endpoint.entity)) {
    const validated = validateCoinGeckoRunParams(entity, params) as { page?: string; perPage?: string };
    return `${endpoint.endpoint}?${new URLSearchParams({
      page: validated.page ?? "1",
      per_page: validated.perPage ?? "250",
    }).toString()}`;
  }

  return endpoint.endpoint;
}

function validateCoinGeckoRunParams(
  entity: string,
  params: CoinGeckoRunParams,
  env: Record<string, string | undefined> = {},
): CoinGeckoRunParams {
  const pageLimit = params.pageLimit ?? env.MARKET_PIPE__COINGECKO_PAGE_LIMIT ?? "1";
  const perPage = params.perPage ?? env.MARKET_PIPE__COINGECKO_PER_PAGE ?? "250";

  if (entity === "coins_id_history") {
    const id = requiredParam(entity, params.id, "--id");
    const date = requiredParam(entity, params.date, "--date");
    if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      throw new Error("CoinGecko coins_id_history requires --date in dd-mm-yyyy format");
    }

    return { id, date };
  }

  if (entity === "coins_id_ohlc") {
    const id = requiredParam(entity, params.id, "--id");
    const vsCurrency = requiredParam(entity, params.vsCurrency, "--vs-currency");
    const days = requiredParam(entity, params.days, "--days");
    if (!supportedOhlcDays.has(days)) {
      throw new Error(`CoinGecko coins_id_ohlc requires --days to be one of ${[...supportedOhlcDays].join(", ")}`);
    }

    return { id, vsCurrency, days };
  }

  if (paginatedEntities.has(entity)) {
    return {
      ...params,
      pageLimit: positiveIntParam(entity, pageLimit, "page limit"),
      perPage: positiveIntParam(entity, perPage, "per page"),
    };
  }

  if (params.pageLimit || params.perPage) {
    throw new Error(`CoinGecko ${entity} does not support pagination`);
  }

  return params;
}

function trendingRows(
  type: "coin" | "nft" | "category",
  payload: unknown,
  idFromRow: (row: Record<string, unknown>) => string,
): RawRow[] {
  return requireArray("trending_search", payload).map((row) => {
    const record = requireRecord("trending_search", row);
    return {
      id: `${type}:${idFromRow(record)}`,
      payload: { type, item: record },
    };
  });
}

function requireArray(entity: string, payload: unknown): Record<string, unknown>[] {
  if (!Array.isArray(payload)) {
    throw new Error(`CoinGecko ${entity} payload must be an array`);
  }

  return payload.map((row) => requireRecord(entity, row));
}

function requireRecord(entity: string, payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`CoinGecko ${entity} payload must be an object`);
  }

  return payload as Record<string, unknown>;
}

function recordValue(payload: unknown, key: string): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function scalarString(payload: unknown, key: string): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[key];
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function recordField(payload: unknown, key: string): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  return (payload as Record<string, unknown>)[key];
}

function requiredId(entity: CoinGeckoEndpoint["entity"], value: string | undefined, label: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`CoinGecko ${entity} row is missing ${label}`);
  }

  return value;
}

function requiredParam(entity: string, value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`CoinGecko ${entity} requires ${name}`);
  }

  return value;
}

function positiveIntParam(entity: string, value: string, label: string): string {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`CoinGecko ${entity} requires ${label} to be a positive integer`);
  }

  return value;
}

function assetPlatformId(row: Record<string, unknown>): string {
  const platformId = recordValue(row, "id");
  if (platformId && platformId.trim() !== "") {
    return platformId;
  }

  const nativeCoinId = recordValue(row, "native_coin_id");
  if (nativeCoinId && nativeCoinId.trim() !== "") {
    return `native_coin:${nativeCoinId}`;
  }

  throw new Error("CoinGecko asset_platforms_list row is missing platform.id and native_coin_id");
}
