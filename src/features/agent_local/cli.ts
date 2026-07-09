import type { Command } from "commander";
import { loadEnv } from "../../config.js";
import { loadAgentLocalConfig } from "./feature.js";
import { runAgentLocal } from "./runner.js";

export function registerAgentLocalCommands(program: Command): void {
  const agentLocal = program.command("agent-local").description("Run Agent Local datastore ingestion commands.");
  agentLocal
    .command("run")
    .description("Sync Agent Local SQLite records into Postgres raw tables.")
    .option("--project <projectId>", "configured project to sync")
    .option("--entity <entity>", "optional records.entity filter")
    .option("--all", "sync all configured projects")
    .action(async ({ project, entity, all }: { project?: string; entity?: string; all?: boolean }) => {
      try {
        if ((!project && !all) || (project && all)) {
          throw new Error("Agent Local run requires exactly one of --project or --all");
        }

        const env = loadEnv();
        if (all) {
          let count = 0;
          for (const configuredProject of loadAgentLocalConfig().projects) {
            count += await runAgentLocal(configuredProject.projectId, { entity, env });
          }
          console.log(`agent-local all ingested ${count} rows`);
          return;
        }

        const count = await runAgentLocal(project ?? "", { entity, env });
        console.log(`agent-local ${project} ingested ${count} rows`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
