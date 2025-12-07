import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getLink } from "../../src/link.ts";

describe("getLink", () => {
  describe("with simpesys link style", () => {
    it("should create unlabeled link", () => {
      const result = getLink("doc1", null, "simpesys");
      expect(result).toBe("[[doc1]]");
    });

    it("should create labeled link", () => {
      const result = getLink("doc1", "Document 1", "simpesys");
      expect(result).toBe("[[doc1]]{Document 1}");
    });

    it("should handle path-like keys", () => {
      const result = getLink("dir/doc1", "Doc 1", "simpesys");
      expect(result).toBe("[[dir/doc1]]{Doc 1}");
    });

    it("should handle labels with spaces", () => {
      const result = getLink("doc1", "My Document Title", "simpesys");
      expect(result).toBe("[[doc1]]{My Document Title}");
    });
  });

  describe("with obsidian link style", () => {
    it("should create unlabeled link", () => {
      const result = getLink("doc1", null, "obsidian");
      expect(result).toBe("[[doc1]]");
    });

    it("should create labeled link", () => {
      const result = getLink("doc1", "Document 1", "obsidian");
      expect(result).toBe("[[doc1|Document 1]]");
    });

    it("should handle path-like keys", () => {
      const result = getLink("dir/doc1", "Doc 1", "obsidian");
      expect(result).toBe("[[dir/doc1|Doc 1]]");
    });

    it("should handle labels with spaces", () => {
      const result = getLink("doc1", "My Document Title", "obsidian");
      expect(result).toBe("[[doc1|My Document Title]]");
    });
  });
});
