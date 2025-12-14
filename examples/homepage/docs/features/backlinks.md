# Backlinks

Backlinks are a reverse-reference feature that automatically tracks documents referencing the current document and creates links to them. This document explains how backlinks are calculated and displayed. When document A contains an internal link to document B, Simpesys automatically adds document A as a backlink entry to document B. This bidirectional relationship enables navigation from referenced documents to referencing sources.

## Backlink Calculation

Backlinks are calculated during the link resolution stage of initialization:

1. Extract internal links from each document's Markdown content.
2. Identify each link target in the document dictionary.
3. Create a `Reference` object containing the referencing document and sentences that cite the current document.
4. Add the reference to the target document's `referred` list.

## Backlinks Section

Backlinks are added as a dedicated section at the end of each document's Markdown content. The section title can be configured using the `config.docs.backlinksSectionTitle` option. The default value is "Backlinks".

```typescript
const simpesys = new Simpesys({
  config: {
    docs: {
      backlinksSectionTitle: "Documents citing this page"
    },
  },
});
```

## Accessing Backlinks Programmatically

The `Document` object contains a `referred` list with all backlink references:

```typescript
const doc = simpesys.getDocument("api");

for (const ref of doc.referred) {
  console.log(`Referencing document: ${ref.document.title}`);
  console.log(`Sentences: ${ref.sentences.join(", ")}`);
}
```
