import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { DEFAULT_CONFIG } from "../../src/config.ts";
import { findReferredSentences } from "../../src/markdown.ts";
import type { Config } from "../../src/config.ts";
import type { DocumentDict } from "../../src/document.ts";

describe("findReferredSentences", () => {
  let dict: DocumentDict;

  beforeEach(() => {
    dict = {
      "doc1": {
        title: "Document 1",
        filename: "doc1",
        markdown: "# Document 1",
        html: "",
        breadcrumbs: [],
        children: [],
        referred: [],
        type: "subject",
      },
      "target": {
        title: "Target",
        filename: "target",
        markdown: "# Target",
        html: "",
        breadcrumbs: [],
        children: [],
        referred: [],
        type: "subject",
      },
    };
  });

  describe("with simpesys link style", () => {
    let config: Config;

    beforeEach(() => {
      config = DEFAULT_CONFIG;
    });

    it("should find sentences containing the word", () => {
      const markdown =
        "This is a sentence that references [[target]] in the text.";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain("<b>Target</b>");
    });

    it("should return empty array when no references", () => {
      const markdown = "This document has no references.";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result).toEqual([]);
    });

    it("should handle multiple sentences with references", () => {
      const markdown =
        "First [[target]] reference.\nSecond [[target]] reference.";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result.length).toBe(2);
    });

    it("should strip markdown prefixes", () => {
      const markdown = "- A list item referencing [[target]] here.";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).not.toMatch(/^-\s/);
    });

    it("should filter out sentences that only contain the title", () => {
      const markdown = "[[target]]";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result).toEqual([]);
    });
  });

  describe("with obsidian link style", () => {
    let config: Config;

    beforeEach(() => {
      config = {
        ...DEFAULT_CONFIG,
        docs: {
          ...DEFAULT_CONFIG.docs,
          linkStyle: "obsidian" as const,
        },
      };
    });

    it("should find sentences containing the word", () => {
      const markdown =
        "This is a sentence that references [[target]] in the text.";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain("<b>Target</b>");
    });

    it("should find sentences with labeled link", () => {
      const markdown =
        "This is a sentence that references [[target|My Target]] in the text.";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain("<b>My Target</b>");
    });

    it("should return empty array when no references", () => {
      const markdown = "This document has no references.";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result).toEqual([]);
    });

    it("should handle multiple sentences with references", () => {
      const markdown =
        "First [[target]] reference.\nSecond [[target]] reference.";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result.length).toBe(2);
    });

    it("should strip markdown prefixes", () => {
      const markdown = "- A list item referencing [[target]] here.";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).not.toMatch(/^-\s/);
    });

    it("should filter out sentences that only contain the title", () => {
      const markdown = "[[target]]";
      const result = findReferredSentences(config, markdown, "target", dict);
      expect(result).toEqual([]);
    });
  });
});
