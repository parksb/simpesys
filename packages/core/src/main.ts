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
import type { Document, DocumentCandidate, DocumentDict } from "./document.ts";
import { type Config, DEFAULT_CONFIG } from "./config.ts";
import type MarkdownIt from "markdown-it";
import { getLinkRegex, type LinkReplacer } from "./link.ts";
import {
  getFileMetadata,
  getFreshMetadata,
  loadMetadata,
  saveMetadata,
} from "./metadata.ts";
import type { Context, DeepPartial, Hooks } from "./types.ts";

export class Simpesys {
  private markdownConverter: MarkdownIt;

  private documents: DocumentDict = {};
  private written: Set<string> = new Set([]);
  private context: Context = { ...DEFAULT_CONFIG, hooks: {} };

  private linkReplacer: LinkReplacer;

  constructor(
    config: DeepPartial<Config> = {},
    hooks: Hooks = {},
    linkReplacer?: LinkReplacer,
  ) {
    this.context = {
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
      hooks: {
        ...hooks,
      },
    };

    this.markdownConverter = getMarkdownConverter(this.context);

    this.linkReplacer = linkReplacer ?? {
      normal: (key: string) => `<a href="/${key}">${key}</a>`,
      labeled: (key: string, label: string) => `<a href="/${key}">${label}</a>`,
    };
  }

  /**
   * Initialize the system by loading and processing documents.
   */
  async init(options: { syncMetadata?: boolean } = {}): Promise<Simpesys> {
    if (this.written.size > 0) {
      throw new Error("Simpesys has already been initialized.");
    }

    this.written.add(this.context.docs.root);

    const rawMetadata = await loadMetadata(this.context);

    const queue = new Denque<DocumentCandidate>([
      {
        filename: this.context.docs.root,
        type: "subject",
        breadcrumbs: [],
      },
    ]);

    while (queue.length > 0) {
      const candidate = queue.shift()!;
      const { filename, type, breadcrumbs } = candidate;

      try {
        const docPath = `${this.context.project.docs}/${filename}.md`;

        const metadata = await getFileMetadata(docPath);
        rawMetadata[filename] = getFreshMetadata(
          filename,
          rawMetadata,
          metadata,
        );

        let markdown = await Deno.readTextFile(docPath);
        markdown =
          this.context.hooks?.manipulateMarkdown?.(markdown, candidate) ??
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
      document.html = this.markdownConverter
        .render(document.markdown)
        .replace(
          getLinkRegex(this.context.docs.linkStyle).labeled,
          (_: string, key: string, label: string) =>
            this.linkReplacer.labeled(key, label),
        )
        .replace(
          getLinkRegex(this.context.docs.linkStyle).normal,
          (_: string, key: string) => this.linkReplacer.normal(key),
        );
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
    return this.context;
  }
}
