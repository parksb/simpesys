import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { type Config, DEFAULT_CONFIG } from "../../src/config.ts";
import { appendReferred } from "../../src/markdown.ts";
import type { Document, DocumentDict, Reference } from "../../src/document.ts";

describe("appendReferred", () => {
  let dict: DocumentDict;

  const createMockDocument = (filename: string, title: string): Document => ({
    title,
    filename,
    markdown: `# ${title}`,
    html: "",
    breadcrumbs: [],
    children: [],
    referred: [],
    type: "subject",
  });

  beforeEach(() => {
    dict = {
      doc1: createMockDocument("doc1", "Document 1"),
      doc2: createMockDocument("doc2", "Document 2"),
    };
  });

  describe("with simpesys link style", () => {
    let config: Config;

    beforeEach(() => {
      config = { ...DEFAULT_CONFIG };
    });

    it("should return markdown unchanged when no references", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toBe(markdown);
    });

    it("should append referred section with documents (simpesys)", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [{ document: dict["doc1"], sentences: [] }];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toContain(
        `## ${config.docs.backlinksSectionTitle}`,
      );
      expect(result).toContain("[[doc1]]{Document 1}");
    });

    it("should include sentences as nested quotes", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [
        {
          document: dict["doc1"],
          sentences: ["This is a reference sentence."],
        },
      ];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toContain("> This is a reference sentence.");
    });

    it("should handle multiple referred documents", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [
        { document: dict["doc1"], sentences: ["First reference."] },
        { document: dict["doc2"], sentences: ["Second reference."] },
      ];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toContain("[[doc1]]{Document 1}");
      expect(result).toContain("[[doc2]]{Document 2}");
      expect(result).toContain("> First reference.");
      expect(result).toContain("> Second reference.");
    });

    it("should handle multiple sentences per document", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [
        {
          document: dict["doc1"],
          sentences: ["First sentence.", "Second sentence."],
        },
      ];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toContain("> First sentence.");
      expect(result).toContain("> Second sentence.");
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

    it("should return markdown unchanged when no references", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toBe(markdown);
    });

    it("should append referred section with documents (obsidian)", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [{ document: dict["doc1"], sentences: [] }];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toContain(
        `## ${config.docs.backlinksSectionTitle}`,
      );
      expect(result).toContain("[[doc1|Document 1]]");
    });

    it("should include sentences as nested quotes", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [
        {
          document: dict["doc1"],
          sentences: ["This is a reference sentence."],
        },
      ];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toContain("> This is a reference sentence.");
    });

    it("should handle multiple referred documents", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [
        { document: dict["doc1"], sentences: ["First reference."] },
        { document: dict["doc2"], sentences: ["Second reference."] },
      ];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toContain("[[doc1|Document 1]]");
      expect(result).toContain("[[doc2|Document 2]]");
      expect(result).toContain("> First reference.");
      expect(result).toContain("> Second reference.");
    });

    it("should handle multiple sentences per document", () => {
      const markdown = "# Title\n\nSome content.";
      const referred: Reference[] = [
        {
          document: dict["doc1"],
          sentences: ["First sentence.", "Second sentence."],
        },
      ];
      const result = appendReferred(config, markdown, referred, dict);
      expect(result).toContain("> First sentence.");
      expect(result).toContain("> Second sentence.");
    });
  });
});
