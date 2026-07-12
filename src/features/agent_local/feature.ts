import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Command } from "commander";
import { parse } from "yaml";
import { loadEnv } from "../../config.js";
import { registerAgentLocalCommands } from "./cli.js";

export type AgentLocalProjectConfig = {
  projectId: string;
  projectName: string;
  sqlitePath: string;
};

export type AgentLocalFeatureConfig = {
  projects: AgentLocalProjectConfig[];
};

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), "config.yaml");

export function loadAgentLocalConfig(): AgentLocalFeatureConfig {
  const config = parse(readFileSync(configPath, "utf8")) as AgentLocalFeatureConfig;
  if (!Array.isArray(config.projects) || config.projects.length === 0) {
    throw new Error("Agent Local config must contain projects");
  }

  for (const project of config.projects) {
    if (!project.projectId || !project.projectName || !project.sqlitePath) {
      throw new Error("Invalid Agent Local project metadata");
    }
  }

  return config;
}

export function getAgentLocalProject(
  projectId: string,
  env: Record<string, string | undefined> = loadEnv(),
): AgentLocalProjectConfig {
  const project = loadAgentLocalConfig().projects.find((item) => item.projectId === projectId);
  if (!project) {
    throw new Error(`Unsupported Agent Local project: ${projectId}`);
  }

  return {
    ...project,
    sqlitePath: env.MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH ?? project.sqlitePath,
  };
}

export function getAgentLocalSchemaName(projectId: string): string {
  return sanitizeIdentifier(projectId);
}

export function getAgentLocalRawTableName(sqlitePath: string): string {
  const sqliteName = basename(sqlitePath, ".sqlite");
  return `raw_${sanitizeIdentifier(sqliteName)}__records`;
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (!sanitized) {
    throw new Error(`Invalid identifier value: ${value}`);
  }

  return sanitized;
}

export const agentLocalFeature = {
  slug: "agent-local",
  loadConfig: loadAgentLocalConfig,
  registerCommands(program: Command): void {
    registerAgentLocalCommands(program);
  },
};
