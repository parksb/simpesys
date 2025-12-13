import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { resolveLink } from "../../src/link.ts";

describe("resolveLink", () => {
  describe("with simpesys link style", () => {
    it("should resolve unlabeled link", () => {
      const result = resolveLink("[[doc1]]", "simpesys");
      expect(result).toEqual({ key: "doc1", label: null });
    });

    it("should resolve labeled link", () => {
      const result = resolveLink("[[doc1]]{Document 1}", "simpesys");
      expect(result).toEqual({ key: "doc1", label: "Document 1" });
    });

    it("should resolve path-like keys", () => {
      const result = resolveLink("[[dir/doc1]]{Doc 1}", "simpesys");
      expect(result).toEqual({ key: "dir/doc1", label: "Doc 1" });
    });

    it("should resolve labels with spaces", () => {
      const result = resolveLink("[[doc1]]{My Document Title}", "simpesys");
      expect(result).toEqual({ key: "doc1", label: "My Document Title" });
    });

    it("should resolve private path keys", () => {
      const result = resolveLink("[[private/secret]]", "simpesys");
      expect(result).toEqual({ key: "private/secret", label: null });
    });

    it("should handle labels with special characters", () => {
      const result = resolveLink("[[doc1]]{Title (2024)}", "simpesys");
      expect(result).toEqual({ key: "doc1", label: "Title (2024)" });
    });
  });

  describe("with obsidian link style", () => {
    it("should resolve unlabeled link", () => {
      const result = resolveLink("[[doc1]]", "obsidian");
      expect(result).toEqual({ key: "doc1", label: null });
    });

    it("should resolve labeled link", () => {
      const result = resolveLink("[[doc1|Document 1]]", "obsidian");
      expect(result).toEqual({ key: "doc1", label: "Document 1" });
    });

    it("should resolve path-like keys", () => {
      const result = resolveLink("[[dir/doc1|Doc 1]]", "obsidian");
      expect(result).toEqual({ key: "dir/doc1", label: "Doc 1" });
    });

    it("should resolve labels with spaces", () => {
      const result = resolveLink("[[doc1|My Document Title]]", "obsidian");
      expect(result).toEqual({ key: "doc1", label: "My Document Title" });
    });

    it("should resolve private path keys", () => {
      const result = resolveLink("[[private/secret]]", "obsidian");
      expect(result).toEqual({ key: "private/secret", label: null });
    });

    it("should handle labels with special characters", () => {
      const result = resolveLink("[[doc1|Title (2024)]]", "obsidian");
      expect(result).toEqual({ key: "doc1", label: "Title (2024)" });
    });
  });

  describe("with currentPath", () => {
    it("should return key as-is when no currentPath", () => {
      expect(resolveLink("[[doc]]", "simpesys").key).toBe("doc");
      expect(resolveLink("[[../doc]]", "simpesys").key).toBe("../doc");
      expect(resolveLink("[[./doc]]", "simpesys").key).toBe("./doc");
    });

    it("should resolve key relative to current directory", () => {
      expect(resolveLink("[[doc]]", "simpesys", "features/toc").key).toBe(
        "features/doc",
      );
      expect(resolveLink("[[other/doc]]", "simpesys", "features/toc").key).toBe(
        "features/other/doc",
      );
      expect(resolveLink("[[doc]]", "simpesys", "index").key).toBe("doc");
    });

    it("should resolve relative path with ./", () => {
      expect(resolveLink("[[./sibling]]", "simpesys", "features/toc").key).toBe(
        "features/sibling",
      );
      expect(resolveLink("[[./sub/doc]]", "simpesys", "features/toc").key).toBe(
        "features/sub/doc",
      );
    });

    it("should resolve relative path with ../", () => {
      expect(
        resolveLink("[[../getting-started]]", "simpesys", "features/toc").key,
      ).toBe("getting-started");
      expect(
        resolveLink("[[../other/doc]]", "simpesys", "features/toc").key,
      ).toBe("other/doc");
    });

    it("should resolve multiple ../ segments", () => {
      expect(resolveLink("[[../../doc]]", "simpesys", "a/b/c").key).toBe("doc");
      expect(resolveLink("[[../../../doc]]", "simpesys", "a/b/c/d").key).toBe(
        "doc",
      );
      expect(resolveLink("[[../doc]]", "simpesys", "a/b/c").key).toBe("a/doc");
    });

    it("should handle root-level currentPath", () => {
      expect(resolveLink("[[./doc]]", "simpesys", "index").key).toBe("doc");
      expect(resolveLink("[[../doc]]", "simpesys", "index").key).toBe("doc");
    });

    it("should not go above root", () => {
      expect(resolveLink("[[../../doc]]", "simpesys", "index").key).toBe("doc");
      expect(resolveLink("[[../../../doc]]", "simpesys", "a/b").key).toBe(
        "doc",
      );
    });

    it("should handle mixed ./ and ../ in path", () => {
      expect(resolveLink("[[./../doc]]", "simpesys", "features/toc").key).toBe(
        "doc",
      );
      expect(resolveLink("[[.././doc]]", "simpesys", "features/toc").key).toBe(
        "doc",
      );
    });

    it("should work with obsidian style too", () => {
      expect(
        resolveLink("[[../doc|Label]]", "obsidian", "features/toc"),
      ).toEqual({ key: "doc", label: "Label" });
    });
  });
});
