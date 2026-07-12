import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderCronArtifact } from "../dist/schedule/renderer.js";

test("cron renderer omits manual jobs and derives transform timing", () => {
  const artifact = renderCronArtifact({
    binPath: "/opt/market-pipe/bin/market-pipe",
    envFile: "/etc/market-pipe.env",
    logDir: "/var/log/market-pipe",
  });

  assert.doesNotMatch(artifact, /coins_categories/);
  assert.match(artifact, /20 \* \* \* \* set -a && \. \/etc\/market-pipe.env && set \+a && \/opt\/market-pipe\/bin\/market-pipe transform run >> \/var\/log\/market-pipe\/hourly-transform-run.log 2>&1/);
  assert.match(artifact, /10 2 \* \* \* set -a && \. \/etc\/market-pipe.env && set \+a && \/opt\/market-pipe\/bin\/market-pipe transform run >> \/var\/log\/market-pipe\/daily-transform-run.log 2>&1/);
});

test("cron renderer sorts deterministically by cadence time feature and entity", () => {
  const artifact = renderCronArtifact({ binPath: "/usr/local/bin/market-pipe" }, [
    {
      slug: "beta",
      loadConfig: () => ({
        endpoints: [
          { entity: "zeta", schedule: { type: "daily", timeUtc: "03:00:00", cliArgs: ["beta", "run", "--entity", "zeta"] } },
          { entity: "alpha", schedule: { type: "daily", timeUtc: "03:00:00", cliArgs: ["beta", "run", "--entity", "alpha"] } },
          { entity: "hour", schedule: { type: "hourly", minute: 5, cliArgs: ["beta", "run", "--entity", "hour"] } },
        ],
      }),
    },
    {
      slug: "alpha",
      loadConfig: () => ({
        endpoints: [
          { entity: "bravo", schedule: { type: "daily", timeUtc: "03:00:00", cliArgs: ["alpha", "run", "--entity", "bravo"] } },
        ],
      }),
    },
  ]);

  assert.equal(
    artifact,
    [
      "CRON_TZ=UTC",
      "5 * * * * /usr/local/bin/market-pipe beta run --entity hour",
      "15 * * * * /usr/local/bin/market-pipe transform run",
      "0 3 * * * /usr/local/bin/market-pipe alpha run --entity bravo",
      "0 3 * * * /usr/local/bin/market-pipe beta run --entity alpha",
      "0 3 * * * /usr/local/bin/market-pipe beta run --entity zeta",
      "10 3 * * * /usr/local/bin/market-pipe transform run",
      "",
    ].join("\n"),
  );
});

test("cron renderer fails clearly on invalid schedule metadata", () => {
  assert.throws(
    () =>
      renderCronArtifact({ binPath: "/usr/local/bin/market-pipe" }, [
        {
          slug: "broken",
          loadConfig: () => ({
            endpoints: [
              {
                entity: "bad_seconds",
                schedule: {
                  type: "daily",
                  timeUtc: "03:00:01",
                  cliArgs: ["broken", "run", "--entity", "bad_seconds"],
                },
              },
            ],
          }),
        },
      ]),
    /cannot render non-zero seconds in five-field cron/,
  );
});

test("cron renderer fails clearly when a daily transform would wrap into the next day", () => {
  assert.throws(
    () =>
      renderCronArtifact({ binPath: "/usr/local/bin/market-pipe" }, [
        {
          slug: "late",
          loadConfig: () => ({
            endpoints: [
              {
                entity: "close_of_day",
                schedule: {
                  type: "daily",
                  timeUtc: "23:55:00",
                  cliArgs: ["late", "run", "--entity", "close_of_day"],
                },
              },
            ],
          }),
        },
      ]),
    /daily transform cron cannot be scheduled \+10 minutes after a source later than 23:50 UTC/,
  );
});

test("checked-in cron artifact matches the current renderer contract", () => {
  assert.equal(
    readFileSync("ops/cron/market-pipe.cron", "utf8"),
    renderCronArtifact({ binPath: "/usr/local/bin/market-pipe" }),
  );
});
