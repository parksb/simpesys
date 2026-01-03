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
import { type Config, type DeepPartial, DEFAULT_CONFIG } from "./context.ts";
import type MarkdownIt from "markdown-it";
import { getLinkRegex } from "./link.ts";
import {
  getFileMetadata,
  getFreshMetadata,
  loadMetadata,
  saveMetadata,
} from "./metadata.ts";

export class Simpesys {
  private markdownConverter: MarkdownIt;

  private documents: DocumentDict = {};
  private written: Set<string> = new Set([]);

  private config: Config;

  constructor(config: DeepPartial<Config> = {}) {
    this.config = toMerged(DEFAULT_CONFIG, config);
    this.markdownConverter = getMarkdownConverter(this.config);
  }

  /**
   * Initialize the system by loading and processing documents.
   */
  async init(options: { syncMetadata?: boolean } = {}): Promise<Simpesys> {
    if (this.written.size > 0) {
      throw new Error("Simpesys has already been initialized.");
    }

    this.written.add(this.config.docs.root);

    const rawMetadata = await loadMetadata(this.config);

    const queue = new Denque<DocumentCandidate>([
      {
        filename: this.config.docs.root,
        type: "subject",
        breadcrumbs: [],
      },
    ]);

    while (queue.length > 0) {
      const candidate = queue.shift()!;
      const { filename, type, breadcrumbs } = candidate;

      try {
        const docPath = `${this.config.project.docs}/${filename}.md`;

        let markdown = await Deno.readTextFile(docPath);

        const metadata = await getFileMetadata(docPath, markdown);
        rawMetadata[filename] = getFreshMetadata(
          filename,
          rawMetadata,
          metadata,
        );

        markdown =
          this.config.hooks?.manipulateMarkdown?.(markdown, candidate) ??
            markdown;

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

        for (
          const subdoc of findSubdocs(this.config, markdown, type, filename)
        ) {
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

      await saveMetadata(this.config, rawMetadata);
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
      document.html = this.markdownConverter.render(document.markdown);

      document.html = withHTMLCodePreserved(document.html, (html) =>
        html
          .replace(
            getLinkRegex(this.config.docs.linkStyle).labeled,
            (_: string, key: string, label: string) =>
              this.config.hooks.renderInternalLink(key, label),
          )
          .replace(
            getLinkRegex(this.config.docs.linkStyle).normal,
            (_: string, key: string) =>
              this.config.hooks.renderInternalLink(key),
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
    return this.config;
  }
}
