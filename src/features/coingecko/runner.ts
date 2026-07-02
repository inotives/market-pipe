import pg from "pg";
import { checkConfig, getDatabaseUrl, loadEnv } from "../../config.js";
import { getCoinGeckoEndpoint } from "./feature.js";
import { type CoinsListRow, validateCoinsListRows } from "./schemas.js";

type Fetcher = typeof fetch;

const apiBaseUrl = "https://api.coingecko.com/api/v3";

export function validateCoinGeckoPayload(entity: string, payload: unknown): CoinsListRow[] {
  const endpoint = getCoinGeckoEndpoint(entity);
  if (endpoint.entity === "coins_list") {
    return validateCoinsListRows(payload);
  }

  throw new Error(`Unsupported CoinGecko entity: ${entity}`);
}

export async function fetchCoinsList(apiKey: string, fetcher: Fetcher = fetch): Promise<CoinsListRow[]> {
  const endpoint = getCoinGeckoEndpoint("coins_list");
  const response = await fetcher(`${apiBaseUrl}${endpoint.endpoint}`, {
    headers: { "x-cg-demo-api-key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko ${endpoint.entity} request failed: ${response.status} ${response.statusText}`);
  }

  return validateCoinsListRows(await response.json());
}

export async function ingestCoinsList(rows: CoinsListRow[], connectionString: string): Promise<number> {
  const endpoint = getCoinGeckoEndpoint("coins_list");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    for (const row of rows) {
      await client.query(
        `
          insert into coingecko.raw_coingecko__coins_list (id, endpoint, payload_jsonb)
          values ($1, $2, $3::jsonb)
          on conflict (id) do update
          set endpoint = excluded.endpoint,
              payload_jsonb = excluded.payload_jsonb,
              updated_at = now()
        `,
        [row[endpoint.idField], endpoint.endpoint, JSON.stringify(row)],
      );
    }
  } finally {
    await client.end();
  }

  return rows.length;
}

export async function runCoinsList(fetcher: Fetcher = fetch): Promise<number> {
  const env = loadEnv();
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

  return ingestCoinsList(await fetchCoinsList(env.MARKET_PIPE__COINGECKO_API_KEY ?? "", fetcher), connectionString);
}
