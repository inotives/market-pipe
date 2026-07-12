export type ManualFeatureSchedule = {
  type: "manual";
};

export type HourlyFeatureSchedule = {
  type: "hourly";
  minute: number;
  cliArgs: string[];
};

export type DailyFeatureSchedule = {
  type: "daily";
  timeUtc: string;
  cliArgs: string[];
};

export type FeatureSchedule = ManualFeatureSchedule | HourlyFeatureSchedule | DailyFeatureSchedule;

const timeUtcPattern = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export function validateFeatureSchedule(schedule: unknown, label: string): FeatureSchedule {
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
    throw new Error(`${label} schedule must be an object`);
  }

  const candidate = schedule as Record<string, unknown>;
  if (candidate.type === "manual") {
    return { type: "manual" };
  }

  if (candidate.type === "hourly") {
    if (!Number.isInteger(candidate.minute) || (candidate.minute as number) < 0 || (candidate.minute as number) > 59) {
      throw new Error(`${label} hourly schedule must contain minute from 0 to 59`);
    }

    return {
      type: "hourly",
      minute: candidate.minute as number,
      cliArgs: validateCliArgs(candidate.cliArgs, label),
    };
  }

  if (candidate.type === "daily") {
    if (typeof candidate.timeUtc !== "string" || !timeUtcPattern.test(candidate.timeUtc)) {
      throw new Error(`${label} daily schedule must contain timeUtc in HH:MM:SS format`);
    }

    return {
      type: "daily",
      timeUtc: candidate.timeUtc,
      cliArgs: validateCliArgs(candidate.cliArgs, label),
    };
  }

  throw new Error(`${label} schedule type must be hourly, daily, or manual`);
}

function validateCliArgs(cliArgs: unknown, label: string): string[] {
  if (!Array.isArray(cliArgs) || cliArgs.length === 0) {
    throw new Error(`${label} scheduled config must contain cliArgs`);
  }

  if (cliArgs.some((arg) => typeof arg !== "string" || arg.trim() === "")) {
    throw new Error(`${label} scheduled config cliArgs must contain non-empty strings`);
  }

  return [...cliArgs];
}
