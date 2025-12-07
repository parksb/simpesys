import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { parseLink } from "../../src/link.ts";

describe("parseLink", () => {
  describe("with simpesys link style", () => {
    it("should parse unlabeled link", () => {
      const result = parseLink("[[doc1]]", "simpesys");
      expect(result).toEqual({ key: "doc1", label: null });
    });

    it("should parse labeled link", () => {
      const result = parseLink("[[doc1]]{Document 1}", "simpesys");
      expect(result).toEqual({ key: "doc1", label: "Document 1" });
    });

    it("should parse path-like keys", () => {
      const result = parseLink("[[dir/doc1]]{Doc 1}", "simpesys");
      expect(result).toEqual({ key: "dir/doc1", label: "Doc 1" });
    });

    it("should parse labels with spaces", () => {
      const result = parseLink("[[doc1]]{My Document Title}", "simpesys");
      expect(result).toEqual({ key: "doc1", label: "My Document Title" });
    });

    it("should parse private path keys", () => {
      const result = parseLink("[[private/secret]]", "simpesys");
      expect(result).toEqual({ key: "private/secret", label: null });
    });

    it("should handle labels with special characters", () => {
      const result = parseLink("[[doc1]]{Title (2024)}", "simpesys");
      expect(result).toEqual({ key: "doc1", label: "Title (2024)" });
    });
  });

  describe("with obsidian link style", () => {
    it("should parse unlabeled link", () => {
      const result = parseLink("[[doc1]]", "obsidian");
      expect(result).toEqual({ key: "doc1", label: null });
    });

    it("should parse labeled link", () => {
      const result = parseLink("[[doc1|Document 1]]", "obsidian");
      expect(result).toEqual({ key: "doc1", label: "Document 1" });
    });

    it("should parse path-like keys", () => {
      const result = parseLink("[[dir/doc1|Doc 1]]", "obsidian");
      expect(result).toEqual({ key: "dir/doc1", label: "Doc 1" });
    });

    it("should parse labels with spaces", () => {
      const result = parseLink("[[doc1|My Document Title]]", "obsidian");
      expect(result).toEqual({ key: "doc1", label: "My Document Title" });
    });

    it("should parse private path keys", () => {
      const result = parseLink("[[private/secret]]", "obsidian");
      expect(result).toEqual({ key: "private/secret", label: null });
    });

    it("should handle labels with special characters", () => {
      const result = parseLink("[[doc1|Title (2024)]]", "obsidian");
      expect(result).toEqual({ key: "doc1", label: "Title (2024)" });
    });
  });
});
