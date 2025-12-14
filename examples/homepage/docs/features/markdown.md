# Markdown Extensions

Simpesys provides various Markdown syntax and features for extended functionality. This document describes the Markdown features and syntax extensions supported by Simpesys.

## Plugins

### Footnotes

Footnote syntax is supported. Footnotes are rendered at the end of the document alongside backlinks.

```markdown
Here is a sentence that needs a citation[^1].

[^1]: This is the footnote content.
```

### Mathematical Notation

Mathematical expressions are rendered with KaTeX using dollar sign delimiters.

| Syntax | Description |
|--------|-------------|
| `$...$` | Inline math |
| `$$...$$` | Display (block) math |

### Emoji

Emoji shortcodes are converted to Unicode emoji.

```markdown
:smile: :rocket: :thumbsup:
```

### Task Lists

Checkbox syntax is supported. Checkboxes are rendered as disabled (read-only) inputs.

```markdown
- [x] Completed task
- [ ] Pending task
```

### Image Sizing

Image dimensions can be specified.

```markdown
![alt text](image.png =200x100)
![alt text](image.png =200x)
![alt text](image.png =x100)
```

### External Links

Links to external domains are assigned the `external` class. Internal domains are determined by the `config.web.domain` option.

### Container Blocks

Custom container blocks provide callout-style formatting. Container blocks are rendered as `<div>` elements with corresponding class names for CSS styling.

#### Toggle

```markdown
::: TOGGLE Summary text
Hidden content revealed when expanded.
:::
```

#### Note Block

```markdown
::: NOTE
This is a note callout.
:::
```

#### Info Block

```markdown
::: INFO
This is an info callout.
:::
```

## HTML Allowed

Raw HTML is allowed in Markdown content. HTML passes through to the output without modification.

```markdown
<div class="custom-wrapper">
  <p>Custom HTML content</p>
</div>
```
