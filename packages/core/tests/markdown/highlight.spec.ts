import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getHighlighter } from "../../src/highlight.ts";

const themes = { light: "github-light", dark: "github-dark" };

describe("shared highlighter", () => {
  it("shares one registry across concurrent language and theme loads", async () => {
    const [first, second] = await Promise.all([
      getHighlighter(["typescript", "ts"], themes),
      getHighlighter(["python"], { ...themes, dark: "nord" }),
    ]);

    expect(first).toBe(second);

    expect(first.getLoadedLanguages()).toContain("typescript");
    expect(first.getLoadedLanguages()).toContain("ts");
    expect(first.getLoadedLanguages()).toContain("python");
    expect(first.getLoadedThemes()).toContain("nord");

    expect(await getHighlighter(["ts", "typescript"], themes)).toBe(first);
  });

  it("skips unsupported languages while loading valid aliases and special languages", async () => {
    const highlighter = await getHighlighter(
      [
        "unknown-language",
        "x86",
        "ts",
        "text",
        "plaintext",
        "txt",
        "plain",
        "ansi",
      ],
      themes,
    );

    expect(highlighter.getLoadedLanguages()).toContain("typescript");
    expect(highlighter.codeToHtml("const value = 1", { lang: "ts", themes }))
      .toContain("shiki-themes");
  });

  it("rejects invalid themes", async () => {
    await expect(
      getHighlighter([], { ...themes, dark: "unknown-theme" }),
    ).rejects.toThrow();
  });
});
