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
 * Result of parsing a link.
 */
export interface ParsedLink {
  key: string;
  label: string | null;
}

/**
 * Functions to generate links based on style.
 */
export interface LinkReplacer {
  normal: (key: string) => string;
  labeled: (key: string, label: string) => string;
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

export function parseLink(
  link: string,
  style: LinkStyle,
): ParsedLink {
  const stripped = link.replace(/(\[\[)|(\]\])/g, "");

  switch (style) {
    case "simpesys": {
      const key = stripped.replace(/\{.+?\}$/, "");
      const labelMatch = link.match(/\]\]\{(.+)\}$/);
      return {
        key,
        label: labelMatch ? labelMatch[1] : null,
      };
    }
    case "obsidian": {
      const key = stripped.replace(/\|.+$/, "");
      const labelMatch = link.match(/\|(.+)\]\]$/);
      return {
        key,
        label: labelMatch ? labelMatch[1] : null,
      };
    }
  }
}
