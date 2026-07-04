import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Command } from "commander";
import { parse } from "yaml";
import { registerCustomCsvCommands } from "./cli.js";

export type CustomCsvParser = "economic_time_series" | "crypto_ohlcv";

export type CustomCsvEntity =
  | "CORESTICKM159SFRBATL"
  | "PPIACO"
  | "bitcoin_historical_ohlcv"
  | "ethereum_historical_ohlcv";

export type CustomCsvEntityConfig = {
  entity: CustomCsvEntity;
  table: `custom_csv.raw_custom_csv__${string}`;
  parser: CustomCsvParser;
  delimiter: string;
  expectedHeaders: string[];
  idFields: string[];
  asset?: string;
};

export type CustomCsvFeatureConfig = {
  entities: CustomCsvEntityConfig[];
};

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), "config.yaml");

export function loadCustomCsvConfig(): CustomCsvFeatureConfig {
  const config = parse(readFileSync(configPath, "utf8")) as CustomCsvFeatureConfig;
  if (!Array.isArray(config.entities)) {
    throw new Error("Custom CSV config must contain entities");
  }

  for (const entity of config.entities) {
    if (!entity.entity || !entity.table || !entity.parser || !entity.delimiter) {
      throw new Error("Invalid Custom CSV entity metadata");
    }

    if (!Array.isArray(entity.expectedHeaders) || entity.expectedHeaders.length === 0) {
      throw new Error(`Custom CSV entity ${entity.entity} must contain expectedHeaders`);
    }

    if (!Array.isArray(entity.idFields) || entity.idFields.length === 0) {
      throw new Error(`Custom CSV entity ${entity.entity} must contain idFields`);
    }

    if (entity.parser === "crypto_ohlcv" && !entity.asset) {
      throw new Error(`Custom CSV entity ${entity.entity} must contain asset`);
    }
  }

  return config;
}

export function getCustomCsvEntity(entity: string): CustomCsvEntityConfig {
  const config = loadCustomCsvConfig().entities.find((item) => item.entity === entity);
  if (!config) {
    throw new Error(`Unsupported Custom CSV entity: ${entity}`);
  }

  return config;
}

export const customCsvFeature = {
  slug: "custom-csv",
  registerCommands(program: Command): void {
    registerCustomCsvCommands(program);
  },
};
