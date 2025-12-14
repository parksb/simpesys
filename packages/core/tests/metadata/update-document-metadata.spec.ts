import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getFreshMetadata } from "../../src/metadata.ts";
import type { Metadata } from "../../src/metadata.ts";

describe("getFreshMetadata", () => {
  let existingMetadata: Metadata;

  const createInstant = (isoString: string) => Temporal.Instant.from(isoString);

  beforeEach(() => {
    existingMetadata = {
      "existing-doc": {
        createdAt: createInstant("2025-01-01T00:00:00Z"),
        updatedAt: createInstant("2025-06-01T00:00:00Z"),
        contentHash: "dummy",
      },
    };
  });

  it("should set updatedAt to now for new document", () => {
    const docMetadata = {
      createdAt: createInstant("2025-12-01T00:00:00Z"),
      updatedAt: createInstant("2025-12-01T00:00:00Z"),
      contentHash: "newhash",
    };

    const before = Temporal.Now.instant();
    const result = getFreshMetadata("new-doc", existingMetadata, docMetadata);
    const after = Temporal.Now.instant();

    expect(result.createdAt.toString()).toBe("2025-12-01T00:00:00Z");
    expect(result.contentHash).toBe("newhash");
    expect(
      Temporal.Instant.compare(result.updatedAt, before),
    ).toBeGreaterThanOrEqual(0);
    expect(Temporal.Instant.compare(result.updatedAt, after))
      .toBeLessThanOrEqual(
        0,
      );
  });

  it("should keep existing createdAt for existing document", () => {
    const docMetadata = {
      createdAt: createInstant("2025-12-01T00:00:00Z"),
      updatedAt: createInstant("2025-12-01T00:00:00Z"),
      contentHash: "differenthash",
    };

    const result = getFreshMetadata(
      "existing-doc",
      existingMetadata,
      docMetadata,
    );

    expect(result.createdAt.toString()).toBe("2025-01-01T00:00:00Z");
  });

  it("should update updatedAt when content hash changes", () => {
    const docMetadata = {
      createdAt: createInstant("2025-12-01T00:00:00Z"),
      updatedAt: createInstant("2025-12-01T00:00:00Z"),
      contentHash: "differenthash",
    };

    const before = Temporal.Now.instant();
    const result = getFreshMetadata(
      "existing-doc",
      existingMetadata,
      docMetadata,
    );
    const after = Temporal.Now.instant();

    expect(result.contentHash).toBe("differenthash");
    expect(
      Temporal.Instant.compare(result.updatedAt, before),
    ).toBeGreaterThanOrEqual(0);
    expect(Temporal.Instant.compare(result.updatedAt, after))
      .toBeLessThanOrEqual(
        0,
      );
  });

  it("should keep existing updatedAt when content hash is same", () => {
    const docMetadata = {
      createdAt: createInstant("2025-12-01T00:00:00Z"),
      updatedAt: createInstant("2025-12-01T00:00:00Z"),
      contentHash: "dummy",
    };

    const result = getFreshMetadata(
      "existing-doc",
      existingMetadata,
      docMetadata,
    );

    expect(result.updatedAt.toString()).toBe("2025-06-01T00:00:00Z");
    expect(result.contentHash).toBe("dummy");
  });

  it("should store previous state when hash changes", () => {
    const docMetadata = {
      createdAt: createInstant("2025-12-01T00:00:00Z"),
      updatedAt: createInstant("2025-12-01T00:00:00Z"),
      contentHash: "newhash",
    };

    const result = getFreshMetadata(
      "existing-doc",
      existingMetadata,
      docMetadata,
    );

    expect(result.contentHash).toBe("newhash");
    expect(result.previousContentHash).toBe("dummy");
    expect(result.previousUpdatedAt?.toString()).toBe("2025-06-01T00:00:00Z");
  });

  it("should restore previous updatedAt when reverted to previous hash", () => {
    existingMetadata["existing-doc"] = {
      createdAt: createInstant("2025-01-01T00:00:00Z"),
      updatedAt: createInstant("2025-07-01T00:00:00Z"),
      contentHash: "modified",
      previousContentHash: "original",
      previousUpdatedAt: createInstant("2025-06-01T00:00:00Z"),
    };

    const docMetadata = {
      createdAt: createInstant("2025-12-01T00:00:00Z"),
      updatedAt: createInstant("2025-12-01T00:00:00Z"),
      contentHash: "original",
    };

    const result = getFreshMetadata(
      "existing-doc",
      existingMetadata,
      docMetadata,
    );

    expect(result.contentHash).toBe("original");
    expect(result.updatedAt.toString()).toBe("2025-06-01T00:00:00Z");
    expect(result.previousContentHash).toBe("modified");
    expect(result.previousUpdatedAt?.toString()).toBe("2025-07-01T00:00:00Z");
  });
});
