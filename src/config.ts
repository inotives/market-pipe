import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

type Env = Record<string, string | undefined>;

const databaseParts = [
  "MARKET_PIPE__POSTGRES_HOST",
  "MARKET_PIPE__POSTGRES_PORT",
  "MARKET_PIPE__POSTGRES_DB",
  "MARKET_PIPE__POSTGRES_USER",
  "MARKET_PIPE__POSTGRES_PASSWORD",
] as const;

const coingeckoRetryParts = ["MARKET_PIPE__COINGECKO_RETRY_ATTEMPTS", "MARKET_PIPE__COINGECKO_RETRY_BASE_MS"] as const;
const coingeckoPagingParts = ["MARKET_PIPE__COINGECKO_PAGE_LIMIT", "MARKET_PIPE__COINGECKO_PER_PAGE"] as const;

export type ConfigScope = "coingecko" | "db";

export type ConfigCheck = {
  ok: boolean;
  scope: ConfigScope;
  missing: string[];
};

export function loadEnv(cwd = process.cwd(), processEnv: Env = process.env): Env {
  const env: Env = { ...processEnv };
  for (const filename of [".env", ".env.local"]) {
    const envPath = resolve(cwd, filename);
    if (!existsSync(envPath)) {
      continue;
    }

    const fileEnv = parse(readFileSync(envPath));
    for (const [key, value] of Object.entries(fileEnv)) {
      env[key] ??= value;
    }
  }

  return env;
}

export function checkConfig(scope: string, env = loadEnv()): ConfigCheck {
  if (scope === "coingecko") {
    const check = missingCheck(scope, env, ["MARKET_PIPE__COINGECKO_API_KEY"]);
    const invalid = [...coingeckoRetryParts, ...coingeckoPagingParts].filter((key) => env[key] && !isPositiveInteger(env[key]));
    const missing = [...check.missing, ...invalid];
    return { ok: missing.length === 0, scope, missing };
  }

  if (scope === "db") {
    if (env.MARKET_PIPE__DATABASE_URL) {
      return { ok: true, scope, missing: [] };
    }

    return missingCheck(scope, env, databaseParts);
  }

  throw new Error(`Unsupported config scope: ${scope}`);
}

export function getDatabaseUrl(env = loadEnv()): string | undefined {
  if (env.MARKET_PIPE__DATABASE_URL) {
    return env.MARKET_PIPE__DATABASE_URL;
  }

  const check = checkConfig("db", env);
  if (!check.ok) {
    return undefined;
  }

  const user = encodeURIComponent(env.MARKET_PIPE__POSTGRES_USER ?? "");
  const password = encodeURIComponent(env.MARKET_PIPE__POSTGRES_PASSWORD ?? "");
  const host = env.MARKET_PIPE__POSTGRES_HOST;
  const port = env.MARKET_PIPE__POSTGRES_PORT;
  const database = encodeURIComponent(env.MARKET_PIPE__POSTGRES_DB ?? "");

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

function missingCheck(scope: ConfigScope, env: Env, keys: readonly string[]): ConfigCheck {
  const missing = keys.filter((key) => !env[key]);
  return { ok: missing.length === 0, scope, missing };
}

function isPositiveInteger(value: string | undefined): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}
