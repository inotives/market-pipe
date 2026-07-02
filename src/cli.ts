#!/usr/bin/env node
import { Command } from "commander";
import { checkConfig } from "./config.js";
import { bootstrapDatabase } from "./db.js";
import { registerCoinGeckoCommands } from "./features/coingecko/cli.js";

const placeholder = (message: string) => () => {
  console.log(message);
};

export function createProgram(): Command {
  const program = new Command();

  program
    .name("market-pipe")
    .description("CLI-first market data ingestion for Postgres.")
    .version("0.1.0");

  const config = program.command("config").description("Inspect market-pipe configuration.");
  config
    .command("check")
    .description("Check required configuration for a scope.")
    .requiredOption("--for <scope>", "configuration scope")
    .action(({ for: scope }: { for: string }) => {
      const result = checkConfig(scope);
      if (!result.ok) {
        console.error(`Missing ${result.scope} config: ${result.missing.join(", ")}`);
        process.exitCode = 1;
        return;
      }

      console.log(`${result.scope} config ok`);
    });

  const db = program.command("db").description("Manage local database objects.");
  db.command("bootstrap")
    .description("Create source-owned schemas and raw tables.")
    .action(async () => {
      try {
        await bootstrapDatabase();
        console.log("db bootstrap ok");
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  registerCoinGeckoCommands(program);

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createProgram().parse();
}
