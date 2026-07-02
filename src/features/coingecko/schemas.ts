export type CoinsListRow = {
  id: string;
  symbol: string;
  name: string;
  [key: string]: unknown;
};

export function validateCoinsListRow(row: unknown): CoinsListRow {
  if (!isRecord(row)) {
    throw new Error("coins_list row must be an object");
  }

  for (const key of ["id", "symbol", "name"] as const) {
    if (typeof row[key] !== "string" || row[key].length === 0) {
      throw new Error(`coins_list row missing ${key}`);
    }
  }

  return row as CoinsListRow;
}

export function validateCoinsListRows(rows: unknown): CoinsListRow[] {
  if (!Array.isArray(rows)) {
    throw new Error("coins_list payload must be an array");
  }

  return rows.map(validateCoinsListRow);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
