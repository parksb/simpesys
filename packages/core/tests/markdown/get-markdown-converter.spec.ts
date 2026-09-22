import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type MarkdownIt from "markdown-it";
import mdContainer from "markdown-it-container";
import { getMarkdownConverter } from "../../src/markdown.ts";
import type { DocumentDict } from "../../src/document.ts";
import { spy } from "@std/testing/mock";
import { getHighlighter } from "../../src/highlight/mod.ts";
import { DEFAULT_CONFIG, defineConfig } from "../../src/config.ts";

function documents(markdown: string): DocumentDict {
  return {
    index: {
      filename: "index",
      title: "Index",
      markdown,
      html: "",
      breadcrumbs: [],
      children: [],
      referred: [],
      type: "subject",
    },
  };
}

describe("getMarkdownConverter", () => {
  describe("toc.listType", () => {
    it("should render toc as unordered list by default", async () => {
      const config = { ...DEFAULT_CONFIG };
      const md = await getMarkdownConverter(config);
      const markdown = "[[toc]]\n\n## Section 1\n\n## Section 2";
      const html = md.render(markdown);

      expect(html).toContain("<ul>");
      expect(html).not.toContain("<ol>");
    });

    it("should render toc as ordered list when listType is 'ol'", async () => {
      const config = {
        ...DEFAULT_CONFIG,
        docs: {
          ...DEFAULT_CONFIG.docs,
          toc: {
            ...DEFAULT_CONFIG.docs.toc,
            listType: "ol" as const,
          },
        },
      };
      const md = await getMarkdownConverter(config);
      const markdown = "[[toc]]\n\n## Section 1\n\n## Section 2";
      const html = md.render(markdown);

      expect(html).toContain("<ol>");
    });
  });

  describe("toc.levels", () => {
    it("should include h2, h3, h4 by default", async () => {
      const config = { ...DEFAULT_CONFIG };
      const md = await getMarkdownConverter(config);
      const markdown = "[[toc]]\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5";
      const html = md.render(markdown);

      expect(html).toContain("H2</a>");
      expect(html).toContain("H3</a>");
      expect(html).toContain("H4</a>");
      expect(html).not.toContain("H5</a></li>");
    });

    it("should only include specified levels", async () => {
      const config = {
        ...DEFAULT_CONFIG,
        docs: {
          ...DEFAULT_CONFIG.docs,
          toc: {
            ...DEFAULT_CONFIG.docs.toc,
            levels: [2],
          },
        },
      };
      const md = await getMarkdownConverter(config);
      const markdown = "[[toc]]\n\n## H2\n\n### H3\n\n#### H4";
      const html = md.render(markdown);

      expect(html).toContain("H2</a>");
      expect(html).not.toContain("H3</a></li>");
      expect(html).not.toContain("H4</a></li>");
    });

    it("should include h2 and h3 when levels is [2, 3]", async () => {
      const config = {
        ...DEFAULT_CONFIG,
        docs: {
          ...DEFAULT_CONFIG.docs,
          toc: {
            ...DEFAULT_CONFIG.docs.toc,
            levels: [2, 3],
          },
        },
      };
      const md = await getMarkdownConverter(config);
      const markdown = "[[toc]]\n\n## H2\n\n### H3\n\n#### H4";
      const html = md.render(markdown);

      expect(html).toContain("H2</a>");
      expect(html).toContain("H3</a>");
      expect(html).not.toContain("H4</a></li>");
    });
  });

  describe("configureMarkdownConverter", () => {
    it("should allow adding plugins via hook", async () => {
      const config = {
        ...DEFAULT_CONFIG,
        hooks: {
          ...DEFAULT_CONFIG.hooks,
          configureMarkdownConverter: (md: MarkdownIt) => {
            md.use(mdContainer, "WARNING", {
              validate: (param: string) => param.trim() === "WARNING",
            });
          },
        },
      };
      const md = await getMarkdownConverter(config);
      const html = md.render("::: WARNING\nThis is a warning.\n:::");

      expect(html).toContain('<div class="WARNING">');
    });
  });
});

describe("highlighting reuse", () => {
  it("reuses highlighted output across independently created converters", async () => {
    const config = defineConfig({
      docs: { code: { languages: ["typescript"] } },
    });

    const highlighter = await getHighlighter(
      ["typescript"],
      config.docs.code.themes,
    );

    const codeToHtml = spy(highlighter, "codeToHtml");

    try {
      const [first, second] = await Promise.all([
        getMarkdownConverter(config),
        getMarkdownConverter(config),
      ]);

      const markdown =
        "```typescript\nconst cachedValue: number = 918273;\n```";

      const html = first.render(markdown);

      expect(second.render(markdown)).toBe(html);
      expect(codeToHtml.calls).toHaveLength(1);
      expect(html).toContain("shiki-themes github-light github-dark");
    } finally {
      codeToHtml.restore();
    }
  });

  it("skips highlighting for a known document set without fences", async () => {
    const markdown = "# Heading\n\nPlain text and `inline code`.";
    const md = await getMarkdownConverter(DEFAULT_CONFIG, documents(markdown));

    expect(md.options.highlight).toBeFalsy();
    expect(md.render(markdown)).toContain("<code>inline code</code>");
  });

  it("honors explicit languages even when the document set has no fences", async () => {
    const config = defineConfig({ docs: { code: { languages: ["python"] } } });
    const md = await getMarkdownConverter(config, documents("# Heading"));

    expect(md.render("```python\nprint(42)\n```")).toContain("shiki-themes");
  });

  it("keeps the highlighter for unlabelled backtick and tilde fences", async () => {
    for (const fence of ["```", "~~~"]) {
      const markdown = `${fence}\n<script> & text\n${fence}`;

      const md = await getMarkdownConverter(
        DEFAULT_CONFIG,
        documents(markdown),
      );

      const html = md.render(markdown);
      expect(html).toContain("shiki-themes");
      expect(html).not.toContain("<script>");
    }
  });

  it("keeps converter hooks independent while sharing highlighting", async () => {
    const config = defineConfig({
      docs: { code: { languages: ["javascript"] } },
      hooks: {
        configureMarkdownConverter: (md) => {
          const highlight = md.options.highlight!;
          md.options.highlight = (...args) =>
            `<aside>${highlight(...args)}</aside>`;
        },
      },
    });

    const custom = await getMarkdownConverter(config);
    const standard = await getMarkdownConverter(defineConfig({
      docs: { code: { languages: ["javascript"] } },
    }));

    const markdown = "```javascript\nconst hookIsolation = 42;\n```";

    expect(custom.render(markdown)).toContain("<aside>");
    expect(standard.render(markdown)).not.toContain("<aside>");
  });
});
