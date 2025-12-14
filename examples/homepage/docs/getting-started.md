# Getting Started

This document explains how to build a digital garden using Simpesys.

## Requirements

Simpesys requires [Deno](https://deno.com) runtime version 2.0 or higher. The package is distributed through [JSR](https://jsr.io) (JavaScript Registry).

## Project Initialization

Start by setting up a Deno project for building a digital garden. This example uses `my-garden` as the project name. Running the following command creates a `my-garden` directory and configures the Deno project:

```sh
$ deno init my-garden
```

A Simpesys project consists of an `app` directory and a `docs` directory. The `app` directory holds application implementation code, while the `docs` directory contains Markdown documents.

```
my-garden/
├── deno.json
├── app/
│   └── main.ts
└── docs/
    ├── index.md
    └── 404.md
```

Run the following commands to navigate to the `my-garden` directory, create the `app` and `docs` directories, and create empty files in each:

```sh
$ cd my-garden
$ mkdir app docs
$ touch app/main.ts docs/index.md docs/404.md
```

The document storage path defaults to the `docs` directory but can be configured using the `config.project.docs` option.

## Package Installation

Inside the `my-garden` directory, use the `deno add` command to add the `@simpesys/core` package to the project:

```sh
$ deno add jsr:@simpesys/core
```

This command adds an import mapping to `deno.json`:

```json
{
  "imports": {
    "@simpesys/core": "jsr:@simpesys/core"
  }
}
```

## Writing Documents

All Markdown documents must begin with a title. The level 1 heading in Markdown syntax becomes the document title. Using your preferred editor, create the `index.md` document in the `docs` directory as follows:

```markdown
# Index

## Subpages

- [[404]]
```

Documents listed under the `Subpages` section become subdocuments of that page. Simpesys only builds documents that are reachable from the root document through links. The subdocument section title can be configured using the `config.docs.subdocumentsSectionTitle` option.

Next, create the `404.md` document:

```markdown
# Not Found
```

## Application Implementation

In the `main.ts` file inside the `app` directory, implement an application that initializes Simpesys and builds documents. The following minimal example outputs information about the `index.md` document to the console:

```typescript
import { Simpesys } from "@simpesys/core";

const simpesys = await new Simpesys().init({ syncMetadata: true });

const document = simpesys.getDocument("index");
console.log(document);
```

The `Simpesys` constructor accepts a configuration object. The `init()` method loads and builds all documents. Setting the `syncMetadata` option to `true` generates and updates a metadata file for documents during the build process.

## Execution

Running the application requires the following Deno permissions:

| Permission | Flag | Purpose |
|------------|------|---------|
| Read | `--allow-read` or `-R` | Reading Markdown files and metadata |
| Write | `--allow-write` or `-W` | Writing metadata files (when `syncMetadata` is enabled) |
| Environment | `--allow-env` or `-E` | Accessing environment variables |

Run the application with the following command to view information about the `index.md` document in the console:

```sh
$ deno run -R -W -E app/main.ts
```

If the `syncMetadata` option was set to `true`, a `simpesys.metadata.json` file will be created after running the application.

## Web Framework Integration

The easiest way to serve a document tree built with Simpesys as a website is to use a web framework. Simpesys provides Markdown documents converted to HTML. The following is an example `app.ts` file written using [Hono](https://hono.dev/):

```typescript
import { Simpesys } from "@simpesys/core";
import { Hono } from "@hono/hono";

const simpesys = await new Simpesys()
  .init({ syncMetadata: Deno.env.get("ENV") !== "production" });

const app = new Hono();

function documentResponse(id: string, c: Context) {
  let document = simpesys.getDocument(id);

  if (!document) {
    c.status(404);
    document = simpesys.getDocument("404")!;
  }

  return c.html(document.html);
}

app.get("/:id", (c) => {
  const id = c.req.param("id");
  return documentResponse(id, c);
});

app.get("/", (c) => {
  return documentResponse("index", c);
});

Deno.serve(app.fetch);
```

Run the above application with the following command to start a local server:

```sh
$ deno run -R -W -E -N app/main.ts
Listening on http://0.0.0.0:8000/ (http://localhost:8000/)
```
