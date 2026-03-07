import { type App, createApp, Simpesys } from "@simpesys/core";
import denoJson from "./deno.json" with { type: "json" };

const simpesys = await new Simpesys().init();

export default (req: Request): Response => {
  const url = new URL(req.url);
  const key = url.pathname === "/" ? "index" : url.pathname.slice(1);
  const doc = simpesys.getDocument(key) ?? simpesys.getDocument("404");

  return new Response(doc?.html ?? "<h1>Not Found</h1>", {
    status: doc ? 200 : 404,
    headers: { "content-type": "text/html" },
  });
};

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
      "@simpesys/app-bare": `jsr:@simpesys/app-bare@^${denoJson.version}`,
    },
  },
});
