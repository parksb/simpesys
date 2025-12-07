import { Simpesys } from "@simpesys/core";
import { Hono } from "@hono/hono";

const simpesys = await new Simpesys().init();
const app = new Hono();

app.get("/:id", (c) => {
  const id = c.req.param("id");
  let document = simpesys.getDocument(id);

  if (!document) {
    c.status(404);
    document = simpesys.getDocument("404")!;
  }

  return c.html(document.html);
});

app.get("/", (c) => {
  const document = simpesys.getDocument('index')!;
  return c.html(document.html);
});

Deno.serve(app.fetch);
