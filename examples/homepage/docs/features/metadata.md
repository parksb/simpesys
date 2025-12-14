# Metadata

Simpesys tracks document creation and modification timestamps in a separate metadata file. This document explains the metadata system, storage format, and synchronization behavior. Each document has the following metadata:

- `createdAt`: Timestamp when the document was first created.
- `updatedAt`: Timestamp when the document was last modified.

Metadata is stored in a JSON file at the project root and synchronized with filesystem timestamps during initialization.

## Storage Format

Metadata is stored in `simpesys.metadata.json` at the project root:

```json
{
  "index": {
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-02-20T14:45:00Z"
  },
  "guide": {
    "createdAt": "2025-01-16T09:00:00Z",
    "updatedAt": "2025-01-16T09:00:00Z"
  },
  "features/toc": {
    "createdAt": "2025-01-20T11:00:00Z",
    "updatedAt": "2025-03-01T08:30:00Z"
  }
}
```

JSON object keys correspond to document keys. Timestamps are stored as ISO 8601 strings.

## Timestamp Resolution

During initialization, Simpesys resolves timestamps from multiple sources.

### Priority

1. Existing metadata file: If a document already exists in the metadata file, those timestamps are used.
2. Filesystem timestamps: The actual document file's creation and modification times are read.

### Synchronization Logic

For each document, the following logic is performed:

- If no existing metadata entry exists, use filesystem timestamps.
- If existing metadata exists:
  - `createdAt` preserves the existing value.
  - `updatedAt` is updated only if the file's modification time is newer than the stored value.

This approach ensures:

- Creation timestamps remain stable across deployment environments.
- Modification timestamps reflect actual file changes.
- Manual metadata edits are respected.
- Markdown document files remain separate from Simpesys specifications.

## Metadata Synchronization

Metadata synchronization requires filesystem access and is disabled by default. To track document metadata, enable synchronization by passing the `syncMetadata: true` option to the `init()` method.

```typescript
await new Simpesys(/* ... */).init({ syncMetadata: true });
```

## Private Document Exclusion

Documents with keys starting with `private/` are excluded from metadata synchronization. This prevents private document paths from appearing in the public metadata file. Currently, there is no feature to track metadata for private documents.
