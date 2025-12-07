import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { getLinkRegex } from "../../src/link.ts";
import type { LinkRegexSet } from "../../src/link.ts";

describe("getLinkRegex", () => {
  describe("with simpesys link style", () => {
    let regex: LinkRegexSet;

    beforeEach(() => {
      regex = getLinkRegex("simpesys");
    });

    describe("normal", () => {
      it("should match unlabeled links", () => {
        const text = "Check out [[doc1]] for more info.";
        const matches = text.match(regex.normal);
        expect(matches).toEqual(["[[doc1]]"]);
      });

      it("should match multiple links", () => {
        const text = "See [[doc1]] and [[doc2]] for details.";
        const matches = text.match(regex.normal);
        expect(matches).toEqual(["[[doc1]]", "[[doc2]]"]);
      });

      it("should not match labeled links (simpesys)", () => {
        const text = "Check out [[doc1]]{Label} for more info.";
        const matches = text.match(regex.normal);
        expect(matches).toBeNull();
      });
    });

    describe("labeled", () => {
      it("should match labeled links (simpesys)", () => {
        const text = "Check out [[doc1]]{Label} for more info.";
        const matches = text.match(regex.labeled);
        expect(matches).toEqual(["[[doc1]]{Label}"]);
      });

      it("should capture key as $1 and label as $2 without braces (simpesys)", () => {
        const text = "[[doc1]]{Label}";
        const match = regex.labeled.exec(text);
        expect(match).not.toBeNull();
        expect(match![1]).toBe("doc1");
        expect(match![2]).toBe("Label");
      });

      it("should not match unlabeled links (simpesys)", () => {
        const text = "Check out [[doc1]] for more info.";
        const matches = text.match(regex.labeled);
        expect(matches).toBeNull();
      });
    });

    describe("all", () => {
      it("should match both labeled and unlabeled links", () => {
        const text = "See [[doc1]] and [[doc2]]{Doc 2} for details.";
        const matches = text.match(regex.all);
        expect(matches).toEqual(["[[doc1]]", "[[doc2]]{Doc 2}"]);
      });
    });

    describe("forKey", () => {
      it("should match specific key without label", () => {
        const text = "See [[target]] and [[other]] for details.";
        const pattern = regex.forKey("target");
        const matches = text.match(pattern);
        expect(matches).toEqual(["[[target]]"]);
      });

      it("should match specific key with label", () => {
        const text = "See [[target]]{Label} and [[other]] for details.";
        const pattern = regex.forKey("target");
        const matches = text.match(pattern);
        expect(matches).toEqual(["[[target]]{Label}"]);
      });
    });

    describe("forKeyLabeled", () => {
      it("should match specific key with label and capture label", () => {
        const text = "See [[target]]{My Label} for details.";
        const pattern = regex.forKeyLabeled("target");
        const match = pattern.exec(text);
        expect(match).not.toBeNull();
        expect(match![1]).toBe("My Label");
      });

      it("should not match unlabeled links", () => {
        const text = "See [[target]] for details.";
        const pattern = regex.forKeyLabeled("target");
        const match = pattern.exec(text);
        expect(match).toBeNull();
      });
    });

    describe("listItem", () => {
      it("should match list item with link using dash", () => {
        const text = "- [[doc1]]";
        const match = text.match(regex.listItem);
        expect(match).not.toBeNull();
        expect(match![2]).toBe("[[doc1]]");
      });

      it("should match list item with link using asterisk", () => {
        const text = "* [[doc1]]";
        const match = text.match(regex.listItem);
        expect(match).not.toBeNull();
        expect(match![2]).toBe("[[doc1]]");
      });

      it("should match list item with labeled link", () => {
        const text = "- [[doc1]]{Label}";
        const match = text.match(regex.listItem);
        expect(match).not.toBeNull();
        expect(match![2]).toBe("[[doc1]]{Label}");
      });
    });
  });

  describe("with obsidian link style", () => {
    let regex: LinkRegexSet;

    beforeEach(() => {
      regex = getLinkRegex("obsidian");
    });

    describe("normal", () => {
      it("should match unlabeled links", () => {
        const text = "Check out [[doc1]] for more info.";
        const matches = text.match(regex.normal);
        expect(matches).toEqual(["[[doc1]]"]);
      });

      it("should match multiple links", () => {
        const text = "See [[doc1]] and [[doc2]] for details.";
        const matches = text.match(regex.normal);
        expect(matches).toEqual(["[[doc1]]", "[[doc2]]"]);
      });

      it("should match labeled links", () => {
        const text = "Check out [[doc1|Label]] for more info.";
        const matches = text.match(regex.normal);
        expect(matches).toEqual(["[[doc1|Label]]"]);
      });
    });

    describe("labeled", () => {
      it("should match labeled links (obsidian)", () => {
        const text = "Check out [[doc1|Label]] for more info.";
        const matches = text.match(regex.labeled);
        expect(matches).toEqual(["[[doc1|Label]]"]);
      });

      it("should capture key as $1 and label as $2 without pipe (obsidian)", () => {
        const text = "[[doc1|Label]]";
        const match = regex.labeled.exec(text);
        expect(match).not.toBeNull();
        expect(match![1]).toBe("doc1");
        expect(match![2]).toBe("Label");
      });

      it("should not match unlabeled links (obsidian)", () => {
        const text = "Check out [[doc1]] for more info.";
        const matches = text.match(regex.labeled);
        expect(matches).toBeNull();
      });
    });

    describe("all", () => {
      it("should match both labeled and unlabeled links", () => {
        const text = "See [[doc1]] and [[doc2|Doc 2]] for details.";
        const matches = text.match(regex.all);
        expect(matches).toEqual(["[[doc1]]", "[[doc2|Doc 2]]"]);
      });
    });

    describe("forKey", () => {
      it("should match specific key without label", () => {
        const text = "See [[target]] and [[other]] for details.";
        const pattern = regex.forKey("target");
        const matches = text.match(pattern);
        expect(matches).toEqual(["[[target]]"]);
      });

      it("should match specific key with label", () => {
        const text = "See [[target|Label]] and [[other]] for details.";
        const pattern = regex.forKey("target");
        const matches = text.match(pattern);
        expect(matches).toEqual(["[[target|Label]]"]);
      });
    });

    describe("forKeyLabeled", () => {
      it("should match specific key with label and capture label", () => {
        const text = "See [[target|My Label]] for details.";
        const pattern = regex.forKeyLabeled("target");
        const match = pattern.exec(text);
        expect(match).not.toBeNull();
        expect(match![1]).toBe("My Label");
      });

      it("should not match unlabeled links", () => {
        const text = "See [[target]] for details.";
        const pattern = regex.forKeyLabeled("target");
        const match = pattern.exec(text);
        expect(match).toBeNull();
      });
    });

    describe("listItem", () => {
      it("should match list item with link using dash", () => {
        const text = "- [[doc1]]";
        const match = text.match(regex.listItem);
        expect(match).not.toBeNull();
        expect(match![2]).toBe("[[doc1]]");
      });

      it("should match list item with link using asterisk", () => {
        const text = "* [[doc1]]";
        const match = text.match(regex.listItem);
        expect(match).not.toBeNull();
        expect(match![2]).toBe("[[doc1]]");
      });

      it("should match list item with labeled link", () => {
        const text = "- [[doc1|Label]]";
        const match = text.match(regex.listItem);
        expect(match).not.toBeNull();
        expect(match![2]).toBe("[[doc1|Label]]");
      });
    });
  });
});
