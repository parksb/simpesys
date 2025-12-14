import type { Document, DocumentDict } from "@simpesys/core";
import type { FC } from "hono/jsx";
import { css, Style } from "hono/css";
import { Header } from "./header.tsx";
import { Sidebar } from "./sidebar.tsx";
import { Breadcrumbs } from "./breadcrumbs.tsx";
import { Footer } from "./footer.tsx";
import { detectLang } from "../i18n.ts";

interface LayoutProps {
  document: Document;
  documents: DocumentDict;
}

export const Layout: FC<LayoutProps> = ({ document, documents }) => {
  const lang = detectLang(document.filename);

  return (
    <html lang={lang} class={styles.global}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{document.title} | Simpesys</title>
        <link
          rel="stylesheet"
          href=" https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.min.css "
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css"
        />
        <Style />
      </head>
      <body>
        <Header documents={documents} currentKey={document.filename} />
        <div class={styles.container}>
          <Sidebar documents={documents} currentKey={document.filename} />
          <main class={styles.content}>
            <Breadcrumbs breadcrumbs={document.breadcrumbs} />
            <div dangerouslySetInnerHTML={{ __html: document.html }} />
          </main>
        </div>
        <Footer />
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js" />
      </body>
    </html>
  );
};

const styles = {
  global: css`
    :-hono-global {
      :root {
        --primary: #246ad3;
        --bg-dark: #333;
        --bg-light: #f5f5f5;
        --border-color: #ccc;
        --text-color: #222;
        --text-muted: #666;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family:
          "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont,
          system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo",
          "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji",
          "Segoe UI Symbol", sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-color);
        background: #fff;
      }
      a {
        color: var(--primary);
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    }
  `,
  container: css`
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    gap: 1.5rem;
    padding: 1.5rem 1rem;
    @media (max-width: 768px) {
      flex-direction: column;
      padding: 1rem;
    }
  `,
  content: css`
    flex: 1;
    min-width: 0;
    & h1 {
      font-size: 1.8rem;
      font-weight: normal;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.3rem;
      margin-bottom: 0.8rem;
      @media (max-width: 768px) {
        font-size: 1.5rem;
      }
    }
    & h2 {
      font-size: 1.3rem;
      font-weight: bold;
      border-bottom: 1px solid #ddd;
      padding-bottom: 0.2rem;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }
    & h3 {
      font-size: 1.1rem;
      font-weight: bold;
      margin-top: 1.2rem;
      margin-bottom: 0.4rem;
    }
    & p {
      margin: 0.5rem 0 1rem;
    }
    & ul, & ol {
      margin: 0.5rem 0 1rem 1.6rem;
    }
    & li {
      margin: 0.25rem 0;
    }
    & code {
      background: var(--bg-light);
      border: 1px solid #ddd;
      border-radius: 2px;
      padding: 1px 4px;
      font-family: monospace;
      font-size: 0.85em;
      word-break: break-word;
    }
    & pre {
      background: var(--bg-light);
      border: 1px solid var(--border-color);
      padding: 1rem;
      overflow-x: auto;
      margin: 1rem 0;
      font-size: 0.9rem;
      @media (max-width: 768px) {
        padding: 0.75rem;
        font-size: 0.85rem;
      }
    }
    & pre code {
      background: none;
      border: none;
      padding: 0;
      word-break: normal;
    }
    & table {
      border-collapse: collapse;
      margin: 1rem 0;
      width: 100%;
      display: block;
      overflow-x: auto;
      font-size: 0.9rem;
    }
    & th, & td {
      border: 1px solid var(--border-color);
      padding: 0.5rem 0.8rem;
      text-align: left;
      white-space: nowrap;
      @media (max-width: 768px) {
        padding: 0.4rem 0.6rem;
      }
    }
    & th {
      background: var(--bg-light);
      font-weight: bold;
    }
    & blockquote {
      border-left: 3px solid var(--border-color);
      padding: 0.2rem 1rem;
      & p {
        margin: 0;
      }
    }
    & li:has(> blockquote) {
      list-style: none;
      margin-left: -1.6rem;
    }
    & .table-of-contents {
      margin-bottom: 1.5rem;
      ol {
        counter-reset: toc;
        list-style: none;
        margin: 0;
        padding-left: 1rem;
      }
      & > ol {
        padding-left: 0;
      }
      li {
        counter-increment: toc;
      }
      li::before {
        content: counters(toc, ".") ". ";
        color: var(--text-muted);
      }
    }
  `,
};
