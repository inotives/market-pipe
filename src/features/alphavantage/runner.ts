import pg from "pg";
import { getDatabaseUrl, loadEnv } from "../../config.js";
import { prepareAlphaVantageRun, requestAlphaVantageDaily } from "./client.js";
import { getAlphaVantageEndpoint, loadAlphaVantageConfig } from "./feature.js";

type Fetcher = typeof fetch;
type Sleeper = (ms: number) => Promise<void>;
type RawRow = {
  id: string;
  payload: unknown;
};
type RunOptions = {
  env?: Record<string, string | undefined>;
  fetcher?: Fetcher;
  sleep?: Sleeper;
  runSymbol?: (symbol: string) => Promise<number>;
};

export async function runAlphaVantageDaily(symbol: string, fetcher: Fetcher = fetch, env = loadEnv()): Promise<number> {
  const connectionString = getDatabaseUrl(env);
  if (!connectionString) {
    throw new Error("Missing alphavantage run config: MARKET_PIPE__DATABASE_URL");
  }

  prepareAlphaVantageRun([symbol], env);
  return ingestAlphaVantageRows(
    "daily",
    extractAlphaVantageRows(
      await requestAlphaVantageDaily({ apiKey: env.MARKET_PIPE__ALPHAVANTAGE_API_KEY ?? "", symbol, fetcher }),
      { symbol },
    ),
    connectionString,
  );
}

export async function runAlphaVantageSymbols(
  {
    symbol,
    symbols,
    env = loadEnv(),
    fetcher = fetch,
    sleep = defaultSleep,
    runSymbol = (plannedSymbol) => runAlphaVantageDaily(plannedSymbol, fetcher, env),
  }: { symbol?: string; symbols?: string[] } & RunOptions = {},
): Promise<number> {
  const config = loadAlphaVantageConfig();
  const plannedSymbols = symbols ?? (symbol ? [symbol] : config.symbols);
  prepareAlphaVantageRun(plannedSymbols, env);

  let count = 0;
  for (const [index, plannedSymbol] of plannedSymbols.entries()) {
    count += await runSymbol(plannedSymbol);
    if (!symbol && index < plannedSymbols.length - 1) {
      await sleep(config.rateLimit.delayMs);
    }
  }

  return count;
}

export function extractAlphaVantageRows(payload: unknown, params: { symbol: string }): RawRow[] {
  const endpoint = getAlphaVantageEndpoint("daily");
  const root = requireRecord(payload);
  const series = requireRecord(root["Time Series (Daily)"], "Alpha Vantage daily payload must contain Time Series (Daily)");

  return Object.entries(series).map(([observedAt, candle]) => ({
    id: `${requiredSymbol(params.symbol)}:${observedAt}`,
    payload: {
      symbol: requiredSymbol(params.symbol),
      observed_at: observedAt,
      interval: endpoint.entity,
      source: "alphavantage",
      candle: requireRecord(candle, `Alpha Vantage daily payload must contain an object candle for ${observedAt}`),
    },
  }));
}

export async function ingestAlphaVantageRows(entity: string, rows: RawRow[], connectionString: string): Promise<number> {
  const endpoint = getAlphaVantageEndpoint(entity);
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
        [row.id, endpoint.function, JSON.stringify(row.payload)],
      );
    }
  } finally {
    await client.end();
  }

  return rows.length;
}

function requireRecord(value: unknown, message = "Alpha Vantage daily payload must be an object"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function requiredSymbol(value: string): string {
  if (!value || value.trim() === "") {
    throw new Error("Alpha Vantage daily requires symbol");
  }

  return value;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
