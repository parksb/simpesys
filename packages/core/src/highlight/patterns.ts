import type {
  PatternScanner,
  RegexEngine,
  RegexEngineString,
} from "@shikijs/core";

type Match = ReturnType<PatternScanner["findNextMatchSync"]>;

type SharedPattern = {
  source: string;
  scanner: PatternScanner;
  anchorsToSearchStart: boolean;
  users: number;
};

type CachedSearch = {
  position: number;
  options: number;
  match: Match;
  bytes: number;
};

type LineCache = {
  searches: Map<SharedPattern, CachedSearch>;
  bytes: number;
};

type SearchPattern = (
  pattern: SharedPattern,
  string: RegexEngineString,
  position: number,
  options: number,
) => Match;

/**
 * Share compiled patterns between overlapping Oniguruma scanners.
 */
export function sharePatterns(engine: RegexEngine): RegexEngine {
  const pool = createPatternPool(engine);
  const cache = createSearchCache(2 * 1024 * 1024);

  function createString(content: string): RegexEngineString {
    const string = engine.createString(content);
    const dispose = string.dispose?.bind(string);

    string.dispose = () => {
      cache.delete(string);
      dispose?.();
    };

    return string;
  }

  function createScanner(
    input: Parameters<RegexEngine["createScanner"]>[0],
  ): PatternScanner {
    const sources = input.map((pattern) =>
      typeof pattern === "string" ? pattern : pattern.source
    );

    if (sources.length < 2 || sources.some(requiresNativeScanner)) {
      return engine.createScanner(input);
    }

    const patterns = pool.acquire(sources);
    let disposed = false;

    return {
      findNextMatchSync(input, position, options) {
        const ownsString = typeof input === "string";
        const string = ownsString ? createString(input) : input;

        try {
          return findEarliestMatch(
            patterns,
            cache.search,
            string,
            position,
            options,
          );
        } finally {
          if (ownsString) {
            string.dispose?.();
          }
        }
      },
      dispose() {
        if (disposed) {
          return;
        }

        disposed = true;
        pool.release(patterns);
      },
    };
  }

  return { createScanner, createString };
}

function createPatternPool(engine: RegexEngine) {
  const patterns = new Map<string, SharedPattern>();

  function acquire(sources: string[]): SharedPattern[] {
    const acquired: SharedPattern[] = [];

    try {
      for (const source of sources) {
        let pattern = patterns.get(source);

        if (!pattern) {
          pattern = {
            source,
            scanner: engine.createScanner([source]),
            anchorsToSearchStart: source.includes("\\G"),
            users: 0,
          };

          patterns.set(source, pattern);
        }

        pattern.users += 1;
        acquired.push(pattern);
      }

      return acquired;
    } catch (error) {
      release(acquired);
      throw error;
    }
  }

  function release(acquired: SharedPattern[]): void {
    for (const pattern of acquired) {
      pattern.users -= 1;

      if (pattern.users === 0) {
        patterns.delete(pattern.source);
        pattern.scanner.dispose?.();
      }
    }
  }

  return { acquire, release };
}

function createSearchCache(maxBytes: number) {
  const lines = new WeakMap<RegexEngineString, LineCache>();

  function search(
    pattern: SharedPattern,
    string: RegexEngineString,
    position: number,
    options: number,
  ): Match {
    let line = lines.get(string);
    if (!line) {
      line = { searches: new Map(), bytes: 0 };
      lines.set(string, line);
    }

    const previous = line.searches.get(pattern);
    if (previous && canReuseSearch(previous, pattern, position, options)) {
      return previous.match;
    }

    const match = pattern.scanner.findNextMatchSync(string, position, options);
    const bytes = 128 + (match?.captureIndices.length ?? 0) * 64;
    const total = line.bytes - (previous?.bytes ?? 0) + bytes;

    if (total <= maxBytes) {
      line.searches.set(pattern, { position, options, match, bytes });
      line.bytes = total;
    }

    return match;
  }

  return {
    search,
    delete: (string: RegexEngineString) => lines.delete(string),
  };
}

function canReuseSearch(
  previous: CachedSearch,
  pattern: SharedPattern,
  position: number,
  options: number,
): boolean {
  if (previous.options !== options || position < previous.position) {
    return false;
  }

  if (position === previous.position) {
    return true;
  }

  if (pattern.anchorsToSearchStart) {
    return false;
  }

  return previous.match === null || previous.match.captureIndices[0].start >= position;
}

function findEarliestMatch(
  patterns: SharedPattern[],
  search: SearchPattern,
  string: RegexEngineString,
  position: number,
  options: number,
): Match {
  let earliest: Match = null;
  let patternIndex = 0;

  for (let index = 0; index < patterns.length; index += 1) {
    const match = search(patterns[index], string, position, options);
    if (!match) {
      continue;
    }

    if (
      earliest &&
      match.captureIndices[0].start >= earliest.captureIndices[0].start
    ) {
      continue;
    }

    earliest = match;
    patternIndex = index;
    if (match.captureIndices[0].start === position) {
      break;
    }
  }

  if (!earliest) {
    return null;
  }

  return {
    index: patternIndex,
    captureIndices: earliest.captureIndices.map((capture) => ({ ...capture })),
  };
}

function requiresNativeScanner(source: string): boolean {
  if (source.includes("\\K")) {
    return true;
  }

  let groups = 0;
  for (const char of source) {
    if (char === "(" && ++groups >= 1000) {
      return true;
    }
  }

  return false;
}
