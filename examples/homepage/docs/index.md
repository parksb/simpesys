# Simpesys

Simpesys is a Markdown file–based documentation build tool that also serves as a complete documentation system for digital gardens. The name "Simpesys" is a portmanteau of "[Simonpedia](https://pedia.parksb.xyz/)" and "system", pronounced /sɪmˈpesɪs/.

## Getting Started

You can quickly scaffold a digital garden using Simpesys CLI tool.

```sh
$ deno run -R -W -E jsr:@simpesys/cli init my-garden
$ cd my-garden
$ deno task start
```

After running these commands, you can check out your digital garden in the browser.

![The landing page of the scaffolded digital garden.](/images/app-wiki.webp)

For detailed instructions on building a digital garden with Simpesys, see the [[getting-started]] document.

## Architecture

Simpesys is composed of three main layers. The user space is the layer where users build Simpesys projects, edit documents, and interact directly with application. The Simpesys core defines the essential components of the document system and implements the build pipeline for Simpesys projects. This core logic is distributed as the `@simpesys/core` package. Finally, the application layer bridges the user space and the Simpesys core. An application serves as the interface through which users actually interact with the document system, and is itself a Simpesys project that contains documents. In that sense, the application can be considered part of the user space. The entry point of an application is the `app/main.ts` file.

![Architecture diagram, divided into three main areas. The left blue area labeled 'User space' contains two clients: Browser and Editor. Browser connects bidirectionally with the central app/main.ts module, while Editor connects via dashed arrows to @simpesys/lsp below it. The central yellow area, app/main.ts, contains four sub-modules: @simpesys/app-bare, @simpesys/app-wiki, Other Apps, and docs/.md. The right green area represents the '@simpesys/core' package, containing a Simpesys class and an App class. Each sub-module in app/main.ts points to the App class via arrows, and the Simpesys class connects to five core data models on the far right: Metadata, Config, Link, Document, and Markdown. The @simpesys/lsp connects to docs/.md via a dashed arrow.](/images/architecture.svg)

For more detailed explanation of Simpesys' architecture, see the [[architecture]] document.

## Design Principles

Simpesys models the entire document system as a tree. However, since documents can cross-reference each other, the hierarchical model forms a tree while the reference model can become a connected directed graph with circuits. This structure allows Simpesys to maintain a simple overall document structure while managing complex reference relationships between documents. Upon initialization, Simpesys reads the designated root Markdown document. Starting from the root document, it parses internal link syntax within the content and repeatedly reads connected documents to build the complete document tree. Simpesys constructs this document tree and provides APIs for working with it.

### Document-Centric Design

Simpesys focuses exclusively on documents. Each Markdown file in the document directory represents a single document. Every document is identified by a unique relative path from the root document and can have either a flat or hierarchical structure. Simpesys treats all internal links connected to the root document as documents. The [[../404]] document, required to represent missing documents, is not treated exceptionally but exists as a regular subdocument of the root.

### High Connectivity

Simpesys emphasizes connectivity between documents. The core of a digital garden lies in the high connectivity between documents. Shortening the distance from one document to another is a goal that should be continuously pursued while maintaining a digital garden. As documents accumulate, carving out personal paths through the vast forest becomes increasingly important, and users should be able to naturally gain new inspiration while strolling along the paths they have created. A digital garden is not a wiki for preserving objective knowledge. The moment a digital garden becomes a personal wiki, it degrades into a Wikipedia without collective intelligence.

### Application Layer Separation

Simpesys itself is not a tool for creating static sites or web applications. The goal of Simpesys is to structure a document system and provide APIs for working with that structure. While Simpesys converts Markdown to HTML during initialization, this is less about building an application and more about providing an intermediate layer for representing documents in a standardized way. Application implementation is the user's responsibility, and Simpesys has no dependencies for application implementation.

### Narrow and Deep Modules

The module interfaces Simpesys provides to users should be narrow, and the depth of functionality should be deep. Simpesys exposes only essential APIs, and users who want to customize internal behavior can only do so through predefined option values. Simpesys follows "convention over configuration" by providing sensible defaults for all configuration options.

## Subpages

- [[getting-started]]
- [[architecture]]
- [[configuration]]
- [[features]]
- [[showcases]]

### Other Languages

- [[ko/index]]{한국어}

### Others

- [[../404]]

## License

Simpesys is distributed under the GNU General Public License v3.0.

## External Links

- GitHub: https://github.com/pakrsb/simpesys
- JSR: https://jsr.io/@simpesys
