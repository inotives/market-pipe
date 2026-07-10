import type { Command } from "commander";
import { runTransformSubcommand, writeTransformProfile } from "./runner.js";

export function registerTransformCommands(program: Command): void {
  const transform = program.command("transform").description("Run dbt transform helpers.");

  transform
    .command("profile")
    .description("Write the project-local dbt profile from MARKET_PIPE__DATABASE_URL.")
    .action(() => {
      try {
        const profilePath = writeTransformProfile();
        console.log(`transform profile wrote ${profilePath}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });

  for (const command of ["run", "test"] as const) {
    transform
      .command(command)
      .description(`Run dbt ${command} with the project-local profile.`)
      .action(() => {
        try {
          runTransformSubcommand(command);
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      });
  }
}
