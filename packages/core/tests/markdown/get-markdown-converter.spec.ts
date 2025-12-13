import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getMarkdownConverter } from "../../src/markdown.ts";
import { DEFAULT_CONFIG, DEFAULT_HOOKS } from "../../src/context.ts";

describe("getMarkdownConverter", () => {
  describe("toc.listType", () => {
    it("should render toc as unordered list by default", () => {
      const context = {
        config: DEFAULT_CONFIG,
        hooks: DEFAULT_HOOKS,
      };
      const md = getMarkdownConverter(context);
      const markdown = "[[toc]]\n\n## Section 1\n\n## Section 2";
      const html = md.render(markdown);

      expect(html).toContain("<ul>");
      expect(html).not.toContain("<ol>");
    });

    it("should render toc as ordered list when listType is 'ol'", () => {
      const context = {
        config: {
          ...DEFAULT_CONFIG,
          docs: {
            ...DEFAULT_CONFIG.docs,
            toc: {
              ...DEFAULT_CONFIG.docs.toc,
              listType: "ol" as const,
            },
          },
        },
        hooks: DEFAULT_HOOKS,
      };
      const md = getMarkdownConverter(context);
      const markdown = "[[toc]]\n\n## Section 1\n\n## Section 2";
      const html = md.render(markdown);

      expect(html).toContain("<ol>");
    });
  });

  describe("toc.levels", () => {
    it("should include h2, h3, h4 by default", () => {
      const context = {
        config: DEFAULT_CONFIG,
        hooks: DEFAULT_HOOKS,
      };
      const md = getMarkdownConverter(context);
      const markdown = "[[toc]]\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5";
      const html = md.render(markdown);

      expect(html).toContain("H2</a>");
      expect(html).toContain("H3</a>");
      expect(html).toContain("H4</a>");
      expect(html).not.toContain("H5</a></li>");
    });

    it("should only include specified levels", () => {
      const context = {
        config: {
          ...DEFAULT_CONFIG,
          docs: {
            ...DEFAULT_CONFIG.docs,
            toc: {
              ...DEFAULT_CONFIG.docs.toc,
              levels: [2],
            },
          },
        },
        hooks: DEFAULT_HOOKS,
      };
      const md = getMarkdownConverter(context);
      const markdown = "[[toc]]\n\n## H2\n\n### H3\n\n#### H4";
      const html = md.render(markdown);

      expect(html).toContain("H2</a>");
      expect(html).not.toContain("H3</a></li>");
      expect(html).not.toContain("H4</a></li>");
    });

    it("should include h2 and h3 when levels is [2, 3]", () => {
      const context = {
        config: {
          ...DEFAULT_CONFIG,
          docs: {
            ...DEFAULT_CONFIG.docs,
            toc: {
              ...DEFAULT_CONFIG.docs.toc,
              levels: [2, 3],
            },
          },
        },
        hooks: DEFAULT_HOOKS,
      };
      const md = getMarkdownConverter(context);
      const markdown = "[[toc]]\n\n## H2\n\n### H3\n\n#### H4";
      const html = md.render(markdown);

      expect(html).toContain("H2</a>");
      expect(html).toContain("H3</a>");
      expect(html).not.toContain("H4</a></li>");
    });
  });
});
