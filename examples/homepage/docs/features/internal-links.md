# Internal Links

This document describes Simpesys's link syntax, path resolution rules, and rendering behavior. Internal links are a core element for connecting documents within a digital garden.

## Link Styles

Simpesys supports link syntax styles through the `config.docs.linkStyle` option.

### Simpesys Style

| Syntax | Description |
|--------|-------------|
| `[[key]]` | Link without label |
| `[[key]]{label}` | Link with label |

Examples:

```markdown
For more details, see [[getting-started]].
Check the [[api]]{API Reference} for detailed information.
```

### Obsidian Style

| Syntax | Description |
|--------|-------------|
| `[[key]]` | Link without label |
| `[[key\|label]]` | Link with label |

Examples:

```markdown
For more details, see [[getting-started]].
Check the [[api|API Reference]] for detailed information.
```

## Document Keys

A document key is an identifier determined by the unique relative path from the root document.

| File Path | Document Key |
|-----------|--------------|
| `docs/index.md` | `index` |
| `docs/page.md` | `page` |
| `docs/dir/page.md` | `dir/page` |

## Path Resolution

Internal links can be specified as relative paths from the current document.

```markdown
[[page1]]     → page1.md
[[dir/page2]] → dir/page2.md
```

The `./` prefix explicitly references the directory containing the current document.

```markdown
<!-- dir/page1.md -->
[[./page2]]        → dir/page2.md
[[./subdir/page3]] → dir/subdir/page3.md
```

The `../` prefix navigates to the parent directory.

```markdown
<!-- dir/page1.md -->
[[../index]]     → index.md
[[../dir/page2]] → dir/page2.md
```

Navigation above the root directory is normalized.

```markdown
<!-- index.md -->
[[../page]] → page.md (cannot go above root)
```

## Link Resolution

During initialization, Simpesys resolves all internal links:

1. Extract links from each document's Markdown content.
2. Resolve each link's key using path resolution rules.
3. Match keys against the document dictionary.
4. If matched, label the link with the target document's title (unless a custom label exists).
5. If not matched, call the `onInternalLinkUnresolved` hook.

When a link cannot be resolved (e.g., the linked document does not exist), the following handling occurs:

- The `onInternalLinkUnresolved` hook receives an error object.
- The link is replaced with a reference to the Not found document (configurable via `config.docs.notFound`).
- Custom labels are preserved if provided.
- For links to `private/` paths, the key is masked with asterisks.

## HTML Rendering

Internal links are converted to HTML anchor tags using the `renderInternalLink` hook. The default implementation:

```typescript
renderInternalLink: (key, label) => `<a href="/${key}">${label ?? key}</a>`
```

Custom rendering can modify URL structure, add CSS classes, or implement other transformations:

```typescript
renderInternalLink: (key, label) => {
  return `<a href="/docs/${key}.html" class="link">${label ?? key}</a>`;
}
```
