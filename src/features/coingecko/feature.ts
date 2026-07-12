import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Command } from "commander";
import { parse } from "yaml";
import { type FeatureSchedule, validateFeatureSchedule } from "../schedule.js";
import { registerCoinGeckoCommands } from "./cli.js";

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
  schedule?: FeatureSchedule;
};

export type CoinGeckoFeatureConfig = {
  endpoints: CoinGeckoEndpoint[];
};

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), "config.yaml");

export function loadCoinGeckoConfig(): CoinGeckoFeatureConfig {
  return validateCoinGeckoConfig(parse(readFileSync(configPath, "utf8")));
}

export function validateCoinGeckoConfig(config: unknown): CoinGeckoFeatureConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("CoinGecko config must be an object");
  }

  const candidate = config as { endpoints?: unknown };
  if (!Array.isArray(candidate.endpoints)) {
    throw new Error("CoinGecko config must contain endpoints");
  }

  const endpoints = candidate.endpoints.map((endpoint) => {
    if (!endpoint || typeof endpoint !== "object" || Array.isArray(endpoint)) {
      throw new Error("Invalid CoinGecko endpoint metadata");
    }

    const item = endpoint as Record<string, unknown>;
    if (!item.entity || !item.endpoint || !item.table || !item.idField) {
      throw new Error("Invalid CoinGecko endpoint metadata");
    }

    return (
      item.schedule === undefined
        ? { ...item }
        : {
            ...item,
            schedule: validateFeatureSchedule(item.schedule, `CoinGecko endpoint ${item.entity}`),
          }
    ) as CoinGeckoEndpoint;
  });

  return { endpoints };
}

export function getCoinGeckoEndpoint(entity: string): CoinGeckoEndpoint {
  const endpoint = loadCoinGeckoConfig().endpoints.find((item) => item.entity === entity);
  if (!endpoint) {
    throw new Error(`Unsupported CoinGecko entity: ${entity}`);
  }

  return endpoint;
}

export const coingeckoFeature = {
  slug: "coingecko",
  loadConfig: loadCoinGeckoConfig,
  registerCommands(program: Command): void {
    registerCoinGeckoCommands(program);
  },
};
