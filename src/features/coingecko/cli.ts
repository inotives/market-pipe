import type { Command } from "commander";
import { getCoinGeckoEndpoint } from "./feature.js";
import { runCoinsList } from "./runner.js";

export function registerCoinGeckoCommands(program: Command): void {
  const coingecko = program.command("coingecko").description("Run CoinGecko ingestion commands.");
  coingecko
    .command("run")
    .description("Run a CoinGecko ingestion entity.")
    .requiredOption("--entity <entity>", "entity to ingest")
    .action(async ({ entity }: { entity: string }) => {
      try {
        const endpoint = getCoinGeckoEndpoint(entity);
        const count = await runCoinsList();
        console.log(`coingecko ${endpoint.entity} ingested ${count} rows`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
