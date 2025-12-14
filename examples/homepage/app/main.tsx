import { Simpesys } from "@simpesys/core";
import { type Context, Hono } from "@hono/hono";
import { Layout } from "./components/layout.tsx";

const simpesys = await new Simpesys({
  config: {
    docs: {
      subdocumentsSectionTitle: ["Subpages", "하위문서"],
      publicationsSectionTitle: ["Publications", "문헌"],
      toc: {
        listType: "ol",
      },
    },
  },
  hooks: {
    onInternalLinkUnresolved: (error: Error) => {
      console.warn(`Unresolved internal link: ${error.message}`);
    },
  },
}).init({ syncMetadata: Deno.env.get("ENV") !== "production" });

const app = new Hono();
const documents = simpesys.getDocuments();

function documentResponse(id: string, c: Context) {
  let document = simpesys.getDocument(id);

  if (!document) {
    c.status(404);
    const prefix = id.split("/")[0];
    const localizedNotFound = simpesys.getDocument(`${prefix}/404`);
    document = localizedNotFound ?? simpesys.getDocument("404")!;
  }

  return c.html(<Layout document={document} documents={documents} />);
}

app.get("/", (c) => documentResponse("index", c));
app.get("/*", (c) => {
  const path = c.req.path.slice(1);
  return documentResponse(path, c);
});

Deno.serve(app.fetch);
