import type { Simpesys } from "@simpesys/core";
import { type Context, Hono } from "@hono/hono";
import { Layout } from "./components/layout.tsx";

export function createRouter(simpesys: Simpesys) {
  const documents = simpesys.getDocuments();
  const app = new Hono();

  function documentResponse(id: string, c: Context) {
    const doc = simpesys.getDocument(id) ?? simpesys.getDocument("404");
    const status = simpesys.getDocument(id) ? 200 : 404;

    if (!doc) return c.text("Not Found", 404);

    return c.html(<Layout document={doc} documents={documents} />, status);
  }

  app.get("/", (c) => documentResponse("index", c));
  app.get("/*", (c) => {
    const key = c.req.path.slice(1);
    return documentResponse(key, c);
  });

  return app;
}
