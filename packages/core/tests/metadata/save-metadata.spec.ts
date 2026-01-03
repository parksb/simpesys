import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { loadMetadata, saveMetadata } from "../../src/metadata.ts";
import { type Config, DEFAULT_CONFIG } from "../../src/config.ts";

describe("saveMetadata", () => {
  let tmpDir: string;
  let config: Config;

  beforeEach(async () => {
    tmpDir = await Deno.makeTempDir();
    config = {
      ...DEFAULT_CONFIG,
      project: {
        ...DEFAULT_CONFIG.project,
        root: tmpDir,
      },
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
        contentHash: "dummy",
      },
    };

    await saveMetadata(config, metadata);

    const loaded = await loadMetadata(config);
    expect(loaded["index"]).toBeDefined();
    expect(loaded["index"].createdAt.toString()).toBe("2025-01-01T00:00:00Z");
    expect(loaded["index"].updatedAt.toString()).toBe("2025-06-01T00:00:00Z");
    expect(loaded["index"].contentHash).toBe("dummy");
  });

  it("should overwrite existing metadata file", async () => {
    const initialMetadata = {
      "old": {
        createdAt: Temporal.Instant.from("2025-01-01T00:00:00Z"),
        updatedAt: Temporal.Instant.from("2025-01-01T00:00:00Z"),
        contentHash: "oldhash",
      },
    };

    await saveMetadata(config, initialMetadata);

    const newMetadata = {
      "new": {
        createdAt: Temporal.Instant.from("2025-12-01T00:00:00Z"),
        updatedAt: Temporal.Instant.from("2025-12-01T00:00:00Z"),
        contentHash: "newhash",
      },
    };

    await saveMetadata(config, newMetadata);

    const loaded = await loadMetadata(config);
    expect(loaded["old"]).toBeUndefined();
    expect(loaded["new"]).toBeDefined();
  });
});
