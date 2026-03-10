import { type AppBase, defineApp, type Simpesys } from "@simpesys/core";
import { createRouter } from "./router.tsx";
import denoJson from "./deno.json" with { type: "json" };

const readDoc = (name: string) =>
  fetch(new URL(`./docs/${name}`, import.meta.url)).then((r) => r.text());

function createHandler(simpesys: Simpesys): Deno.ServeHandler {
  const router = createRouter(simpesys);
  return router.fetch;
}

export default defineApp({
  docs: {
    "index.md": await readDoc("index.md"),
    "404.md": await readDoc("404.md"),
    "getting-started.md": await readDoc("getting-started.md"),
  },
  manifest: {
    imports: {
      "@simpesys/core": "jsr:@simpesys/core@^0.6",
      "@simpesys/app-wiki": `jsr:@simpesys/app-wiki@^${denoJson.version}`,
    },
  },
  createHandler,
}) as AppBase;
