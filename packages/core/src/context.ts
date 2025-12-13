import type { DocumentCandidate } from "./document.ts";
import type { LinkStyle } from "./link.ts";

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
     */
    backlinksSectionTitle: string;

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
    };
  };
}

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
   * A hook to replace labeled internal links in the markdown content.
   */
  renderInternalLink: (key: string, label?: string) => string;
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
    toc: {
      listType: "ul",
      levels: [2, 3, 4],
    },
  },
};

export const DEFAULT_HOOKS: Hooks = {
  renderInternalLink: (key, label) => `<a href="/${key}">${label ?? key}</a>`,
};

export type Context = { config: Config; hooks: Hooks };
