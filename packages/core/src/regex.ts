import type { PatternScanner, RegexEngine } from "@shikijs/core";

type Match = ReturnType<PatternScanner["findNextMatchSync"]>;
type SharedScanner = { scanner: PatternScanner; users: number };
type MatchCache = {
  scanners: Map<PatternScanner, Map<string, Map<string, Match>>>;
  bytes: number;
};

/**
 * Reuse Oniguruma scanners and searches across languages and themes.
 */
export function cacheRegexes(engine: RegexEngine) {
  let matchCache: MatchCache | undefined;

  const scanners = new Map<string, SharedScanner>();
  const maxMatchBytes = 2 * 1024 * 1024;

  function findMatch(
    scanner: PatternScanner,
    ...args: Parameters<PatternScanner["findNextMatchSync"]>
  ): Match {
    const [string, position, options] = args;
    const content = typeof string === "string" ? string : string.content;

    const cache = matchCache;
    if (!cache || content.length * 2 > maxMatchBytes) {
      return scanner.findNextMatchSync(...args);
    }

    let lines = cache.scanners.get(scanner);
    if (!lines) {
      lines = new Map();
      cache.scanners.set(scanner, lines);
    }

    let matches = lines.get(content);
    if (!matches) {
      matches = new Map();
      lines.set(content, matches);
      cache.bytes += content.length * 2 + 128;
    }

    const key = `${position}:${options}`;
    const cached = matches.get(key);
    if (cached !== undefined) {
      return copyMatch(cached);
    }

    const match = scanner.findNextMatchSync(...args);
    matches.set(key, copyMatch(match));

    cache.bytes += 128 + (match?.captureIndices.length ?? 0) * 64;
    if (cache.bytes > maxMatchBytes) {
      matchCache = undefined;
    }

    return match;
  }

  function createScanner(
    patterns: Parameters<RegexEngine["createScanner"]>[0],
  ): PatternScanner {
    const key = JSON.stringify(
      patterns.map((pattern) =>
        typeof pattern === "string" ? pattern : pattern.source
      ),
    );

    let entry = scanners.get(key);
    if (!entry) {
      entry = { scanner: engine.createScanner(patterns), users: 0 };
      scanners.set(key, entry);
    }

    const shared = entry;
    shared.users += 1;

    let disposed = false;

    return {
      findNextMatchSync: (...args) => findMatch(shared.scanner, ...args),
      dispose() {
        if (disposed) {
          return;
        }

        disposed = true;

        if (--shared.users === 0) {
          scanners.delete(key);
          matchCache?.scanners.delete(shared.scanner);
          shared.scanner.dispose?.();
        }
      },
    };
  }

  function withCachedMatches<T>(render: () => T): T {
    const previous = matchCache;
    matchCache = { scanners: new Map(), bytes: 0 };
    try {
      return render();
    } finally {
      matchCache = previous;
    }
  }

  return {
    createString: engine.createString,
    createScanner,
    withCachedMatches,
  };
}

function copyMatch(match: Match): Match {
  return match && {
    index: match.index,
    captureIndices: match.captureIndices.map((capture) => ({ ...capture })),
  };
}
