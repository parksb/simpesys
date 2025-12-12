import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import {
  type Context,
  DEFAULT_CONFIG,
  DEFAULT_HOOKS,
} from "../../src/context.ts";
import { labelInternalLinks } from "../../src/markdown.ts";
import type { DocumentDict } from "../../src/document.ts";

describe("labelInternalLinks", () => {
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
      "doc2": {
        title: "Document 2",
        filename: "doc2",
        markdown: "# Document 2",
        html: "",
        breadcrumbs: [],
        children: [],
        referred: [],
        type: "subject",
      },
      "404": {
        title: "Not Found",
        filename: "404",
        markdown: "# Not Found",
        html: "",
        breadcrumbs: [],
        children: [],
        referred: [],
        type: "subject",
      },
    };
  });

  describe("with simpesys link style", () => {
    let config: Context;

    beforeEach(() => {
      config = { config: { ...DEFAULT_CONFIG }, hooks: { ...DEFAULT_HOOKS } };
    });

    it("should add label to unlabeled links", () => {
      const markdown = "Check out [[doc1]] for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[doc1]]{Document 1} for more info.");
    });

    it("should preserve existing labels", () => {
      const markdown = "Check out [[doc1]]{Custom Label} for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[doc1]]{Custom Label} for more info.");
    });

    it("should handle multiple links", () => {
      const markdown = "See [[doc1]] and [[doc2]] for details.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe(
        "See [[doc1]]{Document 1} and [[doc2]]{Document 2} for details.",
      );
    });

    it("should replace unresolved link with notFound", () => {
      const markdown = "Check out [[nonexistent]] for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[404]]{nonexistent} for more info.");
    });

    it("should handle private links", () => {
      const markdown = "Check out [[private/secret]] for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[404]]{**************} for more info.");
    });

    it("should preserve label for unresolved link", () => {
      const markdown = "Check out [[nonexistent]]{Some Label} for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[404]]{Some Label} for more info.");
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

    it("should add label to unlabeled links", () => {
      const markdown = "Check out [[doc1]] for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[doc1|Document 1]] for more info.");
    });

    it("should preserve existing labels", () => {
      const markdown = "Check out [[doc1|Custom Label]] for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[doc1|Custom Label]] for more info.");
    });

    it("should handle multiple links", () => {
      const markdown = "See [[doc1]] and [[doc2]] for details.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe(
        "See [[doc1|Document 1]] and [[doc2|Document 2]] for details.",
      );
    });

    it("should replace unresolved link with notFound", () => {
      const markdown = "Check out [[nonexistent]] for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[404|nonexistent]] for more info.");
    });

    it("should handle private links", () => {
      const markdown = "Check out [[private/secret]] for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[404|**************]] for more info.");
    });

    it("should preserve label for unresolved link", () => {
      const markdown = "Check out [[nonexistent|Some Label]] for more info.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe("Check out [[404|Some Label]] for more info.");
    });
  });
});
