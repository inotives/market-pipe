import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Command } from "commander";
import { parse } from "yaml";
import { registerAlphaVantageCommands } from "./cli.js";

export type AlphaVantageEndpoint = {
  entity: "daily";
  function: "TIME_SERIES_DAILY";
  outputsize: "compact";
  table: `alphavantage.raw_alphavantage__${string}`;
  idField: string;
};

export type AlphaVantageFeatureConfig = {
  quota: { dailyRequestLimit: number };
  rateLimit: { delayMs: number };
  symbols: string[];
  endpoints: AlphaVantageEndpoint[];
};

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), "config.yaml");

export function loadAlphaVantageConfig(): AlphaVantageFeatureConfig {
  const config = parse(readFileSync(configPath, "utf8")) as AlphaVantageFeatureConfig;
  if (!Number.isInteger(config.quota?.dailyRequestLimit) || config.quota.dailyRequestLimit <= 0) {
    throw new Error("Alpha Vantage config must contain a positive quota.dailyRequestLimit");
  }

  if (!Number.isInteger(config.rateLimit?.delayMs) || config.rateLimit.delayMs <= 0) {
    throw new Error("Alpha Vantage config must contain a positive rateLimit.delayMs");
  }

  if (!Array.isArray(config.symbols) || config.symbols.some((symbol) => typeof symbol !== "string" || symbol.trim() === "")) {
    throw new Error("Alpha Vantage config must contain symbols");
  }

  if (!Array.isArray(config.endpoints)) {
    throw new Error("Alpha Vantage config must contain endpoints");
  }

  for (const endpoint of config.endpoints) {
    if (!endpoint.entity || !endpoint.function || !endpoint.outputsize || !endpoint.table || !endpoint.idField) {
      throw new Error("Invalid Alpha Vantage endpoint metadata");
    }
  }

  return config;
}

export function getAlphaVantageEndpoint(entity: string): AlphaVantageEndpoint {
  const endpoint = loadAlphaVantageConfig().endpoints.find((item) => item.entity === entity);
  if (!endpoint) {
    throw new Error(`Unsupported Alpha Vantage entity: ${entity}`);
  }

  return endpoint;
}

export const alphaVantageFeature = {
  slug: "alphavantage",
  loadConfig: loadAlphaVantageConfig,
  registerCommands(program: Command): void {
    registerAlphaVantageCommands(program);
  },
};
