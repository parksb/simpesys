import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getFileMetadata } from "../../src/metadata.ts";

describe("getFileMetadata", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await Deno.makeTempDir();
  });

  afterEach(async () => {
    await Deno.remove(tmpDir, { recursive: true });
  });

  it("should return file metadata with content hash", async () => {
    const filePath = `${tmpDir}/test.md`;
    const content = "# Test";
    await Deno.writeTextFile(filePath, content);

    const metadata = await getFileMetadata(filePath, content);

    expect(metadata.createdAt).toBeDefined();
    expect(metadata.updatedAt).toBeDefined();
    expect(metadata.contentHash).toBeDefined();
    expect(metadata.createdAt instanceof Temporal.Instant).toBe(true);
    expect(metadata.updatedAt instanceof Temporal.Instant).toBe(true);
    expect(typeof metadata.contentHash).toBe("string");
    expect(metadata.contentHash.length).toBe(40); // SHA-1 hex length
  });

  it("should return same hash for same content", async () => {
    const filePath = `${tmpDir}/test.md`;
    const content = "# Test";
    await Deno.writeTextFile(filePath, content);

    const metadata1 = await getFileMetadata(filePath, content);
    const metadata2 = await getFileMetadata(filePath, content);

    expect(metadata1.contentHash).toBe(metadata2.contentHash);
  });

  it("should return different hash for different content", async () => {
    const filePath = `${tmpDir}/test.md`;
    await Deno.writeTextFile(filePath, "# Test");

    const metadata1 = await getFileMetadata(filePath, "# Test");
    const metadata2 = await getFileMetadata(filePath, "# Test Modified");

    expect(metadata1.contentHash).not.toBe(metadata2.contentHash);
  });
});
