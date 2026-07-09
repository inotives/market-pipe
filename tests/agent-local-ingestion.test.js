import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import pg from "pg";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { getDatabaseUrl, loadEnv } from "../dist/config.js";
import { bootstrapDatabase } from "../dist/db.js";
import {
  extractAgentLocalRows,
  ingestAgentLocalRows,
  runAgentLocal,
} from "../dist/features/agent_local/runner.js";
import { getAgentLocalProject } from "../dist/features/agent_local/feature.js";

async function withTempSqlite(setup) {
  const root = mkdtempSync(join(tmpdir(), "market-pipe-agent-local-db-"));
  const sqlitePath = join(root, ".agent-pipe", "data", "local.sqlite");
  const dir = dirname(sqlitePath);
  mkdirSync(dir, { recursive: true });
  const database = new DatabaseSync(sqlitePath);
  try {
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
    await setup(database, sqlitePath);
  } finally {
    database.close();
    rmSync(root, { recursive: true, force: true });
  }
}

function insertRecord(database, record) {
  database.prepare(`
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
  `).run(
    record.id,
    record.project_id,
    record.entity,
    record.local_id,
    record.source ?? null,
    record.captured_at ?? null,
    record.payload_json,
    record.metadata_json ?? null,
    record.created_at ?? null,
    record.updated_at ?? null,
    record.deleted_at ?? null,
  );
}

test("Agent Local raw landing creates the project schema/table and preserves source rows", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  await withTempSqlite(async (database, sqlitePath) => {
    insertRecord(database, {
      id: "agent-pipe:rates:[\"2025-04-26\"]",
      project_id: "agent-pipe",
      entity: "rates",
      local_id: "[\"2025-04-26\"]",
      source: "manual",
      captured_at: "2025-04-26T00:00:00Z",
      payload_json: "{\"usd\":1.07}",
      metadata_json: "{\"note\":\"first\"}",
      created_at: "2025-04-26T00:01:00Z",
      updated_at: "2025-04-26T00:02:00Z",
      deleted_at: null,
    });

    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
      await client.query("drop schema if exists agent_pipe cascade");
    } finally {
      await client.end();
    }

    const rows = extractAgentLocalRows("agent-pipe", { env: { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath } });
    const project = getAgentLocalProject("agent-pipe", { MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath });
    await ingestAgentLocalRows(project, rows, connectionString);

    const verify = new pg.Client({ connectionString });
    await verify.connect();
    try {
      const result = await verify.query(`
        select id, project_id, project_name, entity, local_id, source, sqlite_path,
               captured_at, payload_jsonb, metadata_jsonb, local_created_at, local_updated_at, local_deleted_at
        from agent_pipe.raw_local__records
        where id = 'agent-pipe:rates:["2025-04-26"]'
      `);

      assert.equal(result.rowCount, 1);
      assert.equal(result.rows[0].project_id, "agent-pipe");
      assert.equal(result.rows[0].project_name, "Agent Pipe");
      assert.equal(result.rows[0].entity, "rates");
      assert.equal(result.rows[0].local_id, "[\"2025-04-26\"]");
      assert.equal(result.rows[0].source, "manual");
      assert.equal(result.rows[0].sqlite_path, sqlitePath);
      assert.equal(result.rows[0].payload_jsonb.usd, 1.07);
      assert.equal(result.rows[0].metadata_jsonb.note, "first");
      assert.ok(result.rows[0].captured_at);
      assert.ok(result.rows[0].local_created_at);
      assert.ok(result.rows[0].local_updated_at);
      assert.equal(result.rows[0].local_deleted_at, null);
    } finally {
      await verify.end();
    }
  });
});

test("Agent Local raw landing is idempotent and updates payload, metadata, and soft delete fields", { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS }, async () => {
  await bootstrapDatabase();
  const connectionString = getDatabaseUrl(loadEnv());
  assert.ok(connectionString);

  await withTempSqlite(async (database, sqlitePath) => {
    insertRecord(database, {
      id: "agent-pipe:rates:[\"2025-04-26\"]",
      project_id: "agent-pipe",
      entity: "rates",
      local_id: "[\"2025-04-26\"]",
      source: "manual",
      captured_at: "2025-04-26T00:00:00Z",
      payload_json: "{\"usd\":1.07}",
      metadata_json: "{\"note\":\"first\"}",
      created_at: "2025-04-26T00:01:00Z",
      updated_at: "2025-04-26T00:02:00Z",
      deleted_at: null,
    });

    const cleanup = new pg.Client({ connectionString });
    await cleanup.connect();
    try {
      await cleanup.query("drop schema if exists agent_pipe cascade");
    } finally {
      await cleanup.end();
    }

    await runAgentLocal("agent-pipe", { env: { ...loadEnv(), MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath } });

    database.exec("delete from records");
    insertRecord(database, {
      id: "agent-pipe:rates:[\"2025-04-26\"]",
      project_id: "agent-pipe",
      entity: "rates",
      local_id: "[\"2025-04-26\"]",
      source: "manual",
      captured_at: "2025-04-26T00:00:00Z",
      payload_json: "{\"usd\":1.08}",
      metadata_json: "{\"note\":\"updated\"}",
      created_at: "2025-04-26T00:01:00Z",
      updated_at: "2025-04-26T00:03:00Z",
      deleted_at: "2025-04-27T00:00:00Z",
    });

    await runAgentLocal("agent-pipe", { env: { ...loadEnv(), MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: sqlitePath } });

    const verify = new pg.Client({ connectionString });
    await verify.connect();
    try {
      const result = await verify.query(`
        select id, payload_jsonb, metadata_jsonb, local_updated_at, local_deleted_at
        from agent_pipe.raw_local__records
        where id = 'agent-pipe:rates:["2025-04-26"]'
      `);

      assert.equal(result.rowCount, 1);
      assert.equal(result.rows[0].payload_jsonb.usd, 1.08);
      assert.equal(result.rows[0].metadata_jsonb.note, "updated");
      assert.ok(result.rows[0].local_updated_at);
      assert.ok(result.rows[0].local_deleted_at);
    } finally {
      await verify.end();
    }
  });
});

test(
  "opt-in live Agent Local acceptance syncs the full sqlite fixture and preserves grouped counts on rerun",
  { skip: !process.env.MARKET_PIPE__RUN_DB_TESTS || !process.env.MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH || !existsSync(process.env.MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH) },
  async () => {
    await bootstrapDatabase();
    const env = loadEnv();
    const connectionString = getDatabaseUrl(env);
    assert.ok(connectionString);

    const sqlitePath = process.env.MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH ?? "";
    const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
    let expectedCounts;
    try {
      expectedCounts = sqlite.prepare(`
        select project_id, entity, count(*) as count
        from records
        where project_id = ?
        group by project_id, entity
        order by project_id, entity
      `).all("agent-pipe").map((row) => ({
        project_id: row.project_id,
        entity: row.entity,
        count: Number(row.count),
      }));
    } finally {
      sqlite.close();
    }

    assert.ok(expectedCounts.length > 0);

    const cleanup = new pg.Client({ connectionString });
    await cleanup.connect();
    try {
      await cleanup.query("drop schema if exists agent_pipe cascade");
    } finally {
      await cleanup.end();
    }

    await runAgentLocal("agent-pipe", { env });
    await runAgentLocal("agent-pipe", { env });

    const verify = new pg.Client({ connectionString });
    await verify.connect();
    try {
      const actualCounts = await verify.query(`
        select project_id, entity, count(*)::int as count
        from agent_pipe.raw_local__records
        where project_id = 'agent-pipe'
        group by project_id, entity
        order by project_id, entity
      `);

      assert.deepEqual(actualCounts.rows, expectedCounts);
    } finally {
      await verify.end();
    }
  },
);
