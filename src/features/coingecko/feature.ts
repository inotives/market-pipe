import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export type CoinGeckoEndpoint = {
  entity: "coins_list";
  endpoint: "/coins/list";
  table: "coingecko.raw_coingecko__coins_list";
  idField: "id";
};

export type CoinGeckoFeatureConfig = {
  endpoints: CoinGeckoEndpoint[];
};

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), "config.yaml");

export function loadCoinGeckoConfig(): CoinGeckoFeatureConfig {
  const config = parse(readFileSync(configPath, "utf8")) as CoinGeckoFeatureConfig;
  if (!Array.isArray(config.endpoints) || config.endpoints.length !== 1) {
    throw new Error("CoinGecko config must contain only coins_list");
  }

  const [coinsList] = config.endpoints;
  if (
    coinsList?.entity !== "coins_list" ||
    coinsList.endpoint !== "/coins/list" ||
    coinsList.table !== "coingecko.raw_coingecko__coins_list" ||
    coinsList.idField !== "id"
  ) {
    throw new Error("Invalid coins_list metadata");
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
