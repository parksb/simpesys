import Denque from "denque";
import { toMerged } from "es-toolkit";
import {
  appendReferred,
  findReferences,
  findReferredSentences,
  findSubdocs,
  getMarkdownConverter,
  labelInternalLinks,
  prependToc,
  withHTMLCodePreserved,
} from "./markdown.ts";
import type { Document, DocumentCandidate, DocumentDict } from "./document.ts";
import {
  type Config,
  type Context,
  DEFAULT_CONFIG,
  DEFAULT_HOOKS,
} from "./context.ts";
import type MarkdownIt from "markdown-it";
import { getLinkRegex } from "./link.ts";
import {
  getFileMetadata,
  getFreshMetadata,
  loadMetadata,
  saveMetadata,
} from "./metadata.ts";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export class Simpesys {
  private markdownConverter: MarkdownIt;

  private documents: DocumentDict = {};
  private written: Set<string> = new Set([]);

  private context: Context = {
    config: { ...DEFAULT_CONFIG },
    hooks: { ...DEFAULT_HOOKS },
  };

  constructor({ config, hooks }: DeepPartial<Context>) {
    this.context = {
      config: toMerged(DEFAULT_CONFIG, config ?? {}),
      hooks: toMerged(DEFAULT_HOOKS, hooks ?? {}),
    };

    this.markdownConverter = getMarkdownConverter(this.context);
  }

  /**
   * Initialize the system by loading and processing documents.
   */
  async init(options: { syncMetadata?: boolean } = {}): Promise<Simpesys> {
    const { config, hooks } = this.context;

    if (this.written.size > 0) {
      throw new Error("Simpesys has already been initialized.");
    }

    this.written.add(config.docs.root);

    const rawMetadata = await loadMetadata(this.context);

    const queue = new Denque<DocumentCandidate>([
      {
        filename: config.docs.root,
        type: "subject",
        breadcrumbs: [],
      },
    ]);

    while (queue.length > 0) {
      const candidate = queue.shift()!;
      const { filename, type, breadcrumbs } = candidate;

      try {
        const docPath = `${config.project.docs}/${filename}.md`;

        const metadata = await getFileMetadata(docPath);
        rawMetadata[filename] = getFreshMetadata(
          filename,
          rawMetadata,
          metadata,
        );

        let markdown = await Deno.readTextFile(docPath);

        markdown = hooks?.manipulateMarkdown?.(markdown, candidate) ?? markdown;

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
          createdAt: rawMetadata[filename].createdAt,
          updatedAt: rawMetadata[filename].updatedAt,
        };

        this.documents[filename] = document;

        for (const subdoc of findSubdocs(this.context, markdown, type)) {
          if (!this.written.has(subdoc.filename)) {
            queue.push({
              filename: subdoc.filename,
              type: subdoc.type,
              breadcrumbs: document.breadcrumbs,
            });

            this.written.add(subdoc.filename);
          }
        }
      } catch {
        continue;
      }
    }

    if (options?.syncMetadata) {
      for (const key of Object.keys(rawMetadata)) {
        if (!this.documents[key] || key.startsWith("private/")) {
          delete rawMetadata[key];
        }
      }

      await saveMetadata(this.context, rawMetadata);
    }

    for (const document of Object.values(this.documents)) {
      document.markdown = labelInternalLinks(
        this.context,
        document.markdown,
        this.documents,
        document.filename,
      );

      for (const reference of findReferences(this.context, document.markdown)) {
        this.documents[reference].referred.push({
          document,
          sentences: findReferredSentences(
            this.context,
            document.markdown,
            this.documents[reference].filename,
            this.documents,
          ),
        });
      }
    }

    for (const document of Object.values(this.documents)) {
      document.markdown = appendReferred(
        this.context,
        document.markdown,
        document.referred,
        this.documents,
      );
      document.markdown = prependToc(document.markdown);
      document.html = this.markdownConverter.render(document.markdown);

      document.html = withHTMLCodePreserved(document.html, (html) =>
        html
          .replace(
            getLinkRegex(config.docs.linkStyle).labeled,
            (_: string, key: string, label: string) =>
              hooks.renderInternalLink(key, label),
          )
          .replace(
            getLinkRegex(config.docs.linkStyle).normal,
            (_: string, key: string) => hooks.renderInternalLink(key),
          ));
    }

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
    return this.context.config;
  }
}
