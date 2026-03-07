import type { Simpesys } from "./main.ts";

export interface App {
  simpesys: Simpesys;
  docs: Record<string, string>;
  manifest?: {
    imports?: Record<string, string>;
    compilerOptions?: Record<string, unknown>;
  };
}

export function createApp(config: App): App {
  return config;
}
