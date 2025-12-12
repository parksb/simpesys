import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import {
  type Context,
  DEFAULT_CONFIG,
  DEFAULT_HOOKS,
} from "../../src/context.ts";
import { findReferences } from "../../src/markdown.ts";

describe("findReferences", () => {
  describe("with simpesys link style", () => {
    let config: Context;

    beforeEach(() => {
      config = { config: { ...DEFAULT_CONFIG }, hooks: { ...DEFAULT_HOOKS } };
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
        config: {
          ...DEFAULT_CONFIG,
          docs: {
            ...DEFAULT_CONFIG.docs,
            linkStyle: "obsidian" as const,
          },
        },
        hooks: { ...DEFAULT_HOOKS },
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
