# Cache

Simpesys supports incremental rendering by reusing previously generated document HTML. Caching improves build performance by skipping rendering for documents whose content and settings have not changed. Caching is disabled by default. Call `init({ cache: true })` to enable it.

To share a cache between two or more Simpesys instances in the same process, pass the previous instance's cache to the next instance.

```typescript
import { Simpesys } from "@simpesys/core";

const first = await new Simpesys().init({ cache: true });

const second = await new Simpesys().init({
  cache: {
    previous: first.getCache(),
  },
});
```

This example retrieves the first instance's cache with `getCache()` and passes it to the second instance through `cache.previous`.

| Option | Type | Description |
|--------|------|-------------|
| `cache.version` | `string` | Version used to distinguish caches. |
| `cache.previous` | `Cache` | Cache to reuse. |

If you supply rendering hooks such as `renderInternalLink` or `configureMarkdownConverter`, explicitly set `cache.version` when reusing a previous cache. Update the version when the hook implementation changes.

```typescript
await new Simpesys(config).init({
  cache: { previous, version: "v2" },
});
```

The in-memory cache is lost when the process restarts. The application can save the cache to the filesystem so that instances in another process can reuse it.

```typescript
import { type Cache, Simpesys } from "@simpesys/core";

const cacheDirectory = ".simpesys";
const cachePath = `${cacheDirectory}/cache.json`;

let previous: Cache | undefined;

try {
  previous = JSON.parse(await Deno.readTextFile(cachePath));
} catch (error) {
  if (!(error instanceof Deno.errors.NotFound || error instanceof SyntaxError)) {
    throw error;
  }
}

const simpesys = await new Simpesys().init({
  cache: { previous },
});

const next = simpesys.getCache();

if (next) {
  await Deno.mkdir(cacheDirectory, { recursive: true });
  await Deno.writeTextFile(cachePath, JSON.stringify(next));
}
```
