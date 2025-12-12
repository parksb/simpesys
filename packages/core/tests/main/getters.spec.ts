import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Simpesys } from "../../src/main.ts";

const FIXTURES_DIR = new URL("./fixtures", import.meta.url).pathname;

describe("Simpesys getters", () => {
  describe("getDocument", () => {
    it("should return document by key", async () => {
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
    });

    it("should return undefined for non-existent document", async () => {
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

      expect(simpesys.getDocument("nonexistent")).toBeUndefined();
    });
  });

  describe("getDocuments", () => {
    it("should return empty object before init", () => {
      const simpesys = new Simpesys({});
      expect(simpesys.getDocuments()).toEqual({});
    });

    it("should return all documents after init", async () => {
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
  });

  describe("getConfig", () => {
    it("should return the applied configuration", () => {
      const simpesys = new Simpesys({
        config: {
          web: {
            domain: "https://example.com",
          },
        },
      });

      const config = simpesys.getConfig();
      expect(config.web.domain).toBe("https://example.com");
    });
  });
});
