import type { Command } from "commander";
import { runAlphaVantageSymbols } from "./runner.js";

export function registerAlphaVantageCommands(program: Command): void {
  const alphavantage = program.command("alphavantage").description("Run Alpha Vantage ingestion commands.");
  alphavantage
    .command("run")
    .description("Run Alpha Vantage daily stock ingestion.")
    .option("--symbol <symbol>", "symbol to ingest")
    .action(async ({ symbol }: { symbol?: string }) => {
      try {
        const count = await runAlphaVantageSymbols({ symbol });
        console.log(`alphavantage daily ingested ${count} rows`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
