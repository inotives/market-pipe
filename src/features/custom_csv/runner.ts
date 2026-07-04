import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { checkConfig, getDatabaseUrl, loadEnv } from "../../config.js";
import { type CustomCsvEntityConfig, getCustomCsvEntity } from "./feature.js";
import { parseCustomCsv } from "./parser.js";

type RawRow = {
  id: string;
  entity: string;
  csvPath: string;
  headerShape: string[];
  rowData: Record<string, string>;
};

export function extractCustomCsvRows(entity: string, filePath: string): RawRow[] {
  const config = getCustomCsvEntity(entity);
  const csvPath = resolve(filePath);
  const parsed = parseCustomCsv(readFileSync(csvPath, "utf8"), config);

  const rows = parsed.rows.map((row, index) => toRawRow(config, csvPath, parsed.headers, row, index + 2));
  assertUniqueIds(rows);
  return rows;
}

export async function ingestCustomCsvRows(entity: string, rows: RawRow[], connectionString: string): Promise<number> {
  const config = getCustomCsvEntity(entity);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    for (const row of rows) {
      await client.query(
        `
          insert into ${config.table} (id, entity, csv_path, header_shape, row_data)
          values ($1, $2, $3, $4::jsonb, $5::jsonb)
          on conflict (id) do update
          set entity = excluded.entity,
              csv_path = excluded.csv_path,
              header_shape = excluded.header_shape,
              row_data = excluded.row_data,
              updated_at = now()
        `,
        [row.id, row.entity, row.csvPath, JSON.stringify(row.headerShape), JSON.stringify(row.rowData)],
      );
    }
  } finally {
    await client.end();
  }

  return rows.length;
}

export async function runCustomCsvEconomicTimeSeries(entity: string, filePath: string, env = loadEnv()): Promise<number> {
  const config = getCustomCsvEntity(entity);
  if (config.parser !== "economic_time_series") {
    throw new Error(`Unsupported Custom CSV entity for economic_time_series run path: ${entity}`);
  }

  const dbCheck = checkConfig("db", env);
  if (!dbCheck.ok) {
    throw new Error(`Missing custom_csv run config: ${dbCheck.missing.join(", ")}`);
  }

  const connectionString = getDatabaseUrl(env);
  if (!connectionString) {
    throw new Error("Missing custom_csv run config: MARKET_PIPE__DATABASE_URL");
  }

  return ingestCustomCsvRows(entity, extractCustomCsvRows(entity, filePath), connectionString);
}

export async function runCustomCsvCryptoOhlcv(entity: string, filePath: string, env = loadEnv()): Promise<number> {
  const config = getCustomCsvEntity(entity);
  if (config.parser !== "crypto_ohlcv") {
    throw new Error(`Unsupported Custom CSV entity for crypto_ohlcv run path: ${entity}`);
  }

  const dbCheck = checkConfig("db", env);
  if (!dbCheck.ok) {
    throw new Error(`Missing custom_csv run config: ${dbCheck.missing.join(", ")}`);
  }

  const connectionString = getDatabaseUrl(env);
  if (!connectionString) {
    throw new Error("Missing custom_csv run config: MARKET_PIPE__DATABASE_URL");
  }

  return ingestCustomCsvRows(entity, extractCustomCsvRows(entity, filePath), connectionString);
}

function toRawRow(
  config: CustomCsvEntityConfig,
  csvPath: string,
  headers: string[],
  row: Record<string, string>,
  rowNumber: number,
): RawRow {
  validateRow(config, headers, row, rowNumber);

  const id = buildId(config, row, rowNumber);
  return {
    id,
    entity: config.entity,
    csvPath,
    headerShape: headers,
    rowData: config.asset ? { ...row, asset: config.asset } : row,
  };
}

function buildId(config: CustomCsvEntityConfig, row: Record<string, string>, rowNumber: number): string {
  return config.idFields.map((field) => {
    if (field === "entity") {
      return config.entity;
    }

    const value = row[field];
    if (!value || value.trim() === "") {
      throw new Error(`Custom CSV ${config.entity} row ${rowNumber} is missing ${field}`);
    }

    return value;
  }).join(":");
}

function assertUniqueIds(rows: RawRow[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) {
      throw new Error(`Custom CSV duplicate id in file: ${row.id}`);
    }

    seen.add(row.id);
  }
}

function validateRow(
  config: CustomCsvEntityConfig,
  headers: string[],
  row: Record<string, string>,
  rowNumber: number,
): void {
  for (const header of headers) {
    const value = row[header];
    if (!value || value.trim() === "") {
      throw new Error(`Custom CSV ${config.entity} row ${rowNumber} is missing ${header}`);
    }
  }
}
