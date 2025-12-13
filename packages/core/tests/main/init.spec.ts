import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Simpesys } from "../../src/main.ts";

const FIXTURES_DIR = new URL("./fixtures", import.meta.url).pathname;

describe("Simpesys init", () => {
  it("should load and process root document", async () => {
    const docsPath = `${FIXTURES_DIR}/basic`;

    const simpesys = new Simpesys({
      config: {
        project: {
          root: docsPath,
          docs: docsPath,
        },
      },
    });

    await simpesys.init();

    const doc = simpesys.getDocument("index");
    expect(doc).toBeDefined();
    expect(doc?.title).toBe("Home");
    expect(doc?.filename).toBe("index");
  });

  it("should throw error when initialized twice", async () => {
    const docsPath = `${FIXTURES_DIR}/basic`;

    const simpesys = new Simpesys({
      config: {
        project: {
          root: docsPath,
          docs: docsPath,
        },
      },
    });

    await simpesys.init();

    await expect(simpesys.init()).rejects.toThrow(
      "Simpesys has already been initialized.",
    );
  });

  it("should process subdocuments", async () => {
    const docsPath = `${FIXTURES_DIR}/with-subdocs`;

    const simpesys = new Simpesys({
      config: {
        project: {
          root: docsPath,
          docs: docsPath,
        },
      },
    });

    await simpesys.init();

    const docs = simpesys.getDocuments();
    expect(Object.keys(docs)).toHaveLength(3);
    expect(docs["index"]).toBeDefined();
    expect(docs["page1"]).toBeDefined();
    expect(docs["page2"]).toBeDefined();
  });

  it("should build breadcrumbs for nested documents", async () => {
    const docsPath = `${FIXTURES_DIR}/with-subdocs`;

    const simpesys = new Simpesys({
      config: {
        project: {
          root: docsPath,
          docs: docsPath,
        },
      },
    });

    await simpesys.init();

    const page1 = simpesys.getDocument("page1");
    expect(page1?.breadcrumbs).toHaveLength(2);
    expect(page1?.breadcrumbs[0]).toEqual({
      title: "Home",
      filename: "index",
    });
    expect(page1?.breadcrumbs[1]).toEqual({
      title: "Page 1",
      filename: "page1",
    });
  });

  it("should process internal links and backlinks", async () => {
    const docsPath = `${FIXTURES_DIR}/with-backlinks`;

    const simpesys = new Simpesys({
      config: {
        project: {
          root: docsPath,
          docs: docsPath,
        },
      },
    });

    await simpesys.init();

    const page2 = simpesys.getDocument("page2");
    expect(page2?.referred.length).toBeGreaterThan(0);

    const referrers = page2?.referred.map((r) => r.document.filename);
    expect(referrers).toContain("page1");
  });

  it("should not render links inside code blocks in HTML", async () => {
    const docsPath = `${FIXTURES_DIR}/with-codeblocks`;

    const simpesys = new Simpesys({
      config: {
        project: {
          root: docsPath,
          docs: docsPath,
        },
      },
    });

    await simpesys.init();

    const index = simpesys.getDocument("index");

    expect(index).toBeDefined();
    expect(index?.html).toContain('<a href="/page1">');
    expect(index?.html).toContain("<code>[[page1]]</code>");
    expect(index?.html).toMatch(/<pre[^>]*>.*\[\[page1\]\].*<\/pre>/s);
  });
});
