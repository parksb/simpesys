import Denque from "denque";
import {
  appendReferred,
  findReferences,
  findReferredSentences,
  findSubdocs,
  getMarkdownConverter,
  labelInternalLinks,
  prependToc,
} from "./markdown.ts";
import type {
  Breadcrumb,
  Document,
  DocumentDict,
  DocumentMetadata,
} from "./document.ts";
import { readFile } from "./utils.ts";
import { type Config, DEFAULT_CONFIG } from "./config.ts";
import type MarkdownIt from "markdown-it";
import { getLinkRegex, type LinkReplacer } from "./link.ts";

interface Hooks {
  /**
   * A hook that runs before initialization.
   */
  beforeInit?: () => Promise<void>;

  /**
   * A hook to manipulate the markdown content before processing.
   */
  manipulateMarkdown?: (markdown: string) => string;

  /**
   * A hook that runs after initialization.
   */
  afterInit?: (system: Simpesys) => Promise<void>;
}

export class Simpesys {
  private markdownConverter: MarkdownIt;

  private documents: DocumentDict = {};
  private config: Config = DEFAULT_CONFIG;
  private hooks: Hooks = {};

  private linkReplacer: LinkReplacer;

  constructor(
    config: Partial<Config> = {},
    hooks: Hooks = {},
    linkReplacer?: LinkReplacer,
  ) {
    this.markdownConverter = getMarkdownConverter(this.config);

    this.hooks = hooks;

    this.config = {
      docs: {
        ...DEFAULT_CONFIG.docs,
        ...config.docs,
      },
      web: {
        ...DEFAULT_CONFIG.web,
        ...config.web,
      },
      project: {
        ...DEFAULT_CONFIG.project,
        ...config.project,
      },
    };

    this.linkReplacer = linkReplacer ?? {
      normal: (key: string) => `<a href="/${key}">${key}</a>`,
      labeled: (key: string, label: string) => `<a href="/${key}">${label}</a>`,
    };
  }

  /**
   * Initialize the system by loading and processing documents.
   */
  async init(): Promise<Simpesys> {
    await this.hooks.beforeInit?.();

    const written: Set<string> = new Set([this.config.docs.root]);

    const metadata: Record<string, DocumentMetadata> = JSON.parse(
      await readFile(`${this.config.project.root}/simpesys.metadata.json`),
    );

    const queue = new Denque<{
      filename: string;
      type: Document["type"];
      breadcrumbs: Breadcrumb[];
    }>([
      {
        filename: this.config.docs.root,
        type: "subject",
        breadcrumbs: [],
      },
    ]);

    while (queue.length > 0) {
      const { filename, type, breadcrumbs } = queue.shift()!;

      try {
        let markdown = await readFile(
          `${this.config.project.docs}/${filename}.md`,
        );

        markdown = this.hooks.manipulateMarkdown?.(markdown) ?? markdown;

        const title = markdown.match(/^#\s.*/)![0].replace(/^#\s/, "");

        const document: Document = {
          title,
          filename,
          markdown,
          html: "",
          breadcrumbs: [...breadcrumbs, { title, filename }],
          children: [],
          referred: [],
          type,
          createdAt: metadata[filename]?.createdAt,
          updatedAt: metadata[filename]?.updatedAt ??
            metadata[filename]?.createdAt,
        };

        this.documents[filename] = document;

        for (const subdoc of findSubdocs(this.config, markdown, type)) {
          if (!written.has(subdoc.filename)) {
            queue.push({
              filename: subdoc.filename,
              type: subdoc.type,
              breadcrumbs: document.breadcrumbs,
            });
            written.add(subdoc.filename);
          }
        }
      } catch {
        continue;
      }
    }

    for (const document of Object.values(this.documents)) {
      document.markdown = labelInternalLinks(
        this.config,
        document.markdown,
        this.documents,
        document.filename,
      );

      for (const reference of findReferences(this.config, document.markdown)) {
        this.documents[reference].referred.push({
          document,
          sentences: findReferredSentences(
            this.config,
            document.markdown,
            this.documents[reference].filename,
            this.documents,
          ),
        });
      }
    }

    for (const document of Object.values(this.documents)) {
      document.markdown = appendReferred(
        this.config,
        document.markdown,
        document.referred,
        this.documents,
      );
      document.markdown = prependToc(document.markdown);
      document.html = this.markdownConverter
        .render(document.markdown)
        .replace(
          getLinkRegex(this.config.docs.linkStyle).labeled,
          (_: string, key: string, label: string) =>
            this.linkReplacer.labeled(key, label),
        )
        .replace(
          getLinkRegex(this.config.docs.linkStyle).normal,
          (_: string, key: string) => this.linkReplacer.normal(key),
        );
    }

    await this.hooks.afterInit?.(this);

    return this;
  }

  /**
   * Get the dictionary of documents.
   */
  getDocuments(): DocumentDict {
    return this.documents;
  }

  /**
   * Get a document by its key.
   */
  getDocument(key: string): Document | undefined {
    return this.documents[key];
  }

  /**
   * Get the applied configuration.
   */
  getConfig(): Config {
    return this.config;
  }
}
