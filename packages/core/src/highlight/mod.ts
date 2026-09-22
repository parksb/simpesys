import { createHighlighterCore, isSpecialLang } from "@shikijs/core";
import { createOnigurumaEngine } from "@shikijs/engine-oniguruma";
import { languageAliasNames, languageNames } from "@shikijs/langs";
import type MarkdownIt from "markdown-it";
import { sharePatterns } from "./patterns.ts";
import { cacheRegexes } from "./regex.ts";
import type { Config } from "../config.ts";

type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;
type Themes = Config["docs"]["code"]["themes"];
type Highlight = NonNullable<MarkdownIt["options"]["highlight"]>;

export const getHighlighter = createHighlighterLoader();

const cache = createCache(4 * 1024 * 1024);

export function cacheHighlight(
  highlight: Highlight,
  themes: Themes,
): Highlight {
  const { light, dark } = themes;

  return (code, language, attrs) => {
    if (code.length * 2 > cache.maxBytes) {
      return highlight(code, language, attrs);
    }

    const key = JSON.stringify([light, dark, language, attrs, code]);

    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const html = highlight(code, language, attrs);
    cache.set(key, html);

    return html;
  };
}

function createHighlighterLoader() {
  let highlighterPromise: Promise<Highlighter> | undefined;
  const supportedLanguages = new Set([...languageNames, ...languageAliasNames]);

  return async function getHighlighter(
    languages: string[],
    themes: Themes,
  ): Promise<Highlighter> {
    highlighterPromise ??= createHighlighter().catch((error) => {
      highlighterPromise = undefined;
      throw error;
    });

    const highlighter = await highlighterPromise;
    const loadedLanguages = new Set(highlighter.getLoadedLanguages());
    const loadedThemes = new Set(highlighter.getLoadedThemes());

    const missingLanguages = [...new Set(languages)].filter((language) =>
      !isSpecialLang(language) &&
      !loadedLanguages.has(language) &&
      supportedLanguages.has(language)
    );

    const missingThemes = [...new Set([themes.light, themes.dark])].filter(
      (theme) => !loadedThemes.has(theme),
    );

    await Promise.all([
      highlighter.loadLanguage(
        ...missingLanguages.map((language) =>
          import(`@shikijs/langs/${language}`)
        ),
      ),
      highlighter.loadTheme(
        ...missingThemes.map((theme) => import(`@shikijs/themes/${theme}`)),
      ),
    ]);

    return highlighter;
  };
}

function createCache(maxBytes: number) {
  let cacheBytes = 0;

  const highlightedCode = new Map<string, string>();
  const sizeOf = (key: string, html: string) => 2 * (key.length + html.length);

  function get(key: string): string | undefined {
    const html = highlightedCode.get(key);
    if (html === undefined) {
      return undefined;
    }

    highlightedCode.delete(key);
    highlightedCode.set(key, html);

    return html;
  }

  function set(key: string, html: string): void {
    const bytes = sizeOf(key, html);
    if (bytes > maxBytes) {
      return;
    }

    const previous = highlightedCode.get(key);
    if (previous !== undefined) {
      highlightedCode.delete(key);
      cacheBytes -= sizeOf(key, previous);
    }

    while (cacheBytes + bytes > maxBytes) {
      const [oldKey, oldHtml] = highlightedCode.entries().next().value!;

      highlightedCode.delete(oldKey);
      cacheBytes -= sizeOf(oldKey, oldHtml);
    }

    highlightedCode.set(key, html);
    cacheBytes += bytes;
  }

  return { maxBytes, get, set };
}

async function createHighlighter(): Promise<Highlighter> {
  const engine = cacheRegexes(
    sharePatterns(
      await createOnigurumaEngine(
        import("@shikijs/engine-oniguruma/wasm-inlined"),
      ),
    ),
  );

  const highlighter = await createHighlighterCore({
    langs: [],
    themes: [],
    engine,
  });

  const codeToHtml = highlighter.codeToHtml;

  highlighter.codeToHtml = (...args) =>
    engine.withCachedMatches(() => codeToHtml(...args));

  return highlighter;
}
