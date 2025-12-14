import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { loadMetadata } from "../../src/metadata.ts";
import { DEFAULT_CONFIG, DEFAULT_HOOKS } from "../../src/context.ts";

const FIXTURES_DIR = new URL("./fixtures", import.meta.url).pathname;

describe("loadMetadata", () => {
  it("should load metadata from JSON file", async () => {
    const context = {
      config: {
        ...DEFAULT_CONFIG,
        project: {
          ...DEFAULT_CONFIG.project,
          root: FIXTURES_DIR,
        },
      },
      hooks: { ...DEFAULT_HOOKS },
    };

    const metadata = await loadMetadata(context);

    expect(metadata["index"]).toBeDefined();
    expect(metadata["index"].createdAt.toString()).toBe("2025-01-01T00:00:00Z");
    expect(metadata["index"].updatedAt.toString()).toBe("2025-06-01T00:00:00Z");
    expect(metadata["index"].contentHash).toBe(
      "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
    );

    expect(metadata["page1"]).toBeDefined();
    expect(metadata["page1"].createdAt.toString()).toBe("2025-02-01T00:00:00Z");
    expect(metadata["page1"].updatedAt.toString()).toBe("2025-07-01T00:00:00Z");
    expect(metadata["page1"].contentHash).toBe(
      "b94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
    );
  });

  it("should return empty object when file does not exist", async () => {
    const context = {
      config: {
        ...DEFAULT_CONFIG,
        project: {
          ...DEFAULT_CONFIG.project,
          root: "/nonexistent/path",
        },
      },
      hooks: { ...DEFAULT_HOOKS },
    };

    const metadata = await loadMetadata(context);

    expect(metadata).toEqual({});
  });
});
