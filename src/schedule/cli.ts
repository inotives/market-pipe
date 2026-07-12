import type { Command } from "commander";
import { writeCronArtifact } from "./renderer.js";

export function registerScheduleCommands(program: Command): void {
  const schedule = program.command("schedule").description("Render external scheduler artifacts.");
  const cron = schedule.command("cron").description("Render host cron artifacts.");

  cron
    .command("render")
    .description("Write a deterministic cron artifact from feature schedule metadata.")
    .requiredOption("--bin <path>", "absolute path to the market-pipe executable")
    .requiredOption("--output <path>", "artifact output path")
    .option("--env-file <path>", "shell-compatible env file to source before each command")
    .option("--log-dir <path>", "directory for per-job stdout/stderr logs")
    .action(
      ({
        bin,
        output,
        envFile,
        logDir,
      }: {
        bin: string;
        output: string;
        envFile?: string;
        logDir?: string;
      }) => {
        try {
          const outputPath = writeCronArtifact({
            binPath: bin,
            outputPath: output,
            envFile,
            logDir,
          });
          console.log(`schedule cron render wrote ${outputPath}`);
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      },
    );
}
