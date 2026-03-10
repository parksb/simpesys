import { type AppBase, defineApp, type Simpesys } from "@simpesys/core";
import appManifest from "./deno.json" with { type: "json" };

const readDoc = (name: string) =>
  fetch(new URL(`./docs/${name}`, import.meta.url)).then((r) => r.text());

function createHandler(simpesys: Simpesys): Deno.ServeHandler {
  return (req: Request): Response => {
    const url = new URL(req.url);
    const key = url.pathname === "/" ? "index" : url.pathname.slice(1);
    const doc = simpesys.getDocument(key) ?? simpesys.getDocument("404");

    return new Response(doc?.html ?? "<h1>Not Found</h1>", {
      status: doc ? 200 : 404,
      headers: { "content-type": "text/html" },
    });
  };
}

export default defineApp({
  docs: {
    "index.md": await readDoc("index.md"),
    "404.md": await readDoc("404.md"),
  },
  manifest: {
    imports: {
      "@simpesys/core": "jsr:@simpesys/core@^0.6",
      "@simpesys/app-bare": `jsr:@simpesys/app-bare@^${appManifest.version}`,
    },
  },
  createHandler,
}) as AppBase;
