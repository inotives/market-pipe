import { loadEnv } from "../../config.js";

type Env = Record<string, string | undefined>;
type Fetcher = typeof fetch;
type Sleeper = (ms: number) => Promise<void>;

type RequestOptions = {
  apiKey: string;
  endpoint: string;
  env?: Env;
  fetcher?: Fetcher;
  sleep?: Sleeper;
};

const apiBaseUrl = "https://api.coingecko.com/api/v3";
const retryStatuses = new Set([429, 500, 502, 503, 504]);

export function getCoinGeckoRetryConfig(env: Env = loadEnv()): { attempts: number; baseMs: number } {
  return {
    attempts: positiveInt(env.MARKET_PIPE__COINGECKO_RETRY_ATTEMPTS, "MARKET_PIPE__COINGECKO_RETRY_ATTEMPTS", 3),
    baseMs: positiveInt(env.MARKET_PIPE__COINGECKO_RETRY_BASE_MS, "MARKET_PIPE__COINGECKO_RETRY_BASE_MS", 1000),
  };
}

export async function requestCoinGeckoJson<T>({
  apiKey,
  endpoint,
  env = loadEnv(),
  fetcher = fetch,
  sleep = defaultSleep,
}: RequestOptions): Promise<T> {
  const { attempts, baseMs } = getCoinGeckoRetryConfig(env);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetcher(`${apiBaseUrl}${endpoint}`, {
      headers: { "x-cg-demo-api-key": apiKey },
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (!retryStatuses.has(response.status) || attempt === attempts) {
      throw new Error(`CoinGecko request failed: ${response.status} ${response.statusText}`);
    }

    await sleep(retryDelayMs(response, attempt, baseMs));
  }

  throw new Error("CoinGecko request failed");
}

function retryDelayMs(response: Response, attempt: number, baseMs: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return seconds * 1000;
    }

    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) {
      return Math.max(0, dateMs - Date.now());
    }
  }

  return baseMs * attempt;
}

function positiveInt(value: string | undefined, name: string, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
