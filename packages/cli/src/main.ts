import { Command } from "@cliffy/command";
import { initCommand } from "./commands/init.ts";
import { serveCommand } from "./commands/serve.ts";
import manifest from "../deno.json" with { type: "json" };

await new Command()
  .name("simpesys")
  .version(manifest.version)
  .description(
    "Simpesys: A file-based documentation build tool for digital gardens",
  )
  .command("init", initCommand)
  .command("serve", serveCommand)
  .parse(Deno.args);
