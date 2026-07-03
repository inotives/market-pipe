import { checkConfig, loadEnv } from "../../config.js";
import { getAlphaVantageEndpoint, loadAlphaVantageConfig } from "./feature.js";

type Env = Record<string, string | undefined>;
type Fetcher = typeof fetch;

type RequestOptions = {
  apiKey: string;
  symbol: string;
  fetcher?: Fetcher;
};

type FetchOptions = {
  env?: Env;
};

const apiBaseUrl = "https://www.alphavantage.co/query";

export async function requestAlphaVantageDaily({
  apiKey,
  symbol,
  fetcher = fetch,
}: RequestOptions): Promise<unknown> {
  const endpoint = getAlphaVantageEndpoint("daily");
  const response = await fetcher(`${apiBaseUrl}?${new URLSearchParams({
    function: endpoint.function,
    symbol,
    outputsize: endpoint.outputsize,
    apikey: apiKey,
  }).toString()}`);

  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function prepareAlphaVantageRun(
  plannedSymbols: string[],
  env: Env = loadEnv(),
): { apiKey: string } {
  const alphaVantageCheck = checkConfig("alphavantage", env);
  if (!alphaVantageCheck.ok) {
    throw new Error(`Missing alphavantage run config: ${alphaVantageCheck.missing.join(", ")}`);
  }

  const config = loadAlphaVantageConfig();
  if (plannedSymbols.length > config.quota.dailyRequestLimit) {
    throw new Error(
      `Alpha Vantage planned ${plannedSymbols.length} requests exceeds quota.dailyRequestLimit ${config.quota.dailyRequestLimit}`,
    );
  }

  return { apiKey: env.MARKET_PIPE__ALPHAVANTAGE_API_KEY ?? "" };
}

export async function fetchAlphaVantageDaily(
  symbol: string,
  fetcher: Fetcher = fetch,
  options: FetchOptions = {},
): Promise<unknown> {
  const { apiKey } = prepareAlphaVantageRun([symbol], options.env);
  return requestAlphaVantageDaily({ apiKey, symbol, fetcher });
}

export async function fetchAlphaVantageDailyForSymbols(
  symbols: string[],
  fetcher: Fetcher = fetch,
  options: FetchOptions = {},
): Promise<Array<{ symbol: string; payload: unknown }>> {
  const { apiKey } = prepareAlphaVantageRun(symbols, options.env);
  const rows = [];
  for (const symbol of symbols) {
    rows.push({ symbol, payload: await requestAlphaVantageDaily({ apiKey, symbol, fetcher }) });
  }

  return rows;
}
