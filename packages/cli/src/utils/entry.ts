import { join } from "@std/path";
import { exists } from "@std/fs";

export const ENTRY_FILES = ["app/main.ts", "app/main.tsx"];

export async function findEntryFile(cwd: string): Promise<string | null> {
  for (const entry of ENTRY_FILES) {
    if (await exists(join(cwd, entry))) {
      return entry;
    }
  }
  return null;
}

export async function loadApp(entryPath: string, bustCache = false) {
  const url = bustCache
    ? `file://${entryPath}?t=${Date.now()}`
    : `file://${entryPath}`;
  const module = await import(url);
  return module.default;
}

export function validateApp(app: unknown): app is Deno.ServeHandler {
  return typeof app === "function";
}
