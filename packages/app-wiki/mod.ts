import { type App, createApp, Simpesys } from "@simpesys/core";
import { createRouter } from "./router.tsx";
import denoJson from "./deno.json" with { type: "json" };
import type { Hono } from "@hono/hono";
import type { BlankEnv, BlankSchema } from "@hono/hono/types";

const simpesys = await new Simpesys().init();
const router: Hono<BlankEnv, BlankSchema, "/"> = createRouter(simpesys);

export default router.fetch;

const readDoc = (name: string) =>
  fetch(new URL(`./docs/${name}`, import.meta.url)).then((r) => r.text());

export const app: App = createApp({
  simpesys,
  docs: {
    "index.md": await readDoc("index.md"),
    "404.md": await readDoc("404.md"),
    "getting-started.md": await readDoc("getting-started.md"),
  },
  manifest: {
    imports: {
      "@simpesys/core": "jsr:@simpesys/core@^0.5",
      "@simpesys/app-wiki": `jsr:@simpesys/app-wiki@^${denoJson.version}`,
    },
  },
});
