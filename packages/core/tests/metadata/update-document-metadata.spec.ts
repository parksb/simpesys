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
        createdAt: createInstant("2024-01-01T00:00:00Z"),
        updatedAt: createInstant("2024-06-01T00:00:00Z"),
      },
    };
  });

  it("should use file timestamps for new document", () => {
    const docMetadata = {
      createdAt: createInstant("2024-12-01T00:00:00Z"),
      updatedAt: createInstant("2024-12-07T00:00:00Z"),
    };

    const result = getFreshMetadata("new-doc", existingMetadata, docMetadata);

    expect(result.createdAt.toString()).toBe("2024-12-01T00:00:00Z");
    expect(result.updatedAt.toString()).toBe("2024-12-07T00:00:00Z");
  });

  it("should keep existing createdAt for existing document", () => {
    const docMetadata = {
      createdAt: createInstant("2024-12-01T00:00:00Z"),
      updatedAt: createInstant("2024-12-07T00:00:00Z"),
    };

    const result = getFreshMetadata(
      "existing-doc",
      existingMetadata,
      docMetadata,
    );

    expect(result.createdAt.toString()).toBe("2024-01-01T00:00:00Z");
  });

  it("should update updatedAt when file mtime is newer", () => {
    const docMetadata = {
      createdAt: createInstant("2024-12-01T00:00:00Z"),
      updatedAt: createInstant("2024-12-07T00:00:00Z"),
    };

    const result = getFreshMetadata(
      "existing-doc",
      existingMetadata,
      docMetadata,
    );

    expect(result.updatedAt.toString()).toBe("2024-12-07T00:00:00Z");
  });

  it("should keep existing updatedAt when file mtime is older", () => {
    const docMetadata = {
      createdAt: createInstant("2024-01-01T00:00:00Z"),
      updatedAt: createInstant("2024-03-01T00:00:00Z"),
    };

    const result = getFreshMetadata(
      "existing-doc",
      existingMetadata,
      docMetadata,
    );

    expect(result.updatedAt.toString()).toBe("2024-06-01T00:00:00Z");
  });
});
