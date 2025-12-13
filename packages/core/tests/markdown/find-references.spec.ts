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

    it("should ignore links inside inline code", () => {
      const markdown =
        "This is `[[doc1]]` which is inline code, but [[doc2]] is a real link.";
      const references = findReferences(config, markdown);
      expect(references).toEqual(["doc2"]);
    });

    it("should ignore links inside fenced code blocks", () => {
      const markdown = `This references [[doc1]].

\`\`\`
[[doc2]]
\`\`\`

And also [[doc3]].`;
      const references = findReferences(config, markdown);
      expect(references).toEqual(["doc1", "doc3"]);
    });

    it("should ignore links inside fenced code blocks with language", () => {
      const markdown = `This references [[doc1]].

\`\`\`markdown
[[doc2]]{Label}
\`\`\`

And also [[doc3]].`;
      const references = findReferences(config, markdown);
      expect(references).toEqual(["doc1", "doc3"]);
    });

    it("should ignore links inside multiple code blocks", () => {
      const markdown = `# Title

\`\`\`
[[code1]]
\`\`\`

Real link: [[real1]]

\`\`\`js
const link = "[[code2]]";
\`\`\`

Another real link: [[real2]]`;
      const references = findReferences(config, markdown);
      expect(references).toEqual(["real1", "real2"]);
    });

    it("should handle mixed inline code and code blocks", () => {
      const markdown = `Check \`[[inline]]\` and:

\`\`\`
[[block]]
\`\`\`

But [[real]] is valid.`;
      const references = findReferences(config, markdown);
      expect(references).toEqual(["real"]);
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

    it("should ignore links inside inline code", () => {
      const markdown =
        "This is `[[doc1]]` which is inline code, but [[doc2]] is a real link.";
      const references = findReferences(config, markdown);
      expect(references).toEqual(["doc2"]);
    });

    it("should ignore links inside fenced code blocks", () => {
      const markdown = `This references [[doc1]].

\`\`\`
[[doc2]]
\`\`\`

And also [[doc3]].`;
      const references = findReferences(config, markdown);
      expect(references).toEqual(["doc1", "doc3"]);
    });

    it("should ignore links inside fenced code blocks with language", () => {
      const markdown = `This references [[doc1]].

\`\`\`markdown
[[doc2|Label]]
\`\`\`

And also [[doc3]].`;
      const references = findReferences(config, markdown);
      expect(references).toEqual(["doc1", "doc3"]);
    });

    it("should ignore links inside multiple code blocks", () => {
      const markdown = `# Title

\`\`\`
[[code1]]
\`\`\`

Real link: [[real1]]

\`\`\`js
const link = "[[code2]]";
\`\`\`

Another real link: [[real2]]`;
      const references = findReferences(config, markdown);
      expect(references).toEqual(["real1", "real2"]);
    });

    it("should handle mixed inline code and code blocks", () => {
      const markdown = `Check \`[[inline]]\` and:

\`\`\`
[[block]]
\`\`\`

But [[real]] is valid.`;
      const references = findReferences(config, markdown);
      expect(references).toEqual(["real"]);
    });
  });
});
