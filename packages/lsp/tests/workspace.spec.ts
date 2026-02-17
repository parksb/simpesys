import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "@std/testing/bdd";
import { expect } from "@std/expect";
import { createWorkspace, type Workspace } from "../src/workspace.ts";
import { join } from "@std/path/posix";

const FIXTURES_DIR = join(
  new URL(".", import.meta.url).pathname,
  "../../../examples/bare/docs",
);

describe("workspace", () => {
  let ws: Workspace;

  beforeEach(async () => {
    ws = createWorkspace();
    await ws.buildIndex(FIXTURES_DIR, "simpesys");
  });

  describe("buildIndex", () => {
    it("should index all markdown files", () => {
      expect(ws.hasDoc("index")).toBe(true);
      expect(ws.hasDoc("ipsum")).toBe(true);
      expect(ws.hasDoc("lorem")).toBe(true);
      expect(ws.hasDoc("code")).toBe(true);
      expect(ws.hasDoc("404")).toBe(true);
      expect(ws.hasDoc("private/sit")).toBe(true);
    });

    it("should extract titles", () => {
      expect(ws.getDoc("index")?.title).toBe("Index");
      expect(ws.getDoc("ipsum")?.title).toBe("Ipsum");
      expect(ws.getDoc("lorem")?.title).toBe("Lorem");
      expect(ws.getDoc("code")?.title).toBe("Code");
      expect(ws.getDoc("404")?.title).toBe("404 Not Found");
    });

    it("should set correct file paths", () => {
      expect(ws.getDoc("index")?.path).toBe(join(FIXTURES_DIR, "index.md"));
      expect(ws.getDoc("private/sit")?.path).toBe(
        join(FIXTURES_DIR, "private/sit.md"),
      );
    });

    it("should return undefined for nonexistent documents", () => {
      expect(ws.getDoc("nonexistent")).toBeUndefined();
      expect(ws.hasDoc("nonexistent")).toBe(false);
    });
  });

  describe("getAllKeys", () => {
    it("should return all document keys", () => {
      const keys = ws.getAllKeys();
      expect(keys).toContain("index");
      expect(keys).toContain("ipsum");
      expect(keys).toContain("lorem");
      expect(keys).toContain("code");
      expect(keys).toContain("404");
      expect(keys).toContain("private/sit");
      expect(keys.length).toBe(6);
    });
  });

  describe("getReferences (reverse map)", () => {
    it("should find references to ipsum from index and lorem", () => {
      const refs = ws.getReferences("ipsum");
      const sourceKeys = refs.map((r) => r.sourceKey);
      expect(sourceKeys).toContain("index");
      expect(sourceKeys).toContain("lorem");
    });

    it("should find references to lorem from index and ipsum", () => {
      const refs = ws.getReferences("lorem");
      const sourceKeys = refs.map((r) => r.sourceKey);
      expect(sourceKeys).toContain("index");
      expect(sourceKeys).toContain("ipsum");
    });

    it("should include line/col info for references", () => {
      const refs = ws.getReferences("ipsum");
      const fromIndex = refs.find((r) => r.sourceKey === "index");
      expect(fromIndex).toBeDefined();
      expect(typeof fromIndex!.line).toBe("number");
      expect(typeof fromIndex!.col).toBe("number");
    });

    it("should return empty array for unreferenced documents", () => {
      expect(ws.getReferences("nonexistent")).toEqual([]);
    });

    it("should find references to private/sit", () => {
      const refs = ws.getReferences("private/sit");
      const sourceKeys = refs.map((r) => r.sourceKey);
      expect(sourceKeys).toContain("index");
    });

    it("should not include links inside code blocks", () => {
      // code.md has a fenced code block; no links should be extracted
      const outgoing = ws.getOutgoingLinks("code");
      expect(outgoing.length).toBe(0);
    });
  });

  describe("getOutgoingLinks", () => {
    it("should return outgoing links from index", () => {
      const links = ws.getOutgoingLinks("index");
      const targets = links.map((l) => l.targetKey);
      expect(targets).toContain("ipsum");
      expect(targets).toContain("code");
      expect(targets).toContain("404");
      expect(targets).toContain("private/sit");
      expect(targets).toContain("unresolved");
      expect(targets).toContain("lorem");
    });
  });

  describe("refreshFile", () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await Deno.makeTempDir();
      await Deno.writeTextFile(
        join(tempDir, "a.md"),
        "# A\n\nLinks to [[b]].\n",
      );
      await Deno.writeTextFile(
        join(tempDir, "b.md"),
        "# B\n\nLinks to [[a]].\n",
      );
    });

    afterAll(async () => {
      await Deno.remove(tempDir, { recursive: true });
    });

    it("should update reverse map after file content change", async () => {
      const tempWs = createWorkspace();
      await tempWs.buildIndex(tempDir, "simpesys");

      expect(tempWs.getReferences("b").length).toBe(1);
      expect(tempWs.getReferences("b")[0].sourceKey).toBe("a");

      // Change a.md to link to nothing
      await Deno.writeTextFile(join(tempDir, "a.md"), "# A\n\nNo links.\n");
      await tempWs.refreshFile(join(tempDir, "a.md"));

      expect(tempWs.getReferences("b").length).toBe(0);

      // Restore
      await Deno.writeTextFile(
        join(tempDir, "a.md"),
        "# A\n\nLinks to [[b]].\n",
      );
      await tempWs.refreshFile(join(tempDir, "a.md"));

      expect(tempWs.getReferences("b").length).toBe(1);
    });

    it("should handle file deletion", async () => {
      const tempWs = createWorkspace();
      await tempWs.buildIndex(tempDir, "simpesys");

      expect(tempWs.hasDoc("a")).toBe(true);

      // Simulate deletion
      const aPath = join(tempDir, "a.md");
      const content = await Deno.readTextFile(aPath);
      await Deno.remove(aPath);
      await tempWs.refreshFile(aPath);

      expect(tempWs.hasDoc("a")).toBe(false);
      expect(tempWs.getReferences("b").length).toBe(0);

      // Restore for other tests
      await Deno.writeTextFile(aPath, content);
    });
  });
});
