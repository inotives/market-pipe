import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";
import {
  getAgentLocalProject,
  getAgentLocalRawTableName,
  getAgentLocalSchemaName,
  loadAgentLocalConfig,
} from "../dist/features/agent_local/feature.js";
import { features } from "../dist/features/index.js";

test("Agent Local config contains the portable agent-pipe project entry", () => {
  const raw = parse(readFileSync("src/features/agent_local/config.yaml", "utf8"));
  assert.deepEqual(raw.projects, [
    {
      projectId: "agent-pipe",
      projectName: "Agent Pipe",
      sqlitePath: ".agent-pipe/data/local.sqlite",
    },
  ]);

  assert.deepEqual(loadAgentLocalConfig().projects, raw.projects);
});

test("Agent Local feature registry includes the skeleton", () => {
  const agentLocal = features.find((feature) => feature.slug === "agent-local");
  assert.ok(agentLocal);
  assert.equal(typeof agentLocal.registerCommands, "function");
});

test("Agent Local project lookup applies the sqlite override", () => {
  assert.deepEqual(
    getAgentLocalProject("agent-pipe", {
      MARKET_PIPE__AGENT_LOCAL_SQLITE_PATH: "/tmp/live.sqlite",
    }),
    {
      projectId: "agent-pipe",
      projectName: "Agent Pipe",
      sqlitePath: "/tmp/live.sqlite",
    },
  );
});

test("Agent Local naming helpers sanitize schema and table names", () => {
  assert.equal(getAgentLocalSchemaName("agent-pipe"), "agent_pipe");
  assert.equal(getAgentLocalRawTableName(".agent-pipe/data/local.sqlite"), "raw_local__records");
  assert.equal(getAgentLocalRawTableName("/tmp/Agent Pipe.DB.sqlite"), "raw_agent_pipe_db__records");
});
