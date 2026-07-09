import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { extractAgentLocalRows } from "../dist/features/agent_local/runner.js";

function withTempSqlite(setup) {
  const root = mkdtempSync(join(tmpdir(), "market-pipe-agent-local-"));
  const sqlitePath = join(root, ".agent-pipe", "data", "local.sqlite");
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const database = new DatabaseSync(sqlitePath);
  try {
    setup(database, sqlitePath);
  } finally {
    database.close();
    rmSync(root, { recursive: true, force: true });
  }
}

function createRecordsTable(database) {
  database.exec(`
    create table records (
      id text,
      project_id text,
      entity text,
      local_id text,
      source text,
      captured_at text,
      payload_json text,
      metadata_json text,
      created_at text,
      updated_at text,
      deleted_at text
    )
  `);
}

function insertRecord(database, record) {
  const statement = database.prepare(`
    insert into records (
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
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  statement.run(
    record.id ?? null,
    record.project_id ?? null,
    record.entity ?? null,
    record.local_id ?? null,
    record.source ?? null,
    record.captured_at ?? null,
    record.payload_json ?? null,
    record.metadata_json ?? null,
    record.created_at ?? null,
    record.updated_at ?? null,
    record.deleted_at ?? null,
  );
}

test("Agent Local extraction fails clearly when the SQLite file is missing", () => {
  const missingPath = join(tmpdir(), `market-pipe-missing-${Date.now()}`, "local.sqlite");
  assert.equal(existsSync(missingPath), false);
  assert.throws(
    () => extractAgentLocalRows("agent-pipe", { env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: missingPath } }),
    new RegExp(`Agent Local SQLite file does not exist: ${missingPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  );
});

test("Agent Local extraction fails clearly when the records table is missing", () => {
  withTempSqlite((_database, sqlitePath) => {
    assert.throws(
      () => extractAgentLocalRows("agent-pipe", { env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath } }),
      new RegExp(`Agent Local SQLite file is missing records table: ${sqlitePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    );
  });
});

test("Agent Local extraction filters by project and preserves parsed record fields", () => {
  withTempSqlite((database, sqlitePath) => {
    createRecordsTable(database);
    insertRecord(database, {
      id: "agent-pipe:rates:[\"2025-04-26\"]",
      project_id: "agent-pipe",
      entity: "rates",
      local_id: "[\"2025-04-26\"]",
      source: "manual",
      captured_at: "2025-04-26T00:00:00Z",
      payload_json: "{\"usd\":1.07}",
      metadata_json: "{\"note\":\"ok\"}",
      created_at: "2025-04-26T00:01:00Z",
      updated_at: "2025-04-26T00:02:00Z",
      deleted_at: null,
    });
    insertRecord(database, {
      id: "other-project:rates:[\"2025-04-26\"]",
      project_id: "other-project",
      entity: "rates",
      local_id: "[\"2025-04-26\"]",
      source: "manual",
      captured_at: "2025-04-26T00:00:00Z",
      payload_json: "{\"usd\":2}",
      metadata_json: null,
      created_at: "2025-04-26T00:01:00Z",
      updated_at: "2025-04-26T00:02:00Z",
      deleted_at: null,
    });

    assert.deepEqual(extractAgentLocalRows("agent-pipe", { env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath } }), [
      {
        id: "agent-pipe:rates:[\"2025-04-26\"]",
        projectId: "agent-pipe",
        projectName: "Agent Pipe",
        entity: "rates",
        localId: "[\"2025-04-26\"]",
        source: "manual",
        sqlitePath,
        capturedAt: "2025-04-26T00:00:00Z",
        payload: { usd: 1.07 },
        metadata: { note: "ok" },
        localCreatedAt: "2025-04-26T00:01:00Z",
        localUpdatedAt: "2025-04-26T00:02:00Z",
        localDeletedAt: null,
      },
    ]);
  });
});

test("Agent Local extraction filters by entity and fails clearly when none match", () => {
  withTempSqlite((database, sqlitePath) => {
    createRecordsTable(database);
    insertRecord(database, {
      id: "agent-pipe:notes:[\"1\"]",
      project_id: "agent-pipe",
      entity: "notes",
      local_id: "[\"1\"]",
      source: null,
      captured_at: null,
      payload_json: "{\"body\":\"hello\"}",
      metadata_json: null,
      created_at: null,
      updated_at: null,
      deleted_at: null,
    });

    assert.deepEqual(
      extractAgentLocalRows("agent-pipe", {
        entity: "notes",
        env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath },
      }).map((row) => row.entity),
      ["notes"],
    );

    assert.throws(
      () =>
        extractAgentLocalRows("agent-pipe", {
          entity: "rates",
          env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath },
        }),
      /Agent Local project agent-pipe has no records for entity rates/,
    );
  });
});

test("Agent Local extraction fails with row context when required fields are missing", () => {
  withTempSqlite((database, sqlitePath) => {
    createRecordsTable(database);
    insertRecord(database, {
      id: "agent-pipe:notes:[\"1\"]",
      project_id: "agent-pipe",
      entity: "notes",
      local_id: null,
      source: null,
      captured_at: null,
      payload_json: "{\"body\":\"hello\"}",
      metadata_json: null,
      created_at: null,
      updated_at: null,
      deleted_at: null,
    });

    assert.throws(
      () => extractAgentLocalRows("agent-pipe", { env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath } }),
      /Agent Local row 1 is missing local_id/,
    );
  });
});

test("Agent Local extraction fails clearly on invalid JSON", () => {
  withTempSqlite((database, sqlitePath) => {
    createRecordsTable(database);
    insertRecord(database, {
      id: "agent-pipe:rates:[\"2025-04-26\"]",
      project_id: "agent-pipe",
      entity: "rates",
      local_id: "[\"2025-04-26\"]",
      source: null,
      captured_at: null,
      payload_json: "{broken",
      metadata_json: "{\"note\":\"ok\"}",
      created_at: null,
      updated_at: null,
      deleted_at: null,
    });

    assert.throws(
      () => extractAgentLocalRows("agent-pipe", { env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath } }),
      /Agent Local row 1 has invalid payload_json/,
    );

    database.exec("delete from records");
    insertRecord(database, {
      id: "agent-pipe:rates:[\"2025-04-26\"]",
      project_id: "agent-pipe",
      entity: "rates",
      local_id: "[\"2025-04-26\"]",
      source: null,
      captured_at: null,
      payload_json: "{\"usd\":1.07}",
      metadata_json: "{broken",
      created_at: null,
      updated_at: null,
      deleted_at: null,
    });

    assert.throws(
      () => extractAgentLocalRows("agent-pipe", { env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath } }),
      /Agent Local row 1 has invalid metadata_json/,
    );
  });
});

test("Agent Local extraction fails before downstream writes when duplicate ids exist", () => {
  withTempSqlite((database, sqlitePath) => {
    createRecordsTable(database);
    insertRecord(database, {
      id: "agent-pipe:rates:[\"2025-04-26\"]",
      project_id: "agent-pipe",
      entity: "rates",
      local_id: "[\"2025-04-26\"]",
      source: null,
      captured_at: null,
      payload_json: "{\"usd\":1.07}",
      metadata_json: null,
      created_at: null,
      updated_at: null,
      deleted_at: null,
    });
    insertRecord(database, {
      id: "agent-pipe:rates:[\"2025-04-26\"]",
      project_id: "agent-pipe",
      entity: "rates",
      local_id: "[\"2025-04-27\"]",
      source: null,
      captured_at: null,
      payload_json: "{\"usd\":1.08}",
      metadata_json: null,
      created_at: null,
      updated_at: null,
      deleted_at: null,
    });

    assert.throws(
      () => extractAgentLocalRows("agent-pipe", { env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath } }),
      /Agent Local duplicate id in SQLite records: agent-pipe:rates:\["2025-04-26"\]/,
    );
  });
});
