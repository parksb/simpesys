import { Command } from "@cliffy/command";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { debounce } from "es-toolkit";
import { logger } from "../utils/logger.ts";
import {
  ENTRY_FILES,
  findEntryFile,
  loadApp,
  validateApp,
} from "../utils/entry.ts";

export const serveCommand = new Command()
  .description("Start the server")
  .arguments("[entry:string]")
  .option("-p, --port <port:number>", "Port to listen on", { default: 3000 })
  .option("--hostname <hostname:string>", "Hostname to bind to", {
    default: "localhost",
  })
  .option("-d, --dev", "Enable development mode with hot reload")
  .action(async (options, entry?: string) => {
    const cwd = Deno.cwd();
    const entryFile = entry ?? await findEntryFile(cwd);

    if (!entryFile) {
      logger.error(`No entry file found. Tried: ${ENTRY_FILES.join(", ")}`);
      Deno.exit(1);
    }

    const entryPath = join(cwd, entryFile);

    if (!(await exists(entryPath))) {
      logger.error(`Entry file not found: ${entryFile}`);
      Deno.exit(1);
    }

    logger.info(`Loading ${entryFile}...`);

    const { port, hostname, dev } = options;
    let app = await loadApp(entryPath, dev);

    if (!validateApp(app)) {
      logger.error("Entry file must export default a handler function");
      Deno.exit(1);
    }

    if (dev) {
      const handler: Deno.ServeHandler = (req, info) => app(req, info);

      const watcher = Deno.watchFs(cwd, { recursive: true });

      const reload = debounce(async () => {
        logger.info("Changes detected, reloading...");
        try {
          app = await loadApp(entryPath, true);
          logger.success("Reloaded successfully");
        } catch (err) {
          logger.error(`Reload failed: ${err}`);
        }
      }, 100);

      (async () => {
        for await (const event of watcher) {
          if (
            event.kind === "modify" || event.kind === "create" ||
            event.kind === "remove"
          ) {
            const relevantFiles = event.paths.filter(
              (p) =>
                p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith(".md"),
            );
            if (relevantFiles.length > 0) {
              reload();
            }
          }
        }
      })();

      console.log("");
      logger.success(
        `Development server running at http://${hostname}:${port}`,
      );
      console.log("");
      console.log("Watching for file changes...");
      console.log("Press Ctrl+C to stop");

      Deno.serve({ port, hostname }, handler);
    } else {
      logger.success(`Server running at http://${hostname}:${port}`);
      Deno.serve({ port, hostname }, app);
    }
  });
