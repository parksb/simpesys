# Metadata

Simpesys tracks document creation and modification timestamps in a separate metadata file. This document explains the metadata system, storage format, and synchronization behavior. Each document has the following metadata:

- `createdAt`: Timestamp when the document was first created.
- `updatedAt`: Timestamp when the document was last modified.
- `contentHash`: Hash of the document content.
- `previousContentHash`: The `contentHash` value of the previous version.
- `previousUpdatedAt`: The `updatedAt` value of the previous version.

Metadata is stored in a JSON file at the project root and synchronized with filesystem timestamps during initialization.

## Storage Format

Metadata is stored in `simpesys.metadata.json` at the project root:

```json
{
  "index": {
    "createdAt": "2025-12-12T15:55:29.107Z",
    "updatedAt": "2025-12-14T15:57:00.944Z",
    "contentHash": "978b4fbf6093e61d540f2af4674155e1ce49f18e",
    "previousContentHash": "60cccf1c4f26c6539b970eb4bba758b3c58fa708",
    "previousUpdatedAt": "2025-12-14T15:54:42.366Z"
  },
  "page1": {
    "createdAt": "2025-01-16T09:00:00Z",
    "updatedAt": "2025-01-16T09:00:00Z",
    "contentHash": "fba929d171cdf4487ee7e2637e9b89dc7e8eae9c"
  },
  "dir/page2": {
    "createdAt": "2025-12-13T12:03:38.423Z",
    "updatedAt": "2025-12-14T15:57:14.14Z",
    "contentHash": "87d94a15a7bed82faa73eaa3d6ce244cd9d64156",
    "previousContentHash": "7004ce48e8796e4fed235d7519bf54d291552dd1",
    "previousUpdatedAt": "2025-12-14T15:54:35.88Z"
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

If no existing metadata exists, filesystem timestamps are used. Otherwise, the `contentHash` is compared to determine whether the content has changed. If the content has changed, `updatedAt` is updated to the current time and the previous value is preserved. This approach ensures:

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
