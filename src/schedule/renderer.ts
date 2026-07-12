import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { features } from "../features/index.js";
import { type FeatureSchedule, validateFeatureSchedule } from "../features/schedule.js";

type FeatureWithConfig = {
  slug: string;
  loadConfig?: () => unknown;
};

type SourceScheduleJob = {
  cadence: "hourly" | "daily";
  feature: string;
  entity: string;
  schedule: Exclude<FeatureSchedule, { type: "manual" }>;
  cliArgs: string[];
};

type CronJob = {
  cadence: "hourly" | "daily";
  feature: string;
  entity: string;
  cron: string;
  command: string;
  sortTime: number;
};

export type RenderCronOptions = {
  binPath: string;
  outputPath: string;
  envFile?: string;
  logDir?: string;
};

export function renderCronArtifact(
  { binPath, envFile, logDir }: Omit<RenderCronOptions, "outputPath">,
  featureList: FeatureWithConfig[] = features,
): string {
  if (!isAbsolute(binPath)) {
    throw new Error(`schedule cron render requires --bin to be an absolute path: ${binPath}`);
  }

  const jobs = collectSourceScheduleJobs(featureList).map((job) => toCronJob(job, binPath, envFile, logDir));
  const transformJobs = deriveTransformJobs(jobs, binPath, envFile, logDir);
  const lines = [
    "CRON_TZ=UTC",
    ...[...jobs, ...transformJobs]
      .sort(compareCronJobs)
      .map((job) => `${job.cron} ${job.command}`),
  ];

  return `${lines.join("\n")}\n`;
}

export function writeCronArtifact(options: RenderCronOptions, featureList: FeatureWithConfig[] = features): string {
  const artifact = renderCronArtifact(options, featureList);
  mkdirSync(dirname(options.outputPath), { recursive: true });
  writeFileSync(options.outputPath, artifact, "utf8");
  return options.outputPath;
}

function collectSourceScheduleJobs(featureList: FeatureWithConfig[]): SourceScheduleJob[] {
  return featureList.flatMap((feature) => {
    if (typeof feature.loadConfig !== "function") {
      return [];
    }

    return collectScheduledItems(feature.slug, feature.loadConfig());
  });
}

function collectScheduledItems(feature: string, value: unknown): SourceScheduleJob[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectScheduledItems(feature, item));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.entity === "string" && candidate.schedule !== undefined) {
    const schedule = validateFeatureSchedule(candidate.schedule, `Feature ${feature} entity ${candidate.entity}`);
    if (schedule.type === "manual") {
      return [];
    }

    return [{
      cadence: schedule.type,
      feature,
      entity: candidate.entity,
      schedule,
      cliArgs: schedule.cliArgs,
    }];
  }

  return Object.values(candidate).flatMap((item) => collectScheduledItems(feature, item));
}

function toCronJob(job: SourceScheduleJob, binPath: string, envFile?: string, logDir?: string): CronJob {
  if (job.schedule.type === "hourly") {
    return {
      cadence: "hourly",
      feature: job.feature,
      entity: job.entity,
      cron: `${job.schedule.minute} * * * *`,
      command: buildCommand(binPath, job.cliArgs, envFile, logDir, job.cadence, job.feature, job.entity),
      sortTime: job.schedule.minute,
    };
  }

  const [hour, minute, second] = job.schedule.timeUtc.split(":").map(Number);
  if (second !== 0) {
    throw new Error(
      `Feature ${job.feature} entity ${job.entity} daily schedule cannot render non-zero seconds in five-field cron`,
    );
  }

  return {
    cadence: "daily",
    feature: job.feature,
    entity: job.entity,
    cron: `${minute} ${hour} * * *`,
    command: buildCommand(binPath, job.cliArgs, envFile, logDir, job.cadence, job.feature, job.entity),
    sortTime: hour * 60 + minute,
  };
}

function deriveTransformJobs(sourceJobs: CronJob[], binPath: string, envFile?: string, logDir?: string): CronJob[] {
  const transformJobs: CronJob[] = [];
  const hourlySourceJobs = sourceJobs.filter((job) => job.cadence === "hourly");
  if (hourlySourceJobs.length > 0) {
    const minute = (Math.max(...hourlySourceJobs.map((job) => job.sortTime)) + 10) % 60;
    transformJobs.push({
      cadence: "hourly",
      feature: "transform",
      entity: "run",
      cron: `${minute} * * * *`,
      command: buildCommand(binPath, ["transform", "run"], envFile, logDir, "hourly", "transform", "run"),
      sortTime: minute,
    });
  }

  const dailySourceJobs = sourceJobs.filter((job) => job.cadence === "daily");
  if (dailySourceJobs.length > 0) {
    const latestDailyMinutes = Math.max(...dailySourceJobs.map((job) => job.sortTime));
    if (latestDailyMinutes > (24 * 60) - 10) {
      throw new Error("daily transform cron cannot be scheduled +10 minutes after a source later than 23:50 UTC");
    }

    const totalMinutes = latestDailyMinutes + 10;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    transformJobs.push({
      cadence: "daily",
      feature: "transform",
      entity: "run",
      cron: `${minute} ${hour} * * *`,
      command: buildCommand(binPath, ["transform", "run"], envFile, logDir, "daily", "transform", "run"),
      sortTime: totalMinutes,
    });
  }

  return transformJobs;
}

function buildCommand(
  binPath: string,
  cliArgs: string[],
  envFile: string | undefined,
  logDir: string | undefined,
  cadence: string,
  feature: string,
  entity: string,
): string {
  let command = [binPath, ...cliArgs].map(shellQuote).join(" ");

  if (envFile) {
    command = `set -a && . ${shellQuote(envFile)} && set +a && ${command}`;
  }

  if (logDir) {
    command = `${command} >> ${shellQuote(join(logDir, `${cadence}-${feature}-${entity}.log`))} 2>&1`;
  }

  return command;
}

function compareCronJobs(left: CronJob, right: CronJob): number {
  const cadenceRank = cadenceOrder(left.cadence) - cadenceOrder(right.cadence);
  if (cadenceRank !== 0) {
    return cadenceRank;
  }

  const timeRank = left.sortTime - right.sortTime;
  if (timeRank !== 0) {
    return timeRank;
  }

  const featureRank = left.feature.localeCompare(right.feature);
  if (featureRank !== 0) {
    return featureRank;
  }

  return left.entity.localeCompare(right.entity);
}

function cadenceOrder(cadence: CronJob["cadence"]): number {
  return cadence === "hourly" ? 0 : 1;
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}
