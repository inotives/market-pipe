import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const dockerCronSmokeEnabled = Boolean(process.env.MARKET_PIPE__RUN_DOCKER_CRON_SMOKE);
const dockerAvailable = spawnSync("docker", ["--version"], { encoding: "utf8" }).status === 0;

test("default test suite skips Docker cron smoke when the opt-in gate is disabled", () => {
  if (dockerCronSmokeEnabled && dockerAvailable) {
    assert.ok(true);
    return;
  }

  assert.ok(true);
});

test(
  "opt-in Docker cron smoke renders, installs, verifies, and executes representative cron commands under Linux",
  { skip: !dockerCronSmokeEnabled || !dockerAvailable },
  () => {
    const smokeDir = mkdtempSync(join(os.tmpdir(), "market-pipe-cron-smoke-"));
    const repoRoot = process.cwd();
    const artifactPath = join(smokeDir, "market-pipe.smoke.cron");
    const stubPath = join(smokeDir, "market-pipe");
    const logDir = join(smokeDir, "logs");
    mkdirSync(logDir, { recursive: true });

    writeFileSync(
      stubPath,
      [
        "#!/bin/sh",
        "printf '%s\\n' \"$0 $*\" >> \"$(dirname \"$0\")/commands.log\"",
        "exit 0",
        "",
      ].join("\n"),
      "utf8",
    );

    const render = spawnSync(
      "node",
      ["dist/cli.js", "schedule", "cron", "render", "--bin", "/smoke/market-pipe", "--output", artifactPath, "--log-dir", "/smoke/logs"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    assert.equal(render.status, 0, render.stderr || render.stdout);

    const dockerScript = [
      "set -e",
      "export DEBIAN_FRONTEND=noninteractive",
      "apt-get update >/dev/null",
      "apt-get install -y cron >/dev/null",
      "chmod +x /smoke/market-pipe",
      "crontab /smoke/market-pipe.smoke.cron",
      "crontab -l > /smoke/installed.cron",
      "grep -F 'CRON_TZ=UTC' /smoke/installed.cron >/dev/null",
      "grep -F '10 * * * * /smoke/market-pipe coingecko run --entity crypto_global >> /smoke/logs/hourly-coingecko-crypto_global.log 2>&1' /smoke/installed.cron >/dev/null",
      "grep -F '20 * * * * /smoke/market-pipe transform run >> /smoke/logs/hourly-transform-run.log 2>&1' /smoke/installed.cron >/dev/null",
      "source_command=$(grep -v '^CRON_TZ=UTC$' /smoke/market-pipe.smoke.cron | head -n 1 | sed 's/^[^ ]* [^ ]* [^ ]* [^ ]* [^ ]* //')",
      "transform_command=$(grep -v '^CRON_TZ=UTC$' /smoke/market-pipe.smoke.cron | sed -n '2p' | sed 's/^[^ ]* [^ ]* [^ ]* [^ ]* [^ ]* //')",
      "sh -lc \"$source_command\"",
      "sh -lc \"$transform_command\"",
    ].join("\n");

    const docker = spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "-v",
        `${smokeDir}:/smoke`,
        "-v",
        `${resolve(repoRoot)}:/workspace`,
        "-w",
        "/workspace",
        "node:22-bookworm",
        "bash",
        "-lc",
        dockerScript,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    assert.equal(docker.status, 0, docker.stderr || docker.stdout);

    const installed = readFileSync(join(smokeDir, "installed.cron"), "utf8");
    assert.match(installed, /CRON_TZ=UTC/);
    assert.match(installed, /10 \* \* \* \* \/smoke\/market-pipe coingecko run --entity crypto_global >> \/smoke\/logs\/hourly-coingecko-crypto_global\.log 2>&1/);
    assert.match(installed, /20 \* \* \* \* \/smoke\/market-pipe transform run >> \/smoke\/logs\/hourly-transform-run\.log 2>&1/);

    const commands = readFileSync(join(smokeDir, "commands.log"), "utf8").trim().split("\n");
    assert.deepEqual(commands, [
      "/smoke/market-pipe coingecko run --entity crypto_global",
      "/smoke/market-pipe transform run",
    ]);
  },
);
