import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { type Config, DEFAULT_CONFIG } from "../../src/context.ts";
import { findSubdocs } from "../../src/markdown.ts";

describe("findSubdocs", () => {
  describe("with simpesys link style", () => {
    let config: Config;

    beforeEach(() => {
      config = { ...DEFAULT_CONFIG };
    });

    it("should find subdocuments in subdocs section", () => {
      const markdown = `# Title

Some content.

## ${config.docs.subdocumentsSectionTitle}

- [[doc1]]
- [[doc2]]{Document 2}
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
        { filename: "doc2", type: "subject" },
      ]);
    });

    it("should return empty array when no subdocs section", () => {
      const markdown = `# Title

Some content without subpages.
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([]);
    });

    it("should handle publications section", () => {
      const markdown = `# Title

## ${config.docs.subdocumentsSectionTitle}

- [[doc1]]

### ${config.docs.publicationsSectionTitle}

- [[pub1]]
- [[pub2]]
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
        { filename: "pub1", type: "publication" },
        { filename: "pub2", type: "publication" },
      ]);
    });

    it("should work with asterisk list markers", () => {
      const markdown = `# Title

## ${config.docs.subdocumentsSectionTitle}

* [[doc1]]
* [[doc2]]
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
        { filename: "doc2", type: "subject" },
      ]);
    });

    it("should stop at next h2 section", () => {
      const markdown = `# Title

## ${config.docs.subdocumentsSectionTitle}

- [[doc1]]

## Another Section

- [[doc2]]
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
      ]);
    });

    it("should use custom section title from config", () => {
      const customConfig: Config = {
        ...config,
        docs: {
          ...config.docs,
          subdocumentsSectionTitle: ["Children"],
        },
      };
      const markdown = `# Title

## Children

- [[doc1]]
`;
      const result = findSubdocs(customConfig, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
      ]);
    });

    it("should support multiple subdocuments section titles", () => {
      const customConfig: Config = {
        ...config,
        docs: {
          ...config.docs,
          subdocumentsSectionTitle: ["Subpages", "하위문서"],
        },
      };
      const markdown = `# Title

## 하위문서

- [[doc1]]
- [[doc2]]
`;
      const result = findSubdocs(customConfig, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
        { filename: "doc2", type: "subject" },
      ]);
    });

    it("should collect subdocs from multiple section titles", () => {
      const customConfig: Config = {
        ...config,
        docs: {
          ...config.docs,
          subdocumentsSectionTitle: ["Subpages", "하위문서"],
        },
      };
      const markdown = `# Title

## Subpages

- [[doc1]]

## 하위문서

- [[doc2]]
`;
      const result = findSubdocs(customConfig, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
        { filename: "doc2", type: "subject" },
      ]);
    });

    it("should support multiple publications section titles", () => {
      const customConfig: Config = {
        ...config,
        docs: {
          ...config.docs,
          subdocumentsSectionTitle: ["Subpages"],
          publicationsSectionTitle: ["Publications", "문헌"],
        },
      };
      const markdown = `# Title

## Subpages

- [[doc1]]

### 문헌

- [[pub1]]
`;
      const result = findSubdocs(customConfig, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
        { filename: "pub1", type: "publication" },
      ]);
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

    it("should find subdocuments in subdocs section", () => {
      const markdown = `# Title

Some content.

## ${config.docs.subdocumentsSectionTitle}

- [[doc1]]
- [[doc2|Document 2]]
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
        { filename: "doc2", type: "subject" },
      ]);
    });

    it("should return empty array when no subdocs section", () => {
      const markdown = `# Title

Some content without subpages.
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([]);
    });

    it("should handle publication section", () => {
      const markdown = `# Title

## ${config.docs.subdocumentsSectionTitle}

- [[doc1]]

### ${config.docs.publicationsSectionTitle}

- [[pub1]]
- [[pub2]]
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
        { filename: "pub1", type: "publication" },
        { filename: "pub2", type: "publication" },
      ]);
    });

    it("should work with asterisk list markers", () => {
      const markdown = `# Title

## ${config.docs.subdocumentsSectionTitle}

* [[doc1]]
* [[doc2]]
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
        { filename: "doc2", type: "subject" },
      ]);
    });

    it("should stop at next h2 section", () => {
      const markdown = `# Title

## ${config.docs.subdocumentsSectionTitle}

- [[doc1]]

## Another Section

- [[doc2]]
`;
      const result = findSubdocs(config, markdown, "subject");
      expect(result).toEqual([
        { filename: "doc1", type: "subject" },
      ]);
    });
  });
});
