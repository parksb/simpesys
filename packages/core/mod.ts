export { Simpesys } from "./src/main.ts";
export type {
  Breadcrumb,
  Document,
  DocumentCandidate,
  DocumentDict,
  Reference,
} from "./src/document.ts";
export { type Config, DEFAULT_CONFIG, defineConfig, type Hooks } from "./src/config.ts";
export { getLinkRegex, type LinkStyle, resolveLink } from "./src/link.ts";
export { findSubdocs } from "./src/markdown.ts";
