import { existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { DatabaseSync } from "node:sqlite";
import { checkConfig, getDatabaseUrl, loadEnv } from "../../config.js";
import {
  type AgentLocalProjectConfig,
  getAgentLocalProject,
  getAgentLocalRawTableName,
  getAgentLocalSchemaName,
} from "./feature.js";

type SqliteRecordRow = {
  sqlite_rowid: number;
  id: string | null;
  project_id: string | null;
  entity: string | null;
  local_id: string | null;
  source: string | null;
  captured_at: string | null;
  payload_json: string | null;
  metadata_json: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type AgentLocalRawRow = {
  id: string;
  projectId: string;
  projectName: string;
  entity: string;
  localId: string;
  source: string | null;
  sqlitePath: string;
  capturedAt: string | null;
  payload: unknown;
  metadata: unknown | null;
  localCreatedAt: string | null;
  localUpdatedAt: string | null;
  localDeletedAt: string | null;
};

export async function ingestAgentLocalRows(
  project: AgentLocalProjectConfig,
  rows: AgentLocalRawRow[],
  connectionString: string,
): Promise<number> {
  const schemaName = getAgentLocalSchemaName(project.projectId);
  const tableName = getAgentLocalRawTableName(project.sqlitePath);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await ensureAgentLocalRawTable(client, schemaName, tableName);
    for (const row of rows) {
      await client.query(
        `
          insert into ${schemaName}.${tableName} (
            id,
            project_id,
            project_name,
            entity,
            local_id,
            source,
            sqlite_path,
            captured_at,
            payload_jsonb,
            metadata_jsonb,
            local_created_at,
            local_updated_at,
            local_deleted_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::jsonb, $10::jsonb, $11::timestamptz, $12::timestamptz, $13::timestamptz)
          on conflict (id) do update
          set project_id = excluded.project_id,
              project_name = excluded.project_name,
              entity = excluded.entity,
              local_id = excluded.local_id,
              source = excluded.source,
              sqlite_path = excluded.sqlite_path,
              captured_at = excluded.captured_at,
              payload_jsonb = excluded.payload_jsonb,
              metadata_jsonb = excluded.metadata_jsonb,
              local_created_at = excluded.local_created_at,
              local_updated_at = excluded.local_updated_at,
              local_deleted_at = excluded.local_deleted_at,
              updated_at = now()
        `,
        [
          row.id,
          row.projectId,
          row.projectName,
          row.entity,
          row.localId,
          row.source,
          row.sqlitePath,
          row.capturedAt,
          JSON.stringify(row.payload),
          row.metadata == null ? null : JSON.stringify(row.metadata),
          row.localCreatedAt,
          row.localUpdatedAt,
          row.localDeletedAt,
        ],
      );
    }
  } finally {
    await client.end();
  }

  return rows.length;
}

export async function runAgentLocal(projectId: string, options: { entity?: string; env?: Record<string, string | undefined> } = {}): Promise<number> {
  const env = options.env ?? loadEnv();
  const project = getAgentLocalProject(projectId, env);
  const dbCheck = checkConfig("db", env);
  if (!dbCheck.ok) {
    throw new Error(`Missing agent_local run config: ${dbCheck.missing.join(", ")}`);
  }

  const connectionString = getDatabaseUrl(env);
  if (!connectionString) {
    throw new Error("Missing agent_local run config: MARKET_PIPE__DATABASE_URL");
  }

  return ingestAgentLocalRows(project, extractAgentLocalRows(projectId, options), connectionString);
}

export function extractAgentLocalRows(
  projectId: string,
  options: {
    entity?: string;
    env?: Record<string, string | undefined>;
  } = {},
): AgentLocalRawRow[] {
  const project = getAgentLocalProject(projectId, options.env);
  const sqlitePath = resolve(project.sqlitePath);
  if (!existsSync(sqlitePath)) {
    throw new Error(`Agent Local SQLite file does not exist: ${sqlitePath}`);
  }

  const database = new DatabaseSync(sqlitePath, { readOnly: true });
  try {
    const rows = readRecords(database, project, sqlitePath, options.entity);
    if (options.entity && rows.length === 0) {
      throw new Error(`Agent Local project ${project.projectId} has no records for entity ${options.entity}`);
    }

    assertUniqueIds(rows);
    return rows;
  } finally {
    database.close();
  }
}

function readRecords(
  database: DatabaseSync,
  project: AgentLocalProjectConfig,
  sqlitePath: string,
  entity?: string,
): AgentLocalRawRow[] {
  try {
    const statement = entity
      ? database.prepare(`
          select
            rowid as sqlite_rowid,
            id,
            project_id,
            entity,
            local_id,
            source,
            captured_at,
            payload_json,
            metadata_json,
            created_at,
            updated_at,
            deleted_at
          from records
          where project_id = ? and entity = ?
          order by rowid
        `)
      : database.prepare(`
          select
            rowid as sqlite_rowid,
            id,
            project_id,
            entity,
            local_id,
            source,
            captured_at,
            payload_json,
            metadata_json,
            created_at,
            updated_at,
            deleted_at
          from records
          where project_id = ?
          order by rowid
        `);

    const rawRows = (entity ? statement.all(project.projectId, entity) : statement.all(project.projectId)) as SqliteRecordRow[];
    return rawRows.map((row) => toRawRow(project, sqlitePath, row));
  } catch (error) {
    if (error instanceof Error && error.message.includes("no such table: records")) {
      throw new Error(`Agent Local SQLite file is missing records table: ${sqlitePath}`);
    }

    throw error;
  }
}

function toRawRow(project: AgentLocalProjectConfig, sqlitePath: string, row: SqliteRecordRow): AgentLocalRawRow {
  return {
    id: requireText(row.id, "id", row.sqlite_rowid),
    projectId: requireText(row.project_id, "project_id", row.sqlite_rowid),
    projectName: project.projectName,
    entity: requireText(row.entity, "entity", row.sqlite_rowid),
    localId: requireText(row.local_id, "local_id", row.sqlite_rowid),
    source: row.source,
    sqlitePath,
    capturedAt: row.captured_at,
    payload: parseJsonField(row.payload_json, "payload_json", row.sqlite_rowid, false),
    metadata: parseJsonField(row.metadata_json, "metadata_json", row.sqlite_rowid, true),
    localCreatedAt: row.created_at,
    localUpdatedAt: row.updated_at,
    localDeletedAt: row.deleted_at,
  };
}

function requireText(value: string | null, field: string, sqliteRowId: number): string {
  if (!value || value.trim() === "") {
    throw new Error(`Agent Local row ${sqliteRowId} is missing ${field}`);
  }

  return value;
}

function parseJsonField(value: string | null, field: string, sqliteRowId: number, nullable: boolean): unknown | null {
  if (value == null) {
    if (nullable) {
      return null;
    }

    throw new Error(`Agent Local row ${sqliteRowId} is missing ${field}`);
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Agent Local row ${sqliteRowId} has invalid ${field}`);
  }
}

function assertUniqueIds(rows: AgentLocalRawRow[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) {
      throw new Error(`Agent Local duplicate id in SQLite records: ${row.id}`);
    }

    seen.add(row.id);
  }
}

async function ensureAgentLocalRawTable(client: pg.Client, schemaName: string, tableName: string): Promise<void> {
  assertIdentifier(schemaName, "schema");
  assertIdentifier(tableName, "table");

  await client.query(`create schema if not exists ${schemaName}`);
  await client.query(`
    create table if not exists ${schemaName}.${tableName} (
      id text primary key,
      project_id text not null,
      project_name text not null,
      entity text not null,
      local_id text not null,
      source text,
      sqlite_path text not null,
      captured_at timestamptz,
      payload_jsonb jsonb not null,
      metadata_jsonb jsonb,
      local_created_at timestamptz,
      local_updated_at timestamptz,
      local_deleted_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

function assertIdentifier(value: string, label: string): void {
  if (!/^[a-z0-9_]+$/.test(value)) {
    throw new Error(`Invalid Agent Local ${label} identifier: ${value}`);
  }
}
