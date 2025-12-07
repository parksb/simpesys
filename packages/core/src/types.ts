import type { Config } from "./config.ts";
import type { DocumentCandidate } from "./document.ts";

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface Hooks {
  /**
   * A hook to manipulate the markdown content before processing.
   */
  manipulateMarkdown?: (
    markdown: string,
    candidate: DocumentCandidate,
  ) => string;

  /**
   * A hook that is called when an internal link cannot be resolved.
   */
  onInternalLinkUnresolved?: (error: Error) => void;
}

export type Context = Config & { hooks: Hooks };
