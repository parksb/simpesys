import manifest from "../deno.json" with { type: "json" };
import { type Config, DEFAULT_CONFIG } from "./config.ts";
import type { Document } from "./document.ts";
import { computeContentHash } from "./metadata.ts";

/**
 * A serializable snapshot of rendered document bodies.
 */
export interface Cache {
  version: 1;
  signature: string;
  documents: Record<string, { hash: string; html: string }>;
}

/**
 * Options for reusing and invalidating cached document.
 */
export interface CacheOptions {
  version?: string;
  previous?: Cache;
}

/**
 * Create a cache that restores unchanged document.
 */
export async function createCache(
  config: Config,
  options: CacheOptions = {},
) {
  const hasCustomRenderer = Boolean(config.hooks.configureMarkdownConverter) ||
    config.hooks.renderInternalLink !== DEFAULT_CONFIG.hooks.renderInternalLink;

  if (
    hasCustomRenderer && options.previous !== undefined &&
    options.version === undefined
  ) {
    throw new Error(
      "Reusing a cache with custom rendering hooks requires `cache.version`. " +
        "Set `cache.version`, omit `cache.previous`, or set `cache: false`.",
    );
  }

  const signature = await computeContentHash(
    JSON.stringify(
      [
        manifest.version,
        options.version,
        hasCustomRenderer,
        config.project,
        config.web,
        config.docs,
      ],
      (_, value) =>
        value instanceof RegExp
          ? { source: value.source, flags: value.flags }
          : value,
    ),
  );

  const previous = options.previous?.version === 1 &&
      options.previous.signature === signature
    ? options.previous.documents
    : undefined;

  const snapshot: Cache = {
    version: 1,
    signature,
    documents: Object.create(null),
  };

  async function restore(document: Document): Promise<boolean> {
    const hash = await computeContentHash(document.markdown);
    const cached = previous && Object.hasOwn(previous, document.filename)
      ? previous[document.filename]
      : undefined;

    const entry = { hash, html: "" };
    snapshot.documents[document.filename] = entry;

    if (cached?.hash !== hash || typeof cached.html !== "string") {
      return false;
    }

    entry.html = cached.html;
    document.html = cached.html;

    return true;
  }

  function save(document: Document): void {
    snapshot.documents[document.filename].html = document.html;
  }

  return { restore, save, snapshot };
}
