import type { CustomCsvEntityConfig, CustomCsvParser } from "./feature.js";

export type ParsedCsvRow = Record<string, string>;

export type ParsedCsv = {
  headers: string[];
  rows: ParsedCsvRow[];
};

type Parser = (content: string, entity: CustomCsvEntityConfig) => ParsedCsv;

const parsers: Record<CustomCsvParser, Parser> = {
  economic_time_series: parseConfiguredCsv,
  crypto_ohlcv: parseConfiguredCsv,
};

export function parseCustomCsv(content: string, entity: CustomCsvEntityConfig): ParsedCsv {
  const parser = parsers[entity.parser];
  if (!parser) {
    throw new Error(`Unsupported Custom CSV parser: ${entity.parser}`);
  }

  return parser(content, entity);
}

export function stripUtf8Bom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

export function validateHeaders(headers: string[], expectedHeaders: string[]): string[] {
  const normalized = headers.map((header, index) => (index === 0 ? stripUtf8Bom(header) : header));
  if (
    normalized.length !== expectedHeaders.length
    || normalized.some((header, index) => header !== expectedHeaders[index])
  ) {
    throw new Error(
      `CSV header mismatch: expected ${expectedHeaders.join(", ")}; received ${normalized.join(", ")}`,
    );
  }

  return normalized;
}

function parseConfiguredCsv(content: string, entity: CustomCsvEntityConfig): ParsedCsv {
  const lines = content.replace(/\r\n/g, "\n").split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) {
    throw new Error(`CSV file for ${entity.entity} is empty`);
  }

  const headers = validateHeaders(splitRow(lines[0], entity.delimiter), entity.expectedHeaders);
  const rows = lines.slice(1).map((line, index) => toRow(headers, splitRow(line, entity.delimiter), index + 2));
  return { headers, rows };
}

function splitRow(line: string, delimiter: string): string[] {
  return line.split(delimiter);
}

function toRow(headers: string[], values: string[], rowNumber: number): ParsedCsvRow {
  if (headers.length !== values.length) {
    throw new Error(`CSV row ${rowNumber} has ${values.length} columns; expected ${headers.length}`);
  }

  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
}
