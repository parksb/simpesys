import { dirname, join, normalize } from "@std/path/posix";

export type LinkStyle = "simpesys" | "obsidian";

export interface LinkRegexSet {
  /**
   * Regex to match normal links without labels.
   */
  normal: RegExp;

  /**
   * Regex to match labeled links.
   */
  labeled: RegExp;

  /**
   * Regex to match all links.
   */
  all: RegExp;

  /**
   * Function to get regex for a specific key (with or without label).
   */
  forKey: (key: string) => RegExp;

  /**
   * Function to get regex for a specific key with label.
   */
  forKeyLabeled: (key: string) => RegExp;

  /**
   * Regex to match list items containing links.
   */
  listItem: RegExp;
}

/**
 * Result of resolving a link.
 */
export interface ResolvedLink {
  key: string;
  label: string | null;
}

export function getLinkRegex(
  style: LinkStyle,
): LinkRegexSet {
  switch (style) {
    case "simpesys":
      return {
        normal: /\[\[([^\]]+)\]\](?!\{)/g,
        labeled: /\[\[([^\]]+)\]\]\{([^}]+)\}/g,
        all: /\[\[([^\]]+)\]\](\{[^}]+\})?/g,
        forKey: (key: string) =>
          new RegExp(`\\[\\[${key}\\]\\](\\{.+?\\})?`, "g"),
        forKeyLabeled: (key: string) =>
          new RegExp(`\\[\\[${key}\\]\\]\\{(.+?)\\}`, "g"),
        listItem: /(-|\*) (\[\[.+?\]\](?:\{.+?\})?)/,
      };
    case "obsidian":
      return {
        normal: /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g,
        labeled: /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
        all: /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g,
        forKey: (key: string) => new RegExp(`\\[\\[${key}(\\|.+?)?\\]\\]`, "g"),
        forKeyLabeled: (key: string) =>
          new RegExp(`\\[\\[${key}\\|(.+?)\\]\\]`, "g"),
        listItem: /(-|\*) (\[\[.+?\]\])/,
      };
  }
}

export function getLink(
  key: string,
  label: string | null,
  style: LinkStyle,
) {
  switch (style) {
    case "simpesys":
      return label ? `[[${key}]]{${label}}` : `[[${key}]]`;
    case "obsidian":
      return label ? `[[${key}|${label}]]` : `[[${key}]]`;
  }
}

export function resolveLink(
  link: string,
  style: LinkStyle,
  currentPath?: string,
): ResolvedLink {
  const stripped = link.replace(/(\[\[)|(\]\])/g, "");

  switch (style) {
    case "simpesys": {
      const path = stripped.replace(/\{.+?\}$/, "");
      const labelMatch = link.match(/\]\]\{(.+)\}$/);
      return {
        key: resolveRelativePathToKey(path, currentPath),
        label: labelMatch ? labelMatch[1] : null,
      };
    }
    case "obsidian": {
      const path = stripped.replace(/\|.+$/, "");
      const labelMatch = link.match(/\|(.+)\]\]$/);
      return {
        key: resolveRelativePathToKey(path, currentPath),
        label: labelMatch ? labelMatch[1] : null,
      };
    }
  }
}

/**
 * Resolve a relative path to key (root-based relative path).
 */
function resolveRelativePathToKey(path: string, currentPath?: string): string {
  if (!currentPath) {
    return path;
  }

  const resolvedPath = normalize(join(dirname(currentPath), path)).replace(
    /^(\.\.\/)+/,
    "",
  );

  return resolvedPath === "." ? "" : resolvedPath;
}
