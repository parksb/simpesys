import * as path from "node:path";
import { encodeHex } from "@std/encoding/hex";
import type { Config } from "./context.ts";
import { METADATA_FILENAME } from "./consts.ts";

/**
 * Compute SHA-1 hash of content for change detection.
 * NOTE: This is NOT for security purposes.
 */
export async function computeContentHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return encodeHex(new Uint8Array(hashBuffer));
}

/**
 * Document metadata.
 */
export interface DocumentMetadata {
  createdAt: Temporal.Instant;
  updatedAt: Temporal.Instant;
  contentHash: string;
  previousContentHash?: string;
  previousUpdatedAt?: Temporal.Instant;
}

/**
 * Metadata mapping filenames to their document metadata.
 */
export type Metadata = Record<string, DocumentMetadata>;

/**
 * Load metadata from a JSON file.
 */
export async function loadMetadata(config: Config): Promise<Metadata> {
  try {
    const content = await Deno.readTextFile(
      path.join(config.project.root, METADATA_FILENAME),
    );

    const raw = JSON.parse(content) as Record<string, DocumentMetadata>;

    const metadata: Metadata = {};
    for (const [key, value] of Object.entries(raw)) {
      const createdAt = Temporal.Instant.from(value.createdAt);
      metadata[key] = {
        createdAt,
        updatedAt: value.updatedAt
          ? Temporal.Instant.from(value.updatedAt)
          : createdAt,
        contentHash: value.contentHash ?? "",
        previousContentHash: value.previousContentHash,
        previousUpdatedAt: value.previousUpdatedAt
          ? Temporal.Instant.from(value.previousUpdatedAt)
          : undefined,
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
 * Get file metadata including birthtime and content hash.
 */
export async function getFileMetadata(
  filePath: string,
  content: string,
): Promise<DocumentMetadata> {
  const stat = await Deno.stat(filePath);

  const createdAt = stat.birthtime
    ? Temporal.Instant.fromEpochMilliseconds(stat.birthtime.getTime())
    : Temporal.Now.instant();

  const contentHash = await computeContentHash(content);

  return { createdAt, updatedAt: createdAt, contentHash };
}

/**
 * Get fresh metadata for a document by comparing content hashes.
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
      updatedAt: Temporal.Now.instant(),
      contentHash: docMetadata.contentHash,
    };
  }

  const currentHash = docMetadata.contentHash;

  if (currentHash === existing.contentHash) {
    return existing;
  }

  if (
    currentHash === existing.previousContentHash && existing.previousUpdatedAt
  ) {
    return {
      createdAt: existing.createdAt,
      updatedAt: existing.previousUpdatedAt,
      contentHash: currentHash,
      previousContentHash: existing.contentHash,
      previousUpdatedAt: existing.updatedAt,
    };
  }

  if (!existing.contentHash) {
    return {
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      contentHash: currentHash,
    };
  }

  return {
    createdAt: existing.createdAt,
    updatedAt: Temporal.Now.instant(),
    contentHash: currentHash,
    previousContentHash: existing.contentHash,
    previousUpdatedAt: existing.updatedAt,
  };
}
