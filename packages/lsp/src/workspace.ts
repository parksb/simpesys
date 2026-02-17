import { join, relative } from "@std/path/posix";
import {
  type Config,
  DEFAULT_CONFIG,
  getLinkRegex,
  type LinkStyle,
  resolveLink,
} from "@simpesys/core";

export interface DocEntry {
  key: string;
  path: string;
  title: string;
}

export interface LinkOccurrence {
  sourceKey: string;
  targetKey: string;
  line: number;
  col: number;
  matchLength: number;
  lineText: string;
}

interface DocLinks {
  outgoing: LinkOccurrence[];
}

export interface Workspace {
  buildIndex(docsDir: string, linkStyle: LinkStyle): Promise<void>;
  refreshFile(filepath: string): Promise<void>;
  getDoc(key: string): DocEntry | undefined;
  getReferences(targetKey: string): LinkOccurrence[];
  getOutgoingLinks(sourceKey: string): LinkOccurrence[];
  getAllKeys(): string[];
  hasDoc(key: string): boolean;
  getDocsDir(): string;
  getLinkStyle(): LinkStyle;
  getConfig(): Config;
}

export function createWorkspace(): Workspace {
  const docs = new Map<string, DocEntry>();
  const docLinks = new Map<string, DocLinks>();
  const reverseMap = new Map<string, LinkOccurrence[]>();
  let docsDir = "";
  let linkStyle: LinkStyle = "simpesys";

  function filePathToKey(filepath: string): string {
    const rel = relative(docsDir, filepath);
    return rel.replace(/\.md$/, "");
  }

  function extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)/m);
    return match ? match[1].trim() : "";
  }

  function scanLinks(content: string, sourceKey: string): LinkOccurrence[] {
    const regex = getLinkRegex(linkStyle);
    const lines = content.split("\n");
    const occurrences: LinkOccurrence[] = [];
    let inFencedBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trimStart().startsWith("```")) {
        inFencedBlock = !inFencedBlock;
        continue;
      }
      if (inFencedBlock) continue;

      // Remove inline code before scanning
      const cleaned = line.replace(/`[^`]+`/g, (m) => " ".repeat(m.length));

      const pattern = new RegExp(regex.all.source, "g");
      let match;
      while ((match = pattern.exec(cleaned)) !== null) {
        const resolved = resolveLink(match[0], linkStyle, sourceKey);
        occurrences.push({
          sourceKey,
          targetKey: resolved.key,
          line: i,
          col: match.index,
          matchLength: match[0].length,
          lineText: line,
        });
      }
    }

    return occurrences;
  }

  function removeDocFromReverseMap(sourceKey: string) {
    const links = docLinks.get(sourceKey);
    if (!links) return;

    for (const occ of links.outgoing) {
      const refs = reverseMap.get(occ.targetKey);
      if (refs) {
        const filtered = refs.filter((r) => r.sourceKey !== sourceKey);
        if (filtered.length === 0) {
          reverseMap.delete(occ.targetKey);
        } else {
          reverseMap.set(occ.targetKey, filtered);
        }
      }
    }
  }

  function addDocToReverseMap(outgoing: LinkOccurrence[]) {
    for (const occ of outgoing) {
      const refs = reverseMap.get(occ.targetKey);
      if (refs) {
        refs.push(occ);
      } else {
        reverseMap.set(occ.targetKey, [occ]);
      }
    }
  }

  async function indexFile(filepath: string): Promise<void> {
    const key = filePathToKey(filepath);
    let content: string;
    try {
      content = await Deno.readTextFile(filepath);
    } catch {
      return;
    }

    const title = extractTitle(content);
    docs.set(key, { key, path: filepath, title });

    const outgoing = scanLinks(content, key);
    docLinks.set(key, { outgoing });
    addDocToReverseMap(outgoing);
  }

  return {
    async buildIndex(dir: string, style: LinkStyle): Promise<void> {
      docsDir = dir;
      linkStyle = style;
      docs.clear();
      docLinks.clear();
      reverseMap.clear();

      const entries: string[] = [];
      for await (const entry of walkMdFiles(dir)) {
        entries.push(entry);
      }

      await Promise.all(entries.map((filepath) => indexFile(filepath)));
    },

    async refreshFile(filepath: string): Promise<void> {
      const key = filePathToKey(filepath);

      // Remove old data
      removeDocFromReverseMap(key);
      docs.delete(key);
      docLinks.delete(key);

      // Check if file still exists
      try {
        await Deno.stat(filepath);
      } catch {
        return; // File deleted
      }

      await indexFile(filepath);
    },

    getDoc(key: string): DocEntry | undefined {
      return docs.get(key);
    },

    getReferences(targetKey: string): LinkOccurrence[] {
      return reverseMap.get(targetKey) ?? [];
    },

    getOutgoingLinks(sourceKey: string): LinkOccurrence[] {
      return docLinks.get(sourceKey)?.outgoing ?? [];
    },

    getAllKeys(): string[] {
      return Array.from(docs.keys());
    },

    hasDoc(key: string): boolean {
      return docs.has(key);
    },

    getDocsDir(): string {
      return docsDir;
    },

    getLinkStyle(): LinkStyle {
      return linkStyle;
    },

    getConfig(): Config {
      return {
        ...DEFAULT_CONFIG,
        docs: { ...DEFAULT_CONFIG.docs, linkStyle },
        hooks: { renderInternalLink: () => "" },
      };
    },
  };
}

async function* walkMdFiles(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory) {
      yield* walkMdFiles(fullPath);
    } else if (entry.isFile && entry.name.endsWith(".md")) {
      yield fullPath;
    }
  }
}
