import type { Config, DeepPartial } from "./config.ts";
import { Simpesys } from "./main.ts";

export interface App {
  simpesys: Simpesys;
  docs: Record<string, string>;
  handler: Deno.ServeHandler;
  manifest?: Partial<{
    imports: Record<string, string>;
  }>;
}

export interface AppDefinition {
  docs: Record<string, string>;
  createHandler: (simpesys: Simpesys) => Deno.ServeHandler;
  defaultConfig?: DeepPartial<Config>;
  manifest?: Partial<{
    imports: Record<string, string>;
  }>;
}

export interface AppBase {
  definition: AppDefinition;
  createApp: (options?: AppOptions) => Promise<App>;
}

export interface AppOptions {
  simpesys?: Simpesys;
  handler?: (
    simpesys: Simpesys,
    defaultHandler: Deno.ServeHandler,
  ) => Deno.ServeHandler;
}

export function defineApp(definition: AppDefinition): AppBase {
  return {
    definition,
    async createApp(options: AppOptions = {}) {
      const simpesys = options.simpesys ??
        await new Simpesys(definition.defaultConfig).init();

      const defaultHandler = definition.createHandler(simpesys);

      const handler = options.handler
        ? options.handler(simpesys, defaultHandler)
        : defaultHandler;

      return {
        simpesys,
        docs: definition.docs,
        handler,
        manifest: definition.manifest,
      };
    },
  };
}
