import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { DEFAULT_CONFIG } from "../../src/config.ts";
import { findReferences } from "../../src/markdown.ts";
import type { Context } from "../../src/types.ts";

describe("findReferences", () => {
  describe("with simpesys link style", () => {
    let config: Context;

    beforeEach(() => {
      config = { ...DEFAULT_CONFIG, hooks: {} };
    });

    it("should find all references in markdown", () => {
      const markdown =
        "This is a test document with references to [[doc1]], [[doc2]]{Document 2}, and [[doc3]].";
      const references = findReferences(config, markdown);
      expect(references).toEqual(["doc1", "doc2", "doc3"]);
    });

    it("should return empty array when no references", () => {
      const markdown = "This document has no internal links.";
      const references = findReferences(config, markdown);
      expect(references).toEqual([]);
    });
  });

  describe("with obsidian link style", () => {
    let config: Context;

    beforeEach(() => {
      config = {
        ...DEFAULT_CONFIG,
        docs: {
          ...DEFAULT_CONFIG.docs,
          linkStyle: "obsidian" as const,
        },
        hooks: {},
      };
    });

    it("should find all references in markdown", () => {
      const markdown =
        "This is a test document with references to [[doc1]], [[doc2|Document 2]], and [[doc3]].";
      const references = findReferences(config, markdown);
      expect(references).toEqual(["doc1", "doc2", "doc3"]);
    });

    it("should return empty array when no references", () => {
      const markdown = "This document has no internal links.";
      const references = findReferences(config, markdown);
      expect(references).toEqual([]);
    });
  });
});
