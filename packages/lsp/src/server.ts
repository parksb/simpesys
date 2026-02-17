import {
  CompletionItemKind,
  type Connection,
  DiagnosticSeverity,
  DidChangeWatchedFilesNotification,
  type InitializeParams,
  type InitializeResult,
  SemanticTokensBuilder,
  TextDocuments,
  TextDocumentSyncKind,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { join } from "@std/path/posix";
import {
  DEFAULT_CONFIG,
  findSubdocs,
  getLinkRegex,
  type LinkStyle,
  resolveLink,
} from "@simpesys/core";
import { createWorkspace, type Workspace } from "./workspace.ts";

const TOKEN_TYPES = ["keyword", "string", "parameter"];
const TOKEN_LEGEND = {
  tokenTypes: TOKEN_TYPES,
  tokenModifiers: [],
};

export function createServer(connection: Connection) {
  const documents = new TextDocuments(TextDocument);
  const workspace: Workspace = createWorkspace();
  let rootDir = "";
  let docsDir = "";
  let linkStyle: LinkStyle = "simpesys";
  let docsRoot = DEFAULT_CONFIG.docs.root;

  connection.onInitialize(
    async (params: InitializeParams): Promise<InitializeResult> => {
      rootDir = params.rootUri
        ? new URL(params.rootUri).pathname
        : params.rootPath ?? Deno.cwd();

      // Resolve config from .simpesys.json if present
      const opts = (params.initializationOptions ?? {}) as Record<
        string,
        unknown
      >;
      let projectDocs = DEFAULT_CONFIG.project.docs;
      let configLinkStyle: LinkStyle = DEFAULT_CONFIG.docs.linkStyle;

      try {
        const configPath = join(rootDir, ".simpesys.json");
        const configText = await Deno.readTextFile(configPath);
        const fileConfig = JSON.parse(configText);
        if (fileConfig.project?.docs) projectDocs = fileConfig.project.docs;
        if (fileConfig.docs?.linkStyle) {
          configLinkStyle = fileConfig.docs.linkStyle;
        }
        if (fileConfig.docs?.root) docsRoot = fileConfig.docs.root;
      } catch {
        // No config file, use defaults
      }

      if (typeof opts.docsDir === "string") projectDocs = opts.docsDir;
      if (typeof opts.linkStyle === "string") {
        configLinkStyle = opts.linkStyle as LinkStyle;
      }
      if (typeof opts.docsRoot === "string") docsRoot = opts.docsRoot;

      linkStyle = configLinkStyle;
      docsDir = join(rootDir, projectDocs);

      await workspace.buildIndex(docsDir, linkStyle);

      return {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Full,
          definitionProvider: true,
          referencesProvider: true,
          completionProvider: { triggerCharacters: ["["] },
          hoverProvider: true,
          semanticTokensProvider: {
            legend: TOKEN_LEGEND,
            full: true,
          },
        },
      };
    },
  );

  connection.onInitialized(() => {
    connection.client.register(
      DidChangeWatchedFilesNotification.type,
      { watchers: [{ globPattern: "**/*.md" }] },
    );
  });

  function* scanLinksInText(
    text: string,
  ): Generator<{ match: RegExpExecArray; line: number; lineText: string }> {
    const regex = getLinkRegex(linkStyle);
    const lines = text.split("\n");
    let inFencedBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trimStart().startsWith("```")) {
        inFencedBlock = !inFencedBlock;
        continue;
      }
      if (inFencedBlock) continue;

      const cleaned = line.replace(/`[^`]+`/g, (m) => " ".repeat(m.length));
      const pattern = new RegExp(regex.all.source, "g");
      let match;
      while ((match = pattern.exec(cleaned)) !== null) {
        yield { match, line: i, lineText: line };
      }
    }
  }

  function publishDiagnostics(doc: TextDocument) {
    const uri = doc.uri;
    const filepath = new URL(uri).pathname;
    if (!filepath.startsWith(docsDir)) return;

    const key = filePathToKey(filepath);
    const text = doc.getText();
    const diagnostics = computeDiagnostics(text, key);

    connection.sendDiagnostics({ uri, diagnostics });
  }

  function computeDiagnostics(
    text: string,
    sourceKey: string,
  ) {
    const diagnostics: Array<{
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      severity: DiagnosticSeverity;
      message: string;
      source: string;
    }> = [];

    for (const { match, line } of scanLinksInText(text)) {
      const resolved = resolveLink(match[0], linkStyle, sourceKey);
      if (!workspace.hasDoc(resolved.key)) {
        diagnostics.push({
          range: {
            start: { line, character: match.index },
            end: { line, character: match.index + match[0].length },
          },
          severity: DiagnosticSeverity.Warning,
          message: `Unresolved link: ${resolved.key}`,
          source: "simpesys",
        });
      }
    }

    return diagnostics;
  }

  connection.onDefinition((params) => {
    const uri = params.textDocument.uri;
    const filepath = new URL(uri).pathname;
    if (!filepath.startsWith(docsDir)) return null;

    const sourceKey = filePathToKey(filepath);
    const doc = documents.get(uri);
    if (!doc) return null;

    const line = doc.getText({
      start: { line: params.position.line, character: 0 },
      end: { line: params.position.line + 1, character: 0 },
    });

    const link = findLinkAtPosition(line, params.position.character, sourceKey);
    if (!link) return null;

    const target = workspace.getDoc(link.targetKey);
    if (!target) return null;

    return {
      uri: "file://" + target.path,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    };
  });

  connection.onReferences((params) => {
    const uri = params.textDocument.uri;
    const filepath = new URL(uri).pathname;
    if (!filepath.startsWith(docsDir)) return [];

    const sourceKey = filePathToKey(filepath);
    const doc = documents.get(uri);
    if (!doc) return [];

    const line = doc.getText({
      start: { line: params.position.line, character: 0 },
      end: { line: params.position.line + 1, character: 0 },
    });

    const link = findLinkAtPosition(line, params.position.character, sourceKey);
    const targetKey = link ? link.targetKey : sourceKey;

    return workspace.getReferences(targetKey).map((occ) => {
      const docEntry = workspace.getDoc(occ.sourceKey);
      return {
        uri: "file://" + (docEntry?.path ?? ""),
        range: {
          start: { line: occ.line, character: occ.col },
          end: { line: occ.line, character: occ.col + occ.matchLength },
        },
      };
    });
  });

  connection.onCompletion((params) => {
    const uri = params.textDocument.uri;
    const doc = documents.get(uri);
    if (!doc) return [];

    const lineText = doc.getText({
      start: { line: params.position.line, character: 0 },
      end: { line: params.position.line, character: params.position.character },
    });

    if (!lineText.includes("[[")) return [];

    const lastBracket = lineText.lastIndexOf("[[");
    const afterBracket = lineText.substring(lastBracket + 2);
    // Ensure no closing bracket yet
    if (afterBracket.includes("]]")) return [];

    return workspace.getAllKeys().map((key, i) => {
      const docEntry = workspace.getDoc(key)!;
      return {
        label: key,
        detail: docEntry.title,
        insertText: key + "]]",
        kind: CompletionItemKind.Reference,
        sortText: String(i).padStart(5, "0"),
      };
    });
  });

  connection.onHover(async (params) => {
    const uri = params.textDocument.uri;
    const filepath = new URL(uri).pathname;
    if (!filepath.startsWith(docsDir)) return null;

    const sourceKey = filePathToKey(filepath);
    const doc = documents.get(uri);
    if (!doc) return null;

    const line = doc.getText({
      start: { line: params.position.line, character: 0 },
      end: { line: params.position.line + 1, character: 0 },
    });

    const link = findLinkAtPosition(line, params.position.character, sourceKey);
    if (!link) return null;

    const target = workspace.getDoc(link.targetKey);
    if (!target) return null;

    try {
      const content = await Deno.readTextFile(target.path);
      const preview = content.split("\n").slice(0, 10).join("\n");
      return {
        contents: { kind: "markdown" as const, value: preview },
        range: {
          start: { line: params.position.line, character: link.col },
          end: {
            line: params.position.line,
            character: link.col + link.matchLength,
          },
        },
      };
    } catch {
      return null;
    }
  });

  connection.languages.semanticTokens.on((params) => {
    const uri = params.textDocument.uri;
    const filepath = new URL(uri).pathname;
    if (!filepath.startsWith(docsDir)) {
      return { data: [] };
    }

    const doc = documents.get(uri);
    if (!doc) return { data: [] };

    const text = doc.getText();
    const builder = new SemanticTokensBuilder();

    for (const { match, line } of scanLinksInText(text)) {
      const fullMatch = match[0];
      const col = match.index;

      if (linkStyle === "simpesys") {
        builder.push(line, col, 2, 0, 0);
        const key = match[1];
        builder.push(line, col + 2, key.length, 1, 0);
        builder.push(line, col + 2 + key.length, 2, 0, 0);
        if (match[2]) {
          builder.push(line, col + 2 + key.length + 2, match[2].length, 2, 0);
        }
      } else {
        builder.push(line, col, 2, 0, 0);
        const key = match[1];
        builder.push(line, col + 2, key.length, 1, 0);
        if (match[2]) {
          builder.push(line, col + 2 + key.length, match[2].length, 2, 0);
        }
        builder.push(line, col + fullMatch.length - 2, 2, 0, 0);
      }
    }

    return builder.build();
  });

  connection.onDidChangeWatchedFiles(async (params) => {
    for (const change of params.changes) {
      const filepath = new URL(change.uri).pathname;
      if (filepath.startsWith(docsDir)) {
        await workspace.refreshFile(filepath);
      }
    }

    // Re-publish diagnostics for all open documents
    for (const doc of documents.all()) {
      publishDiagnostics(doc);
    }
  });

  connection.onRequest("simpesys/backlinks", (params: { uri: string }) => {
    const filepath = new URL(params.uri).pathname;
    if (!filepath.startsWith(docsDir)) return { backlinks: [] };

    const key = filePathToKey(filepath);
    const refs = workspace.getReferences(key);

    return {
      backlinks: refs.map((occ) => ({
        sourceKey: occ.sourceKey,
        sourcePath: workspace.getDoc(occ.sourceKey)?.path ?? "",
        sourceTitle: workspace.getDoc(occ.sourceKey)?.title ?? occ.sourceKey,
        line: occ.line,
        col: occ.col,
        context: occ.lineText,
      })),
    };
  });

  connection.onRequest("simpesys/documentTree", async () => {
    const config = workspace.getConfig();

    async function buildTree(
      key: string,
      visited: Set<string>,
    ): Promise<{ key: string; title: string; children: unknown[] }> {
      if (visited.has(key)) {
        return {
          key,
          title: workspace.getDoc(key)?.title ?? key,
          children: [],
        };
      }
      visited.add(key);

      const doc = workspace.getDoc(key);
      if (!doc) return { key, title: key, children: [] };

      let content: string;
      try {
        content = await Deno.readTextFile(doc.path);
      } catch {
        return { key, title: doc.title, children: [] };
      }

      const subdocs = findSubdocs(config, content, "subject", key);
      const children = [];
      for (const sub of subdocs) {
        children.push(await buildTree(sub.filename, visited));
      }

      return { key, title: doc.title, children };
    }

    return await buildTree(docsRoot, new Set());
  });

  connection.onRequest(
    "simpesys/createDocument",
    async (
      params: { uri: string; position: { line: number; character: number } },
    ) => {
      const filepath = new URL(params.uri).pathname;
      if (!filepath.startsWith(docsDir)) return { created: false };

      const sourceKey = filePathToKey(filepath);
      let content: string;
      try {
        content = await Deno.readTextFile(filepath);
      } catch {
        return { created: false };
      }

      const lines = content.split("\n");
      const line = lines[params.position.line] ?? "";
      const link = findLinkAtPosition(
        line,
        params.position.character,
        sourceKey,
      );
      if (!link) return { created: false };

      if (workspace.hasDoc(link.targetKey)) {
        return { created: false, reason: "Document already exists" };
      }

      const newPath = join(docsDir, link.targetKey + ".md");
      const title = link.targetKey.split("/").pop() ?? link.targetKey;
      const newContent = `# ${
        title.charAt(0).toUpperCase() + title.slice(1)
      }\n`;

      // Ensure parent directory exists
      const dir = join(docsDir, ...link.targetKey.split("/").slice(0, -1));
      if (link.targetKey.includes("/")) {
        await Deno.mkdir(dir, { recursive: true });
      }

      await Deno.writeTextFile(newPath, newContent);
      await workspace.refreshFile(newPath);

      return { created: true, path: newPath, key: link.targetKey };
    },
  );

  function filePathToKey(filepath: string): string {
    const rel = filepath.startsWith(docsDir)
      ? filepath.slice(docsDir.length + 1)
      : filepath;
    return rel.replace(/\.md$/, "");
  }

  function findLinkAtPosition(
    lineText: string,
    character: number,
    sourceKey: string,
  ): { targetKey: string; col: number; matchLength: number } | null {
    const regex = getLinkRegex(linkStyle);
    const cleaned = lineText.replace(/`[^`]+`/g, (m) => " ".repeat(m.length));
    const pattern = new RegExp(regex.all.source, "g");
    let match;

    while ((match = pattern.exec(cleaned)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (character >= start && character < end) {
        const resolved = resolveLink(match[0], linkStyle, sourceKey);
        return {
          targetKey: resolved.key,
          col: start,
          matchLength: match[0].length,
        };
      }
    }

    return null;
  }

  documents.onDidOpen((e) => publishDiagnostics(e.document));
  documents.onDidChangeContent((e) => publishDiagnostics(e.document));
  documents.onDidSave(async (e) => {
    const filepath = new URL(e.document.uri).pathname;
    if (filepath.startsWith(docsDir)) {
      await workspace.refreshFile(filepath);
    }
    publishDiagnostics(e.document);
  });

  documents.listen(connection);
}
