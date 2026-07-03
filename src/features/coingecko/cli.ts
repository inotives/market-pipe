import type { Command } from "commander";
import { getCoinGeckoEndpoint } from "./feature.js";
import { runCoinGeckoEntity } from "./runner.js";

export function registerCoinGeckoCommands(program: Command): void {
  const coingecko = program.command("coingecko").description("Run CoinGecko ingestion commands.");
  coingecko
    .command("run")
    .description("Run a CoinGecko ingestion entity.")
    .requiredOption("--entity <entity>", "entity to ingest")
    .option("--id <coin_id>", "coin id for parameterized entities")
    .option("--date <dd-mm-yyyy>", "history date for coins_id_history")
    .option("--vs-currency <currency>", "quote currency for coins_id_ohlc")
    .option("--days <days>", "OHLC day window for coins_id_ohlc")
    .option("--page-limit <count>", "page limit for paginated entities")
    .option("--per-page <count>", "page size for paginated entities")
    .action(
      async ({
        entity,
        id,
        date,
        vsCurrency,
        days,
        pageLimit,
        perPage,
      }: {
        entity: string;
        id?: string;
        date?: string;
        vsCurrency?: string;
        days?: string;
        pageLimit?: string;
        perPage?: string;
      }) => {
      try {
        const endpoint = getCoinGeckoEndpoint(entity);
        const count = await runCoinGeckoEntity(endpoint.entity, fetch, { id, date, vsCurrency, days, pageLimit, perPage });
        console.log(`coingecko ${endpoint.entity} ingested ${count} rows`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
