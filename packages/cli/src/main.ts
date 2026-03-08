import { Command } from "@cliffy/command";
import { initCommand } from "./commands/init.ts";
import manifest from "../deno.json" with { type: "json" };

await new Command()
  .name("simpesys")
  .version(manifest.version)
  .description(
    "Simpesys: A file-based documentation build tool for digital gardens",
  )
  .command("init", initCommand)
  .parse(Deno.args);
