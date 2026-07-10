import { type Command } from "commander";
import { registerTransformCommands } from "./cli.js";

export const transformFeature = {
  slug: "transform",
  registerCommands(program: Command): void {
    registerTransformCommands(program);
  },
};
