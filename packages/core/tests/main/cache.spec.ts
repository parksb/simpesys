import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { spy } from "@std/testing/mock";
import MarkdownIt from "markdown-it";
import { type Cache, Simpesys } from "../../mod.ts";
import type { Config, DeepPartial } from "../../src/config.ts";

const files = {
  index: "# Home\n\n## Subpages\n\n- [[a]]\n- [[b]]\n- [[404]]",
  a: "# A\n\nFirst paragraph.\n\nAn excerpt about [[b]].",
  b: "# B\n\n## Section\n\n```typescript\nconst value = 123;\n```",
  "404": "# Not found",
};

function createSystem(root: string, config: DeepPartial<Config> = {}) {
  return new Simpesys({ ...config, project: { root, docs: root } });
}

function snapshotDocuments(system: Simpesys) {
  return Object.values(system.getDocuments()).map((document) => ({
    filename: document.filename,
    markdown: document.markdown,
    html: document.html,
    title: document.title,
    type: document.type,
    breadcrumbs: document.breadcrumbs,
    referred: document.referred.map(({ document, sentences }) => ({
      filename: document.filename,
      sentences,
    })),
  }));
}

function copyCache(system: Simpesys): Cache {
  return JSON.parse(JSON.stringify(system.getCache()));
}

async function assertIncremental(
  root: string,
  cache: Cache,
  options: {
    renderedTitles: string[];
    config?: DeepPartial<Config>;
    version?: string;
  },
) {
  const { renderedTitles, config = {}, version } = options;
  const render = spy(MarkdownIt.prototype, "render");
  let incremental: Simpesys;

  try {
    incremental = await createSystem(root, config).init({
      cache: { version, previous: cache },
    });

    const actualTitles = render.calls.map(({ args }) => {
      const markdown = args[0] as string;
      return markdown.split("\n")[0];
    });

    expect(actualTitles.toSorted()).toEqual(renderedTitles.toSorted());
  } finally {
    render.restore();
  }

  const full = await createSystem(root, config).init({ cache: false });
  expect(snapshotDocuments(incremental)).toEqual(snapshotDocuments(full));

  return incremental;
}

describe("incremental rendering", () => {
  let root: string;

  beforeEach(async () => {
    root = await Deno.makeTempDir();

    for (const [filename, markdown] of Object.entries(files)) {
      await Deno.writeTextFile(`${root}/${filename}.md`, markdown);
    }
  });

  afterEach(async () => {
    await Deno.remove(root, { recursive: true });
  });

  it("creates a cache when enabled with true or an options object", async () => {
    const explicitlyEnabled = await createSystem(root).init({ cache: true });
    const emptyOptions = await createSystem(root).init({ cache: {} });

    expect(explicitlyEnabled.getCache()).toBeDefined();
    expect(emptyOptions.getCache()).toEqual(explicitlyEnabled.getCache());

    await assertIncremental(root, copyCache(explicitlyEnabled), {
      renderedTitles: [],
    });
  });

  it("does not create a cache by default or when explicitly disabled", async () => {
    const defaultSystem = await createSystem(root).init();
    const disabledSystem = await createSystem(root).init({ cache: false });

    expect(defaultSystem.getCache()).toBeUndefined();
    expect(disabledSystem.getCache()).toBeUndefined();
    expect(snapshotDocuments(defaultSystem)).toEqual(
      snapshotDocuments(disabledSystem),
    );
  });

  it("rejects custom link cache reuse without a version before reading documents", async () => {
    const config = {
      hooks: {
        renderInternalLink: (key: string, label?: string) =>
          `<a class="custom" href="/${key}">${label ?? key}</a>`,
      },
    };
    const first = await createSystem(root, config).init({ cache: true });
    const previous = copyCache(first);
    const read = spy(Deno, "readTextFile");

    try {
      await expect(
        createSystem(root, config).init({
          cache: { previous },
        }),
      ).rejects.toThrow(
        "Reusing a cache with custom rendering hooks requires `cache.version`.",
      );

      expect(read.calls).toHaveLength(0);
    } finally {
      read.restore();
    }
  });

  it("rejects converter hook cache reuse without a version", async () => {
    const configure = spy((_md: MarkdownIt) => {});
    const config = { hooks: { configureMarkdownConverter: configure } };
    const first = await createSystem(root, config).init({ cache: true });

    await expect(
      createSystem(root, config).init({
        cache: { previous: copyCache(first) },
      }),
    ).rejects.toThrow("cache.version");

    expect(configure.calls).toHaveLength(1);
  });

  it("allows custom hooks without a version when caching is disabled", async () => {
    const configure = spy((_md: MarkdownIt) => {});
    const config = { hooks: { configureMarkdownConverter: configure } };

    const system = await createSystem(root, config).init({ cache: false });

    expect(system.getCache()).toBeUndefined();
    expect(configure.calls).toHaveLength(1);
  });

  it("does not reuse custom hook output after the hook is removed", async () => {
    const first = await createSystem(root, {
      hooks: {
        renderInternalLink: (key: string) => `<span>${key}</span>`,
      },
    }).init({ cache: true });

    await assertIncremental(root, copyCache(first), {
      renderedTitles: ["# Home", "# A", "# B", "# Not found"],
    });
  });

  it("detects Markdown manipulation changes without a caller version", async () => {
    let paragraph = "First paragraph.";
    const config = {
      hooks: {
        manipulateMarkdown: (markdown: string) =>
          markdown.replace("First paragraph.", paragraph),
      },
    };
    const first = await createSystem(root, config).init({ cache: true });

    paragraph = "Changed by a hook.";

    await assertIncremental(root, copyCache(first), {
      renderedTitles: ["# A"],
      config,
    });
  });

  it("reuses serialized cache without initializing the converter", async () => {
    const configure = spy((_md: MarkdownIt) => {});
    const config = { hooks: { configureMarkdownConverter: configure } };
    const first = await createSystem(root, config).init({
      cache: { version: "test-v1" },
    });

    const cache = copyCache(first);
    const originalCache = JSON.stringify(cache);

    expect(configure.calls).toHaveLength(1);

    const second = await createSystem(root, config).init({
      cache: { version: "test-v1", previous: cache },
    });

    const backlink = second.getDocument("b")?.referred.find(
      (reference) => reference.document.filename === "a",
    );

    expect(configure.calls).toHaveLength(1);
    expect(snapshotDocuments(second)).toEqual(snapshotDocuments(first));
    expect(JSON.stringify(cache)).toBe(originalCache);
    expect(backlink?.document).toBe(second.getDocument("a"));

    await assertIncremental(root, cache, {
      renderedTitles: [],
      config,
      version: "test-v1",
    });
  });

  it("renders only the changed body if backlink excerpts are unchanged", async () => {
    const first = await createSystem(root).init({ cache: true });

    const markdown = files.a.replace("First paragraph.", "Edited paragraph.");
    await Deno.writeTextFile(`${root}/a.md`, markdown);

    await assertIncremental(root, copyCache(first), {
      renderedTitles: ["# A"],
    });
  });

  it("renders the cited document when an excerpt changes", async () => {
    const first = await createSystem(root).init({ cache: true });

    const markdown = files.a.replace("An excerpt", "A revised excerpt");
    await Deno.writeTextFile(`${root}/a.md`, markdown);

    await assertIncremental(root, copyCache(first), {
      renderedTitles: ["# A", "# B"],
    });
  });

  it("loads a new code language for a changed document", async () => {
    const first = await createSystem(root).init({ cache: true });

    const codeBlock = [
      "```rust",
      'fn main() { println!("changed"); }',
      "```",
    ].join("\n");

    await Deno.writeTextFile(`${root}/a.md`, `${files.a}\n\n${codeBlock}`);

    const second = await assertIncremental(root, copyCache(first), {
      renderedTitles: ["# A"],
    });

    const html = second.getDocument("a")?.html;

    expect(html).toContain("language-rust");
    expect(html).toContain("shiki-themes");
  });

  it("updates link labels and backlinks after a title change", async () => {
    const first = await createSystem(root).init({ cache: true });

    const markdown = files.b.replace("# B", "# Renamed");
    await Deno.writeTextFile(`${root}/b.md`, markdown);

    await assertIncremental(root, copyCache(first), {
      renderedTitles: ["# Home", "# A", "# Renamed"],
    });
  });

  it("removes obsolete backlink excerpts", async () => {
    const first = await createSystem(root).init({ cache: true });

    await Deno.writeTextFile(`${root}/a.md`, "# A\n\nNo links now.");

    const second = await assertIncremental(root, copyCache(first), {
      renderedTitles: ["# A", "# B"],
    });

    const referrers = second.getDocument("b")?.referred.map(
      (reference) => reference.document.filename,
    );

    expect(referrers).not.toContain("a");
  });

  it("updates unresolved links when a deleted document returns", async () => {
    const first = await createSystem(root).init({ cache: true });

    await Deno.remove(`${root}/b.md`);

    const afterDeletion = await assertIncremental(
      root,
      copyCache(first),
      {
        renderedTitles: ["# Home", "# A", "# Not found"],
      },
    );

    expect(afterDeletion.getCache()?.documents.b).toBeUndefined();

    await Deno.writeTextFile(`${root}/b.md`, files.b);

    await assertIncremental(root, copyCache(afterDeletion), {
      renderedTitles: ["# Home", "# A", "# B", "# Not found"],
    });
  });

  it("rebuilds breadcrumbs even when a child's HTML is reused", async () => {
    const config = { docs: { backlinksSectionTitle: null } };
    const first = await createSystem(root, config).init({ cache: true });

    const markdown = files.index.replace("# Home", "# New home");
    await Deno.writeTextFile(`${root}/index.md`, markdown);

    const second = await assertIncremental(root, copyCache(first), {
      renderedTitles: ["# New home"],
      config,
    });

    const breadcrumbs = second.getDocument("a")?.breadcrumbs;

    expect(breadcrumbs?.[0].title).toBe("New home");
  });

  it("invalidates the cache when settings or the caller version change", async () => {
    const first = await createSystem(root).init({ cache: true });

    const cache = copyCache(first);
    const renderedTitles = ["# Home", "# A", "# B", "# Not found"];
    const configurations: DeepPartial<Config>[] = [
      { web: { domain: "https://changed.example" } },
      { docs: { toc: { listType: "ol" } } },
      { docs: { toc: { marker: { pattern: /^\[\[toc\]\]/m } } } },
      { docs: { code: { themes: { dark: "github-light" } } } },
    ];

    for (const config of configurations) {
      await assertIncremental(root, cache, { renderedTitles, config });
    }

    await assertIncremental(root, cache, {
      renderedTitles,
      version: "test-v2",
    });
  });

  it("renders again when a hook and its cache version change", async () => {
    const first = await createSystem(root).init({ cache: true });

    const config = {
      hooks: {
        renderInternalLink: (key: string, label?: string) =>
          `<a data-changed href="/${key}">${label ?? key}</a>`,
      },
    };

    await assertIncremental(root, copyCache(first), {
      renderedTitles: ["# Home", "# A", "# B", "# Not found"],
      config,
      version: "test-v2",
    });
  });

  it("renders again for incompatible or incomplete cache data", async () => {
    const first = await createSystem(root).init({ cache: true });

    const cache = copyCache(first);
    const incompatibleCache = {
      ...cache,
      version: 0,
    } as unknown as Cache;

    await assertIncremental(root, incompatibleCache, {
      renderedTitles: ["# Home", "# A", "# B", "# Not found"],
    });

    delete cache.documents.b;
    await assertIncremental(root, cache, { renderedTitles: ["# B"] });

    cache.documents.a.html = undefined as unknown as string;
    await assertIncremental(root, cache, { renderedTitles: ["# A", "# B"] });
  });
});
