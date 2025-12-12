import { Simpesys } from "@simpesys/core";
import { Context, Hono } from "@hono/hono";

const simpesys = await new Simpesys({
  hooks: {
    onInternalLinkUnresolved: (link) => {
      console.warn(`Unresolved internal link: ${link}`);
    },
  },
}).init({ syncMetadata: true });

const app = new Hono();

function documentResponse(id: string, c: Context) {
  let document = simpesys.getDocument(id);

  if (!document) {
    c.status(404);
    document = simpesys.getDocument("404")!;
  }

  return c.html(document.html);
}

app.get("/:id", (c) => {
  const id = c.req.param("id");
  return documentResponse(id, c);
});

app.get("/private/:id", (c) => {
  const id = `private/${c.req.param("id")}`;
  return documentResponse(id, c);
});

app.get("/", (c) => {
  return documentResponse("index", c);
});

Deno.serve(app.fetch);
