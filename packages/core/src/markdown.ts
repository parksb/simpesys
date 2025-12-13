import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import mdFootnote from "markdown-it-footnote";
import mdTex from "markdown-it-texmath";
import mdAnchor from "markdown-it-anchor";
import mdTableOfContents from "markdown-it-table-of-contents";
import mdInlineComment from "markdown-it-inline-comments";
import mdCheckbox from "markdown-it-task-checkbox";
import mdExternalLink from "markdown-it-external-links";
import mdMermaid from "@markslides/markdown-it-mermaid";
import mdContainer from "markdown-it-container";
import mdImSize from "markdown-it-imsize";
import { full as mdEmoji } from "markdown-it-emoji";
import * as katex from "katex";

import type { Document, DocumentDict, Reference } from "./document.ts";
import type { Context } from "./context.ts";
import { getLink, getLinkRegex, parseLink } from "./link.ts";

/**
 * Create a MarkdownIt converter with predefined plugins and options.
 */
export function getMarkdownConverter(context: Context) {
  const { config } = context;

  const md = MarkdownIt({
    html: true,
    xhtmlOut: false,
    breaks: false,
    langPrefix: "language-",
    linkify: true,
    typographer: true,
    quotes: "“”‘’",
    highlight: (str: string, lang: string) => {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang }).value
        }</code></pre>`;
      }
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    },
  })
    .use(mdFootnote)
    .use(mdInlineComment)
    .use(mdMermaid)
    .use(mdEmoji)
    .use(mdAnchor)
    .use(mdImSize)
    .use(mdTex, {
      engine: katex,
      delimiters: "dollars",
      macros: { "\\RR": "\\mathbb{R}" },
    })
    .use(mdTableOfContents, {
      includeLevel: config.docs.toc.levels,
      listType: config.docs.toc.listType,
      format: (content: string) => content.replace(/\[\^.*\]/, ""),
    })
    .use(mdCheckbox, {
      disabled: true,
    })
    .use(mdContainer, "TOGGLE", {
      validate(param: string) {
        return param.trim().match(/^TOGGLE\s+(.*)$/);
      },
      // Types for render function are not defined in markdown-it-container
      // deno-lint-ignore no-explicit-any
      render(tokens: any[], idx: number) {
        const content = tokens[idx].info.trim().match(/^TOGGLE\s+(.*)$/);
        if (tokens[idx].nesting === 1) {
          return `<details><summary>${
            md.utils.escapeHtml(
              content[1],
            )
          }</summary>\n`;
        }
        return "</details>\n";
      },
    })
    .use(mdContainer, "NOTE", {
      validate: (param: string) => param.trim() == "NOTE",
    })
    .use(mdContainer, "INFO", {
      validate: (param: string) => param.trim() == "INFO",
    })
    .use(mdExternalLink, {
      externalClassName: "external",
      internalDomains: [config.web.domain.replace(/https?:\/\//, "")],
    });

  return md;
}

/**
 * Insert table of contents right after the first line of the markdown.
 */
export const prependToc = (markdown: string) => {
  const lines = markdown.split("\n");
  if (lines.length === 0) return markdown;
  return [lines[0], "[[toc]]", ...lines.slice(1)].join("\n");
};

/**
 * Append the referred documents to the markdown.
 */
export const appendReferred = (
  context: Context,
  markdown: string,
  referred: Reference[],
  dict: DocumentDict,
) => {
  if (referred.length === 0) return markdown;

  const { config } = context;

  const referredList = referred
    .map(
      ({ document, sentences }) =>
        `- ${getLink(document.filename, null, config.docs.linkStyle)}${
          sentences
            .map((sentence) => `\n  - > ${sentence}`)
            .join("")
        }`,
    )
    .join("\n");

  return labelInternalLinks(
    context,
    `${markdown}\n\n## ${config.docs.backlinksSectionTitle}\n\n${referredList}`,
    dict,
  );
};

/**
 * Find the sentences that refer to the word.
 */
export const findReferredSentences = (
  context: Context,
  markdown: string,
  word: string,
  dict: DocumentDict,
) => {
  const { config } = context;

  const regex = getLinkRegex(config.docs.linkStyle);
  const linkPattern = regex.forKey(word);
  const labeledLinkPattern = regex.forKeyLabeled(word);

  return (
    markdown
      .split(/(?<!\{[}]*)(?<=다\.|[가까]\?\s)(?![}]*\})|\n/)
      .map((sentence) =>
        sentence
          .trim()
          .replace(/^(-\s|\*\s|\d\.\s|>\s|#+\s)/g, "")
          .trim()
      )
      .filter((sentence) => {
        linkPattern.lastIndex = 0;
        return linkPattern.test(sentence);
      })
      .map((sentence) => labelInternalLinks(context, sentence, dict))
      .map((sentence) => sentence.replace(labeledLinkPattern, "<b>$1</b>"))
      .filter(
        (sentence) =>
          sentence !== `<b>${dict[word].title}</b>` && sentence.length > 0,
      ) ?? []
  );
};

/**
 * Find the filenames with type of the sub-documents.
 *
 * ```
 * findSubdocs('## Subpages\n- [[a]]\n- [[b]]{B}')
 * // [{ filename: 'a', type: 'subject' }, { filename: 'b', type: 'subject' }]
 * ```
 */
export const findSubdocs = (
  context: Context,
  markdown: string,
  type: Document["type"],
) => {
  const { config } = context;

  const subdocs: { filename: string; type: Document["type"] }[] = [];
  const subdocSection = new RegExp(
    `##\\s${config.docs.subdocumentsSectionTitle}\\s*\\n+([\\s\\S]*?)(?=\\n##\\s|$)`,
  ).exec(markdown);

  if (!subdocSection) return subdocs;

  const regex = getLinkRegex(config.docs.linkStyle);
  let isPublicationSeciton = false;
  for (const line of subdocSection[1].trim().split("\n")) {
    if (line.trim() === `### ${config.docs.publicationsSectionTitle}`) {
      isPublicationSeciton = true;
    }

    const match = line.match(regex.listItem);
    if (match) {
      const { key: filename } = parseLink(match[2], config.docs.linkStyle);
      subdocs.push({
        filename,
        type: isPublicationSeciton ? "publication" : type,
      });
    }
  }

  return subdocs;
};

/**
 * Label the internal links in the markdown.
 */
export const labelInternalLinks = (
  context: Context,
  markdown: string,
  dict: DocumentDict,
  parent?: string,
) => {
  const { config, hooks } = context;

  const regex = getLinkRegex(config.docs.linkStyle);

  return withCodeBlocksPreserved(
    markdown,
    (text) =>
      text.replace(regex.all, (match) => {
        const { key, label } = parseLink(match, config.docs.linkStyle);

        try {
          if (!dict[key]) {
            throw new Error(
              `Unresolved internal link: ${match} in ${parent}.md`,
            );
          }

          if (label) return match;

          return getLink(key, dict[key].title, config.docs.linkStyle);
        } catch (e: unknown) {
          if (e instanceof Error) {
            hooks?.onInternalLinkUnresolved?.(e);
          }

          if (label) {
            return getLink(config.docs.notFound, label, config.docs.linkStyle);
          }

          if (key.startsWith("private/")) {
            return getLink(
              config.docs.notFound,
              key.replace(/./g, "*"),
              config.docs.linkStyle,
            );
          }

          return getLink(config.docs.notFound, key, config.docs.linkStyle);
        }
      }),
  );
};

/**
 * Find the documents this markdown references.
 */
export const findReferences = (context: Context, markdown: string) => {
  const { config } = context;

  const regex = getLinkRegex(config.docs.linkStyle);
  const extractKey = (link: string) =>
    parseLink(link, config.docs.linkStyle).key;

  return Array.from(
    new Set(stripCodeBlocks(markdown).match(regex.all)?.map(extractKey) || []),
  );
};

/**
 * Validate the markdown document.
 */
export const validate = (markdown: string) => {
  if (!markdown.startsWith("# ")) {
    throw new Error("The document must start with a header.");
  }
  return true;
};

/**
 * Apply a transformation function to HTML while preserving code tags.
 */
export const withHTMLCodePreserved = (
  html: string,
  transform: (text: string) => string,
): string => {
  const codeContents: string[] = [];

  const result = html.replace(/<code[^>]*>[\s\S]*?<\/code>/g, (match) => {
    codeContents.push(match);
    return `__HTML_CODE_${codeContents.length - 1}__`;
  });

  return transform(result).replace(/__HTML_CODE_(\d+)__/g, (_, index) => {
    return codeContents[parseInt(index)];
  });
};

/**
 * Apply a transformation function to markdown while preserving code blocks.
 */
const withCodeBlocksPreserved = (
  markdown: string,
  transform: (text: string) => string,
): string => {
  const codeBlocks: string[] = [];

  const result = markdown.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  }).replace(/`[^`]+`/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  return transform(result).replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
    return codeBlocks[parseInt(index)];
  });
};

/**
 * Removes fenced code blocks (```) and inline code (`) from the markdown.
 */
const stripCodeBlocks = (markdown: string): string => {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
};
