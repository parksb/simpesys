import * as path from "node:path";
import type { Config } from "./config.ts";
import { METADATA_FILENAME } from "./consts.ts";

/**
 * Document metadata.
 */
export interface DocumentMetadata {
  createdAt: Temporal.Instant;
  updatedAt: Temporal.Instant;
}

/**
 * Metadata mapping filenames to their document metadata.
 */
export type Metadata = Record<string, DocumentMetadata>;

/**
 * Legacy document metadata format for backwards compatibility.
 */
interface LegacyDocumentMetadata {
  createdAt: Temporal.Instant;
  updatedAt?: Temporal.Instant;
}

/**
 * Load metadata from a JSON file.
 */
export async function loadMetadata(config: Config): Promise<Metadata> {
  try {
    const content = await Deno.readTextFile(
      path.join(config.project.root, METADATA_FILENAME),
    );

    const raw = JSON.parse(content) as Record<string, LegacyDocumentMetadata>;

    const metadata: Metadata = {};
    for (const [key, value] of Object.entries(raw)) {
      const createdAt = Temporal.Instant.from(value.createdAt);
      metadata[key] = {
        createdAt,
        updatedAt: value.updatedAt
          ? Temporal.Instant.from(value.updatedAt)
          : createdAt,
      };
    }
    return metadata;
  } catch {
    return {};
  }
}

/**
 * Save metadata to a JSON file.
 */
export async function saveMetadata(
  config: Config,
  metadata: Metadata,
): Promise<void> {
  await Deno.writeTextFile(
    path.join(config.project.root, METADATA_FILENAME),
    JSON.stringify(metadata, null, 2),
  );
}

/**
 * Get file timestamps using Deno.stat().
 * Returns birthtime as createdAt and mtime as updatedAt.
 */
export async function getFileMetadata(
  filePath: string,
): Promise<DocumentMetadata> {
  const stat = await Deno.stat(filePath);

  const createdAt = stat.birthtime
    ? Temporal.Instant.fromEpochMilliseconds(stat.birthtime.getTime())
    : Temporal.Now.instant();

  const updatedAt = stat.mtime
    ? Temporal.Instant.fromEpochMilliseconds(stat.mtime.getTime())
    : createdAt;

  return { createdAt, updatedAt };
}

/**
 * Get fresh metadata for a document,
 */
export function getFreshMetadata(
  filename: string,
  metadata: Metadata,
  docMetadata: DocumentMetadata,
): DocumentMetadata {
  const existing = metadata[filename];

  if (!existing) {
    return {
      createdAt: docMetadata.createdAt,
      updatedAt: docMetadata.updatedAt,
    };
  }

  const isNewer =
    Temporal.Instant.compare(docMetadata.updatedAt, existing.updatedAt) > 0;

  return {
    createdAt: existing.createdAt,
    updatedAt: isNewer ? docMetadata.updatedAt : existing.updatedAt,
  };
}
