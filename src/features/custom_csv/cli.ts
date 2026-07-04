import type { Command } from "commander";
import { getCustomCsvEntity } from "./feature.js";
import { runCustomCsvCryptoOhlcv, runCustomCsvEconomicTimeSeries } from "./runner.js";

export function registerCustomCsvCommands(program: Command): void {
  const customCsv = program.command("custom-csv").description("Run Custom CSV ingestion commands.");
  customCsv
    .command("run")
    .description("Run a configured Custom CSV ingestion entity.")
    .requiredOption("--entity <entity>", "entity to ingest")
    .requiredOption("--file <path>", "local CSV file path")
    .action(async ({ entity, file }: { entity: string; file: string }) => {
      try {
        if (/^https?:\/\//.test(file)) {
          throw new Error("Custom CSV run only supports local filesystem paths");
        }

        const config = getCustomCsvEntity(entity);
        const count = config.parser === "crypto_ohlcv"
          ? await runCustomCsvCryptoOhlcv(config.entity, file)
          : await runCustomCsvEconomicTimeSeries(config.entity, file);
        console.log(`custom-csv ${config.entity} ingested ${count} rows`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
