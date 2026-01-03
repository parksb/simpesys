import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Simpesys } from "../../src/main.ts";
import { DEFAULT_CONFIG } from "../../src/context.ts";

describe("Simpesys constructor", () => {
  it("should use default config when no config provided", () => {
    const simpesys = new Simpesys({});
    const config = simpesys.getConfig();
    expect(config.docs.root).toBe(DEFAULT_CONFIG.docs.root);
    expect(config.docs.linkStyle).toBe(DEFAULT_CONFIG.docs.linkStyle);
  });

  it("should merge partial config with defaults", () => {
    const simpesys = new Simpesys({
      docs: {
        linkStyle: "obsidian",
      },
    });
    const config = simpesys.getConfig();
    expect(config.docs.linkStyle).toBe("obsidian");
    expect(config.docs.root).toBe(DEFAULT_CONFIG.docs.root);
  });

  it("should deep merge nested config", () => {
    const simpesys = new Simpesys({
      web: {
        domain: "https://example.com",
      },
      docs: {
        backlinksSectionTitle: "References",
      },
    });
    const config = simpesys.getConfig();
    expect(config.web.domain).toBe("https://example.com");
    expect(config.docs.backlinksSectionTitle).toBe("References");
    expect(config.docs.subdocumentsSectionTitle).toBe(
      DEFAULT_CONFIG.docs.subdocumentsSectionTitle,
    );
  });
});
