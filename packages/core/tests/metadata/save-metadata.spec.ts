import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { loadMetadata, saveMetadata } from "../../src/metadata.ts";
import { DEFAULT_CONFIG, DEFAULT_HOOKS } from "../../src/context.ts";
import type { Context } from "../../src/context.ts";

describe("saveMetadata", () => {
  let tmpDir: string;
  let context: Context;

  beforeEach(async () => {
    tmpDir = await Deno.makeTempDir();
    context = {
      config: {
        ...DEFAULT_CONFIG,
        project: {
          ...DEFAULT_CONFIG.project,
          root: tmpDir,
        },
      },
      hooks: { ...DEFAULT_HOOKS },
    };
  });

  afterEach(async () => {
    await Deno.remove(tmpDir, { recursive: true });
  });

  it("should save metadata to JSON file", async () => {
    const metadata = {
      "index": {
        createdAt: Temporal.Instant.from("2025-01-01T00:00:00Z"),
        updatedAt: Temporal.Instant.from("2025-06-01T00:00:00Z"),
      },
    };

    await saveMetadata(context, metadata);

    const loaded = await loadMetadata(context);
    expect(loaded["index"]).toBeDefined();
    expect(loaded["index"].createdAt.toString()).toBe("2025-01-01T00:00:00Z");
    expect(loaded["index"].updatedAt.toString()).toBe("2025-06-01T00:00:00Z");
  });

  it("should overwrite existing metadata file", async () => {
    const initialMetadata = {
      "old": {
        createdAt: Temporal.Instant.from("2025-01-01T00:00:00Z"),
        updatedAt: Temporal.Instant.from("2025-01-01T00:00:00Z"),
      },
    };

    await saveMetadata(context, initialMetadata);

    const newMetadata = {
      "new": {
        createdAt: Temporal.Instant.from("2025-12-01T00:00:00Z"),
        updatedAt: Temporal.Instant.from("2025-12-01T00:00:00Z"),
      },
    };

    await saveMetadata(context, newMetadata);

    const loaded = await loadMetadata(context);
    expect(loaded["old"]).toBeUndefined();
    expect(loaded["new"]).toBeDefined();
  });
});
