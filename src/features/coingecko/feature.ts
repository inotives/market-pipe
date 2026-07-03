import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export type CoinGeckoEndpoint = {
  entity:
    | "coins_list"
    | "asset_platforms_list"
    | "trending_search"
    | "crypto_global"
    | "derivatives_exchanges"
    | "exchanges"
    | "coins_categories"
    | "coins_id_history"
    | "coins_id_ohlc";
  endpoint: string;
  table: `coingecko.raw_coingecko__${string}`;
  idField: string;
  schedule?: { type: "daily"; timeUtc: string } | { type: "hourly"; minute: number } | { type: "manual" };
};

export type CoinGeckoFeatureConfig = {
  endpoints: CoinGeckoEndpoint[];
};

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), "config.yaml");

export function loadCoinGeckoConfig(): CoinGeckoFeatureConfig {
  const config = parse(readFileSync(configPath, "utf8")) as CoinGeckoFeatureConfig;
  if (!Array.isArray(config.endpoints)) {
    throw new Error("CoinGecko config must contain endpoints");
  }

  for (const endpoint of config.endpoints) {
    if (!endpoint.entity || !endpoint.endpoint || !endpoint.table || !endpoint.idField) {
      throw new Error("Invalid CoinGecko endpoint metadata");
    }
  }

  return config;
}

export function getCoinGeckoEndpoint(entity: string): CoinGeckoEndpoint {
  const endpoint = loadCoinGeckoConfig().endpoints.find((item) => item.entity === entity);
  if (!endpoint) {
    throw new Error(`Unsupported CoinGecko entity: ${entity}`);
  }

  return endpoint;
}
