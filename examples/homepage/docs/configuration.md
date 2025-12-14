# Configuration

This document describes all configuration options available in Simpesys. Simpesys configuration is passed to the constructor as an object with two top-level properties: `config` and `hooks`. All properties are optional and have default values.

```typescript
const simpesys = new Simpesys({
  config: { /* ... */ },
  hooks: { /* ... */ },
});
```

## Config

### `config.web`

Web-related settings.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `domain` | `string` | `"localhost:8000"` | Website domain. Used to identify internal domains. |

### `config.project`

Project structure settings.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | `"./"` | Absolute or relative path to the project root directory. |
| `docs` | `string` | `"docs"` | Relative path to the document directory from the project root. |

### `config.docs`

Document processing settings.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | `"index"` | Root document key. Corresponds to `index.md` by default. |
| `notFound` | `string` | `"404"` | Not found document key. Used when an internal link cannot be resolved. |
| `linkStyle` | `"simpesys"` \| `"obsidian"` | `"simpesys"` | Internal link syntax style. See [[features/internal-links]]. |
| `subdocumentsSectionTitle` | `string[]` | `["Subpages"]` | Level 2 heading that marks the subdocuments section. |
| `publicationsSectionTitle` | `string[]` | `["Publications"]` | Level 3 heading within subdocuments that marks publication-type documents. |
| `backlinksSectionTitle` | `string` | `"Backlinks"` | Level 2 heading for the auto-generated backlinks section. |

### `config.docs.toc`

Table of contents settings.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `listType` | `"ul"` \| `"ol"` | `"ul"` | HTML list type for the table of contents. |
| `levels` | `number[]` | `[2, 3, 4]` | Heading levels to include in the table of contents. |

## Hooks

Hooks are callback functions for customizing the behavior of the build pipeline.

| Hook | Signature | Description |
|------|-----------|-------------|
| `manipulateMarkdown` | `(markdown: string, candidate: DocumentCandidate) => string` | Transforms Markdown content before processing. |
| `onInternalLinkUnresolved` | `(error: Error) => void` | Executes when an internal link cannot be resolved. |
| `renderInternalLink` | `(key: string, label?: string) => string` | Renders an internal link to HTML. |
