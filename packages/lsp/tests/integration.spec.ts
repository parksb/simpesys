import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { join } from "@std/path/posix";

const FIXTURES_DIR = join(
  new URL(".", import.meta.url).pathname,
  "../../../examples/bare",
);
const DOCS_DIR = join(FIXTURES_DIR, "docs");

class LspClient {
  private proc: Deno.ChildProcess;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private buffer: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private nextId = 1;
  private responseQueue: Array<
    { resolve: (v: unknown) => void; reject: (e: Error) => void; id: number }
  > = [];
  private notifications: Array<{ method: string; params: unknown }> = [];
  private readLoopRunning = false;

  constructor(proc: Deno.ChildProcess) {
    this.proc = proc;
    this.writer = proc.stdin.getWriter();
    this.reader = proc.stdout.getReader();
  }

  private concat(
    a: Uint8Array<ArrayBuffer>,
    b: Uint8Array,
  ): Uint8Array<ArrayBuffer> {
    const result = new Uint8Array(a.length + b.length);
    result.set(a);
    result.set(b, a.length);
    return result;
  }

  private async readMessage(): Promise<unknown> {
    const decoder = new TextDecoder();

    while (true) {
      // Try to parse from buffer
      const text = decoder.decode(this.buffer, { stream: true });
      const headerEnd = text.indexOf("\r\n\r\n");

      if (headerEnd !== -1) {
        const header = text.substring(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (match) {
          const contentLength = parseInt(match[1]);
          const headerBytes =
            new TextEncoder().encode(text.substring(0, headerEnd + 4)).length;
          const totalNeeded = headerBytes + contentLength;

          if (this.buffer.length >= totalNeeded) {
            const bodyBytes = this.buffer.slice(headerBytes, totalNeeded);
            this.buffer = this.buffer.slice(totalNeeded);
            const body = new TextDecoder().decode(bodyBytes);
            return JSON.parse(body);
          }
        }
      }

      // Need more data
      const { value, done } = await this.reader.read();
      if (done) throw new Error("Stream closed");
      this.buffer = this.concat(this.buffer, value);
    }
  }

  private async processMessages(): Promise<void> {
    while (true) {
      let msg: Record<string, unknown>;
      try {
        msg = await this.readMessage() as Record<string, unknown>;
      } catch {
        break;
      }

      if ("id" in msg && typeof msg.id === "number") {
        const pending = this.responseQueue.find((p) => p.id === msg.id);
        if (pending) {
          this.responseQueue = this.responseQueue.filter((p) =>
            p.id !== msg.id
          );
          if (msg.error) {
            pending.reject(
              new Error((msg.error as { message: string }).message),
            );
          } else {
            pending.resolve(msg.result);
          }
        }
      } else if ("method" in msg && !("id" in msg)) {
        this.notifications.push({
          method: msg.method as string,
          params: msg.params,
        });
      }
    }
  }

  start() {
    if (!this.readLoopRunning) {
      this.readLoopRunning = true;
      this.processMessages().catch(() => {});
    }
  }

  async request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++;
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    const encoded = new TextEncoder().encode(
      `Content-Length: ${
        new TextEncoder().encode(msg).byteLength
      }\r\n\r\n${msg}`,
    );
    await this.writer.write(encoded);

    return new Promise((resolve, reject) => {
      this.responseQueue.push({ resolve, reject, id });
    });
  }

  async notify(method: string, params: unknown): Promise<void> {
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params });
    const encoded = new TextEncoder().encode(
      `Content-Length: ${
        new TextEncoder().encode(msg).byteLength
      }\r\n\r\n${msg}`,
    );
    await this.writer.write(encoded);
  }

  async waitForNotification(
    method: string,
    timeoutMs = 5000,
  ): Promise<unknown> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const idx = this.notifications.findIndex((n) => n.method === method);
      if (idx !== -1) {
        const found = this.notifications[idx];
        this.notifications.splice(idx, 1);
        return found.params;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`Timeout waiting for ${method}`);
  }

  clearNotifications() {
    this.notifications = [];
  }

  async close() {
    try {
      await this.notify("shutdown", null);
      await this.notify("exit", null);
    } catch {
      // Ignore
    }
    try {
      this.writer.close();
    } catch {
      // Ignore
    }
    try {
      await this.reader.cancel();
    } catch {
      // Ignore
    }
    try {
      await this.proc.stderr.cancel();
    } catch {
      // Ignore
    }
    try {
      this.proc.kill("SIGTERM");
    } catch {
      // Already closed
    }
  }
}

describe(
  "LSP integration",
  { sanitizeResources: false, sanitizeOps: false },
  () => {
    let client: LspClient;

    beforeAll(async () => {
      const serverPath = join(
        new URL(".", import.meta.url).pathname,
        "../src/main.ts",
      );

      const proc = new Deno.Command("deno", {
        args: [
          "run",
          "--allow-env",
          "--allow-read",
          "--allow-write",
          serverPath,
          "--stdio",
        ],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      }).spawn();

      client = new LspClient(proc);
      client.start();

      const result = await client.request("initialize", {
        processId: Deno.pid,
        rootUri: "file://" + FIXTURES_DIR,
        capabilities: {},
        initializationOptions: {},
      }) as Record<string, unknown>;

      const caps = result.capabilities as Record<string, unknown>;
      expect(caps.definitionProvider).toBe(true);
      expect(caps.referencesProvider).toBe(true);
      expect(caps.completionProvider).toBeDefined();
      expect(caps.hoverProvider).toBe(true);
      expect(caps.semanticTokensProvider).toBeDefined();

      await client.notify("initialized", {});
      await new Promise((r) => setTimeout(r, 500));
    });

    afterAll(async () => {
      await client.close();
    });

    describe("textDocument/definition", () => {
      it("should resolve link to target document", async () => {
        const indexUri = "file://" + join(DOCS_DIR, "index.md");
        const indexContent = await Deno.readTextFile(
          join(DOCS_DIR, "index.md"),
        );

        await client.notify("textDocument/didOpen", {
          textDocument: {
            uri: indexUri,
            languageId: "markdown",
            version: 1,
            text: indexContent,
          },
        });
        await new Promise((r) => setTimeout(r, 100));

        // [[ipsum]] is on line 4, character 4 should be inside the link
        const result = await client.request("textDocument/definition", {
          textDocument: { uri: indexUri },
          position: { line: 4, character: 4 },
        });

        expect(result).toBeDefined();
        expect((result as { uri: string }).uri).toContain("ipsum.md");
      });

      it("should return null for position not on a link", async () => {
        const indexUri = "file://" + join(DOCS_DIR, "index.md");

        const result = await client.request("textDocument/definition", {
          textDocument: { uri: indexUri },
          position: { line: 0, character: 0 },
        });

        expect(result).toBeNull();
      });
    });

    describe("textDocument/references", () => {
      it("should find references to current document", async () => {
        const ipsumUri = "file://" + join(DOCS_DIR, "ipsum.md");
        const ipsumContent = await Deno.readTextFile(
          join(DOCS_DIR, "ipsum.md"),
        );

        await client.notify("textDocument/didOpen", {
          textDocument: {
            uri: ipsumUri,
            languageId: "markdown",
            version: 1,
            text: ipsumContent,
          },
        });
        await new Promise((r) => setTimeout(r, 100));

        // Position on the title line — not on a link → references to ipsum itself
        const result = await client.request("textDocument/references", {
          textDocument: { uri: ipsumUri },
          position: { line: 0, character: 0 },
          context: { includeDeclaration: false },
        }) as Array<{ uri: string }>;

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        const uris = result.map((r) => r.uri);
        expect(uris.some((u) => u.includes("index.md"))).toBe(true);
        expect(uris.some((u) => u.includes("lorem.md"))).toBe(true);
      });
    });

    describe("textDocument/completion", () => {
      it("should provide document keys after [[", async () => {
        const indexUri = "file://" + join(DOCS_DIR, "index.md");

        // Open with text that has [[ at end of a line
        await client.notify("textDocument/didOpen", {
          textDocument: {
            uri: indexUri,
            languageId: "markdown",
            version: 10,
            text: "# Test\n\n[[\n",
          },
        });
        await new Promise((r) => setTimeout(r, 100));

        const result = await client.request("textDocument/completion", {
          textDocument: { uri: indexUri },
          position: { line: 2, character: 2 },
        }) as Array<{ label: string }>;

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        const labels = result.map((r) => r.label);
        expect(labels).toContain("ipsum");
        expect(labels).toContain("lorem");
        expect(labels).toContain("code");
      });
    });

    describe("textDocument/hover", () => {
      it("should show preview of linked document", async () => {
        const ipsumUri = "file://" + join(DOCS_DIR, "ipsum.md");
        const ipsumContent = await Deno.readTextFile(
          join(DOCS_DIR, "ipsum.md"),
        );

        await client.notify("textDocument/didOpen", {
          textDocument: {
            uri: ipsumUri,
            languageId: "markdown",
            version: 1,
            text: ipsumContent,
          },
        });
        await new Promise((r) => setTimeout(r, 100));

        // [[lorem]] is at the start of line 2
        const result = await client.request("textDocument/hover", {
          textDocument: { uri: ipsumUri },
          position: { line: 2, character: 2 },
        }) as { contents: { kind: string; value: string } } | null;

        expect(result).toBeDefined();
        expect(result!.contents.kind).toBe("markdown");
        expect(result!.contents.value).toContain("# Lorem");
      });
    });

    describe("diagnostics", () => {
      it("should report broken links", async () => {
        client.clearNotifications();

        const indexUri = "file://" + join(DOCS_DIR, "index.md");
        const indexContent = await Deno.readTextFile(
          join(DOCS_DIR, "index.md"),
        );

        await client.notify("textDocument/didOpen", {
          textDocument: {
            uri: indexUri,
            languageId: "markdown",
            version: 20,
            text: indexContent,
          },
        });

        const params = await client.waitForNotification(
          "textDocument/publishDiagnostics",
        ) as {
          uri: string;
          diagnostics: Array<{ message: string }>;
        };

        expect(params.uri).toBe(indexUri);
        expect(params.diagnostics.length).toBeGreaterThan(0);

        const messages = params.diagnostics.map((d) => d.message);
        expect(messages.some((m) => m.includes("unresolved"))).toBe(true);
      });
    });

    describe("simpesys/backlinks", () => {
      it("should return backlinks for a document", async () => {
        const ipsumUri = "file://" + join(DOCS_DIR, "ipsum.md");

        const result = await client.request("simpesys/backlinks", {
          uri: ipsumUri,
        }) as { backlinks: Array<{ sourceKey: string }> };

        expect(result.backlinks).toBeDefined();
        expect(result.backlinks.length).toBeGreaterThan(0);

        const sourceKeys = result.backlinks.map((b) => b.sourceKey);
        expect(sourceKeys).toContain("index");
        expect(sourceKeys).toContain("lorem");
      });
    });

    describe("simpesys/documentTree", () => {
      it("should return document tree from root", async () => {
        // Need at least one open document for buf_request to work
        const indexUri = "file://" + join(DOCS_DIR, "index.md");
        const indexContent = await Deno.readTextFile(
          join(DOCS_DIR, "index.md"),
        );
        await client.notify("textDocument/didOpen", {
          textDocument: {
            uri: indexUri,
            languageId: "markdown",
            version: 1,
            text: indexContent,
          },
        });
        await new Promise((r) => setTimeout(r, 100));

        const result = await client.request("simpesys/documentTree", {}) as {
          key: string;
          title: string;
          children: Array<{ key: string }>;
        };

        expect(result.key).toBe("index");
        expect(result.title).toBe("Index");
        expect(result.children.length).toBeGreaterThan(0);

        const childKeys = result.children.map((c) => c.key);
        expect(childKeys).toContain("ipsum");
        expect(childKeys).toContain("lorem");
      });
    });
  },
);
