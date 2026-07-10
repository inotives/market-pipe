import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { parse } from "yaml";
import { buildTransformProfile, runTransformSubcommand, writeTransformProfile } from "../dist/features/transform/runner.js";

function tempDir() {
  return mkdtempSync(join(tmpdir(), "market-pipe-transform-"));
}

test("transform profile writes a project-local dbt profile from MARKET_PIPE__DATABASE_URL", () => {
  const cwd = tempDir();
  try {
    const profilePath = writeTransformProfile(
      { MARKET_PIPE__DATABASE_URL: "postgres://market_pipe:secret@db.example:5544/warehouse" },
      cwd,
    );

    const profile = parse(readFileSync(profilePath, "utf8"));
    assert.equal(profile.market_pipe.outputs.dev.type, "postgres");
    assert.equal(profile.market_pipe.outputs.dev.host, "db.example");
    assert.equal(profile.market_pipe.outputs.dev.port, 5544);
    assert.equal(profile.market_pipe.outputs.dev.user, "market_pipe");
    assert.equal(profile.market_pipe.outputs.dev.password, "secret");
    assert.equal(profile.market_pipe.outputs.dev.dbname, "warehouse");
    assert.equal(profile.market_pipe.outputs.dev.schema, "public");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("transform profile builder defaults the postgres port", () => {
  const profile = buildTransformProfile("postgres://market_pipe:secret@db.example/warehouse");
  assert.equal(profile.market_pipe.outputs.dev.port, 5432);
});

test("transform helpers fail clearly when MARKET_PIPE__DATABASE_URL is missing", () => {
  assert.throws(() => writeTransformProfile({}, process.cwd()), /Missing transform config: MARKET_PIPE__DATABASE_URL/);
});

test("transform run fails clearly when dbt is missing", () => {
  const cwd = tempDir();
  try {
    assert.throws(
      () =>
        runTransformSubcommand(
          "run",
          { MARKET_PIPE__DATABASE_URL: "postgres://market_pipe:secret@db.example:5432/warehouse" },
          cwd,
          () => ({ pid: 0, output: [], stdout: null, stderr: null, status: null, signal: null, error: Object.assign(new Error("spawn dbt ENOENT"), { code: "ENOENT" }) }),
        ),
      /Install it with: python -m pip install dbt-postgres/,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("transform test shells out to dbt with project-local arguments", () => {
  const cwd = tempDir();
  try {
    const calls = [];
    runTransformSubcommand(
      "test",
      { MARKET_PIPE__DATABASE_URL: "postgres://market_pipe:secret@db.example:5432/warehouse" },
      cwd,
      (command, args, options) => {
        calls.push({ command, args, options });
        return { pid: 1, output: [], stdout: null, stderr: null, status: 0, signal: null };
      },
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "dbt");
    assert.deepEqual(calls[0].args, ["test", "--project-dir", "transforms", "--profiles-dir", "transforms/.dbt"]);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
