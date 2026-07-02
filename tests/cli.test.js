import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

test("prints help for the planned command tree", () => {
  const output = execFileSync("node", ["dist/cli.js", "--help"], { encoding: "utf8" });

  assert.match(output, /Usage: market-pipe/);
  assert.match(output, /config/);
  assert.match(output, /db/);
  assert.match(output, /coingecko/);
});
