import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { stringify } from "yaml";
import { loadEnv } from "../../config.js";

const transformProjectDir = "transforms";
const transformProfilesDir = `${transformProjectDir}/.dbt`;
const transformProfilePath = `${transformProfilesDir}/profiles.yml`;

type Env = Record<string, string | undefined>;
type SpawnLike = typeof spawnSync;

type DbtProfile = {
  market_pipe: {
    target: "dev";
    outputs: {
      dev: {
        type: "postgres";
        host: string;
        port: number;
        user: string;
        password: string;
        dbname: string;
        schema: string;
        threads: number;
      };
    };
  };
};

export function writeTransformProfile(
  env: Env = loadEnv(),
  cwd = process.cwd(),
): string {
  const databaseUrl = requireTransformDatabaseUrl(env);
  const profilePath = resolve(cwd, transformProfilePath);

  mkdirSync(dirname(profilePath), { recursive: true });
  writeFileSync(profilePath, stringify(buildTransformProfile(databaseUrl)));
  return profilePath;
}

export function runTransformSubcommand(
  subcommand: "run" | "test",
  env: Env = loadEnv(),
  cwd = process.cwd(),
  spawn: SpawnLike = spawnSync,
): void {
  writeTransformProfile(env, cwd);
  const args = ["--project-dir", transformProjectDir, "--profiles-dir", transformProfilesDir];
  const result = spawn("dbt", [subcommand, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  if (result.error) {
    if ("code" in result.error && result.error.code === "ENOENT") {
      throw new Error("dbt is not installed. Install it with: python -m pip install dbt-postgres");
    }

    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exitCode = result.status;
  }
}

export function buildTransformProfile(databaseUrl: string): DbtProfile {
  const parsed = new URL(databaseUrl);
  return {
    market_pipe: {
      target: "dev",
      outputs: {
        dev: {
          type: "postgres",
          host: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : 5432,
          user: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password),
          dbname: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
          schema: "public",
          threads: 1,
        },
      },
    },
  };
}

function requireTransformDatabaseUrl(env: Env): string {
  const databaseUrl = env.MARKET_PIPE__DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing transform config: MARKET_PIPE__DATABASE_URL");
  }

  return databaseUrl;
}
