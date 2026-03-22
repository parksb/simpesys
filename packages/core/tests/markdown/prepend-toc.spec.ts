import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { prependToc } from "../../src/markdown.ts";
import { DEFAULT_CONFIG } from "../../src/config.ts";
import { merge } from "es-toolkit";

describe("prependToc", () => {
  it("should insert [[toc]] after first line", () => {
    const markdown = "# Title\n\nSome content here.";
    const result = prependToc(DEFAULT_CONFIG, markdown);
    expect(result).toBe("# Title\n[[toc]]\n\nSome content here.");
  });

  it("should work with single line", () => {
    const markdown = "# Title";
    const result = prependToc(DEFAULT_CONFIG, markdown);
    expect(result).toBe("# Title\n[[toc]]");
  });

  it("should add toc after empty first line for empty string", () => {
    const markdown = "";
    const result = prependToc(DEFAULT_CONFIG, markdown);
    expect(result).toBe("\n[[toc]]");
  });

  it("should work with multiple lines", () => {
    const markdown = "# Title\n\n## Section 1\n\nContent\n\n## Section 2";
    const result = prependToc(DEFAULT_CONFIG, markdown);
    expect(result).toBe(
      "# Title\n[[toc]]\n\n## Section 1\n\nContent\n\n## Section 2",
    );
  });

  it("should use custom toc marker from config", () => {
    const customConfig = merge(DEFAULT_CONFIG, {
      docs: {
        toc: {
          marker: {
            default: "::: toc :::",
            pattern: /^::: toc :::/im,
          },
        },
      },
    });

    const markdown = "# Title\n\nSome content here.";
    const result = prependToc(customConfig, markdown);
    expect(result).toBe("# Title\n::: toc :::\n\nSome content here.");
  });
});
