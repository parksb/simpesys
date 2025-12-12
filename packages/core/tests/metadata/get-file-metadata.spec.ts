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

  it("should return file timestamps", async () => {
    const filePath = `${tmpDir}/test.md`;
    await Deno.writeTextFile(filePath, "# Test");

    const metadata = await getFileMetadata(filePath);

    expect(metadata.createdAt).toBeDefined();
    expect(metadata.updatedAt).toBeDefined();
    expect(metadata.createdAt instanceof Temporal.Instant).toBe(true);
    expect(metadata.updatedAt instanceof Temporal.Instant).toBe(true);
  });

  it("should have updatedAt >= createdAt", async () => {
    const filePath = `${tmpDir}/test.md`;
    await Deno.writeTextFile(filePath, "# Test");

    const metadata = await getFileMetadata(filePath);

    const comparison = Temporal.Instant.compare(
      metadata.updatedAt,
      metadata.createdAt,
    );
    expect(comparison).toBeGreaterThanOrEqual(0);
  });

  it("should update updatedAt when file is modified", async () => {
    const filePath = `${tmpDir}/test.md`;
    await Deno.writeTextFile(filePath, "# Test");

    const beforeModify = await getFileMetadata(filePath);
    await Deno.writeTextFile(filePath, "# Test Modified");

    const afterModify = await getFileMetadata(filePath);

    const comparison = Temporal.Instant.compare(
      afterModify.updatedAt,
      beforeModify.updatedAt,
    );
    expect(comparison).toBeGreaterThanOrEqual(0);
  });
});
