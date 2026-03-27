import { toMerged } from "es-toolkit";
import type MarkdownIt from "markdown-it";
import type { DocumentCandidate } from "./document.ts";
import type { LinkStyle } from "./link.ts";

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface Hooks {
  /**
   * A hook to manipulate the markdown content before processing.
   */
  manipulateMarkdown?: (
    markdown: string,
    candidate: DocumentCandidate,
  ) => string;

  /**
   * A hook that is called when an internal link cannot be resolved.
   */
  onInternalLinkUnresolved?: (error: Error) => void;

  /**
   * A hook to customize the MarkdownIt converter after default plugins are applied.
   */
  configureMarkdownConverter?: (md: MarkdownIt) => void;

  /**
   * A hook to replace labeled internal links in the markdown content.
   */
  renderInternalLink: (key: string, label?: string) => string;
}

export interface Config {
  web: {
    /**
     * The domain of the website. (default: "http://localhost:8000")
     */
    domain: string;
  };
  project: {
    /**
     * A path to the root directory of the project.
     */
    root: string;

    /**
     * A path to the documents directory, relative to the project root. (default: "docs")
     */
    docs: string;
  };
  docs: {
    /**
     * The root document key. (default: "index" for "index.md")
     */
    root: string;

    /**
     * The key of the "not found" document. (default: "404" for "404.md")
     */
    notFound: string;

    /**
     * The style of internal links. (default: "simpesys")
     *
     * - "simpesys": "[[key]]", "[[key]]{label}"
     * - "obsidian": "[[key]]", "[[key|label]]"
     */
    linkStyle: LinkStyle;

    /**
     * The h2 title of the subdocuments section. (default: ["Subpages"])
     */
    subdocumentsSectionTitle: string[];

    /**
     * The h3 title of the publications section. (default: ["Publications"])
     */
    publicationsSectionTitle: string[];

    /**
     * The h2 title of the backlinks section. (default: "Backlinks")
     * If set to null, the backlinks section will not be generated.
     */
    backlinksSectionTitle: string | null;

    /**
     * Configuration for code blocks.
     */
    code: {
      /**
       * The theme for syntax highlighting.
       * Find available themes in shiki: https://shiki.style/themes
       */
      themes: {
        /**
         * The light theme for syntax highlighting. (default: "github-light")
         */
        light: string;
        /**
         * The dark theme for syntax highlighting. (default: "github-dark")
         */
        dark: string;
      };
      /**
       * Languages to load for syntax highlighting. (default: "auto")
       * - "auto": Detect languages from code fences in documents.
       * - string[]: Explicitly specify languages to load, e.g., ["javascript", "python"].
       */
      languages: "auto" | string[];
    };

    /**
     * Table of contents configuration.
     */
    toc: {
      /**
       * The list type for the table of contents. (default: "ul")
       *
       * - "ul": Unordered list (bullet points)
       * - "ol": Ordered list (numbers)
       */
      listType: "ul" | "ol";

      /**
       * The heading levels to include in the table of contents. (default: [2, 3, 4])
       */
      levels: number[];

      /**
       * Configuration for the table of contents marker.
       */
      marker: {
        /**
         * A default marker for table of contents. (default: [[toc]])
         * If set to null, the table of contents will not be automatically inserted.
         */
        default: string | null;

        /**
         * A pattern to identify the marker for table of contents. (default: /^\[\[toc\]\]/im)
         */
        pattern: RegExp;
      };
    };
  };
  hooks: Hooks;
}

export const DEFAULT_CONFIG: Config = {
  web: {
    domain: "localhost:8000",
  },
  project: {
    root: "./",
    docs: "docs",
  },
  docs: {
    root: "index",
    notFound: "404",
    linkStyle: "simpesys",
    subdocumentsSectionTitle: ["Subpages"],
    publicationsSectionTitle: ["Publications"],
    backlinksSectionTitle: "Backlinks",
    code: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      languages: "auto",
    },
    toc: {
      listType: "ul",
      levels: [2, 3, 4],
      marker: {
        default: "[[toc]]",
        pattern: /^\[\[toc\]\]/im,
      },
    },
  },
  hooks: {
    renderInternalLink: (key, label) => `<a href="/${key}">${label ?? key}</a>`,
  },
};

/**
 * Helper function to define a configuration with type safety.
 * Merges the provided configuration with default values.
 */
export function defineConfig(config: DeepPartial<Config>): Config {
  return toMerged(DEFAULT_CONFIG, config);
}
