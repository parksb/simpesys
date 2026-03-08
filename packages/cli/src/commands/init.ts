import { Command } from "@cliffy/command";
import { join, resolve, toFileUrl } from "@std/path";
import { exists } from "@std/fs";
import { logger } from "../utils/logger.ts";
import type { App } from "@simpesys/core";

export const initCommand = new Command()
  .description("Initialize a new Simpesys project")
  .arguments("<name:string>")
  .option("-a, --app <specifier:string>", "App specifier", {
    default: "jsr:@simpesys/app-wiki",
  })
  .action(async (options, name: string) => {
    const cwd = Deno.cwd();
    const projectDir = join(cwd, name);

    if (await exists(projectDir)) {
      logger.error(`Directory '${name}' already exists`);
      Deno.exit(1);
    }

    const specifier = options.app;
    const isLocal = !specifier.startsWith("jsr:") &&
      !specifier.startsWith("npm:") &&
      !specifier.startsWith("https:");

    const resolvedSpecifier = await resolveAppSpecifier(specifier, cwd).catch(
      () => {
        logger.error(`Failed to resolve app specifier: ${specifier}`);
        Deno.exit(1);
      },
    );

    const module = await import(resolvedSpecifier).catch(() => {
      logger.error(`Failed to load app: ${specifier}`);
      logger.error("Check the specifier or your network connection.");
      Deno.exit(1);
    });

    const app: App = module.app;

    if (!app || typeof app.docs !== "object") {
      logger.error("App package must export 'app' with a 'docs' object");
      Deno.exit(1);
    }

    logger.info(`Initializing Simpesys project '${name}'...`);

    await Deno.mkdir(join(projectDir, "docs"), { recursive: true });
    await Deno.mkdir(join(projectDir, "app"), { recursive: true });

    for (const [filename, content] of Object.entries(app.docs)) {
      await Deno.writeTextFile(join(projectDir, "docs", filename), content);
      logger.success(`Created docs/${filename}`);
    }

    const pkgName = await getAppPackageName(specifier, resolvedSpecifier);
    const imports: Record<string, string> = {
      ...(app.manifest?.imports ?? {}),
    };

    if (isLocal) {
      imports[pkgName] = resolvedSpecifier;
    }

    const manifest = {
      tasks: {
        start: `deno run -N -R -E -W app/${app.entry}`,
        dev: `deno run -N -R -E -W --watch=app,docs app/${app.entry}`,
      },
      imports,
      unstable: ["temporal"],
    };

    await Deno.writeTextFile(
      join(projectDir, "deno.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );

    logger.success("Created deno.json");

    const appExportSpecifier = isLocal ? pkgName : specifier;
    await Deno.writeTextFile(
      join(projectDir, "app", app.entry),
      `import { app } from "${appExportSpecifier}";\nDeno.serve(app.handler);\n`,
    );

    logger.success(`Created app/${app.entry}`);
    logger.success(`Project '${name}' initialized`);
    logger.success(`Run 'cd ${name} && simpesys serve' to start the server`);
  });

async function getAppPackageName(
  specifier: string,
  resolvedSpecifier: string,
): Promise<string> {
  const match = specifier.match(
    /^(?:jsr:|npm:)(@[^@/]+\/[^@]+|[^@/][^@]*)(?:@.*)?$/,
  );

  if (match) return match[1];

  const fileUrl = new URL(resolvedSpecifier);

  const modDir = fileUrl.pathname.endsWith("mod.ts")
    ? fileUrl.pathname.slice(0, fileUrl.pathname.lastIndexOf("/"))
    : fileUrl.pathname;

  const manifest = JSON.parse(
    await Deno.readTextFile(join(modDir, "deno.json")),
  );

  return manifest.name;
}

async function resolveAppSpecifier(
  specifier: string,
  cwd: string,
): Promise<string> {
  if (
    specifier.startsWith("jsr:") ||
    specifier.startsWith("npm:") ||
    specifier.startsWith("https:")
  ) {
    return specifier;
  }

  const rawPath = specifier.startsWith("file:")
    ? specifier.slice("file:".length)
    : specifier;

  const absPath = resolve(cwd, rawPath);
  const stat = await Deno.stat(absPath);
  const filePath = stat.isDirectory ? join(absPath, "mod.ts") : absPath;

  return toFileUrl(filePath).href;
}
