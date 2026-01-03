import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { type Config, DEFAULT_CONFIG } from "../../src/context.ts";
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
    let config: Config;

    beforeEach(() => {
      config = { ...DEFAULT_CONFIG };
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

    it("should not label links inside inline code", () => {
      const markdown = "This is `[[doc1]]` in code, but [[doc2]] is real.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe(
        "This is `[[doc1]]` in code, but [[doc2]]{Document 2} is real.",
      );
    });

    it("should not label links inside fenced code blocks", () => {
      const markdown = `See [[doc1]].

\`\`\`
[[doc2]]
\`\`\`

And [[doc2]].`;
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe(`See [[doc1]]{Document 1}.

\`\`\`
[[doc2]]
\`\`\`

And [[doc2]]{Document 2}.`);
    });

    it("should handle mixed inline code and code blocks", () => {
      const markdown = `Check \`[[doc1]]\` and:

\`\`\`js
const x = "[[doc1]]";
\`\`\`

But [[doc1]] is valid.`;
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe(`Check \`[[doc1]]\` and:

\`\`\`js
const x = "[[doc1]]";
\`\`\`

But [[doc1]]{Document 1} is valid.`);
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

    it("should not label links inside inline code", () => {
      const markdown = "This is `[[doc1]]` in code, but [[doc2]] is real.";
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe(
        "This is `[[doc1]]` in code, but [[doc2|Document 2]] is real.",
      );
    });

    it("should not label links inside fenced code blocks", () => {
      const markdown = `See [[doc1]].

\`\`\`
[[doc2]]
\`\`\`

And [[doc2]].`;
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe(`See [[doc1|Document 1]].

\`\`\`
[[doc2]]
\`\`\`

And [[doc2|Document 2]].`);
    });

    it("should handle mixed inline code and code blocks", () => {
      const markdown = `Check \`[[doc1]]\` and:

\`\`\`js
const x = "[[doc1]]";
\`\`\`

But [[doc1]] is valid.`;
      const result = labelInternalLinks(config, markdown, dict);
      expect(result).toBe(`Check \`[[doc1]]\` and:

\`\`\`js
const x = "[[doc1]]";
\`\`\`

But [[doc1|Document 1]] is valid.`);
    });
  });
});
