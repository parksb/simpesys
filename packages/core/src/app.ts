import type { Simpesys } from "./main.ts";

export interface App {
  simpesys: Simpesys;
  entry: "main.ts" | "main.tsx";
  docs: Record<string, string>;
  handler: Deno.ServeHandler;
  manifest?: {
    imports?: Record<string, string>;
    compilerOptions?: Record<string, unknown>;
  };
}

export function createApp(config: App): App {
  return config;
}
