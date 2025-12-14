import type { Document, DocumentDict } from "@simpesys/core";
import type { FC } from "hono/jsx";
import { css } from "hono/css";
import {
  addLangPrefix,
  defaultLang,
  detectLang,
  languages,
  stripLangPrefix,
} from "../i18n.ts";

interface NavItem {
  key: string;
  title: string;
  depth: number;
}

function buildNavTree(documents: DocumentDict, lang: string): NavItem[] {
  const items: NavItem[] = [];

  const childrenMap = new Map<string, Document[]>();

  for (const doc of Object.values(documents)) {
    if (detectLang(doc.filename) !== lang) continue;

    const parentBreadcrumb = doc.breadcrumbs[doc.breadcrumbs.length - 2];
    if (parentBreadcrumb) {
      const children = childrenMap.get(parentBreadcrumb.filename) || [];
      children.push(doc);
      childrenMap.set(parentBreadcrumb.filename, children);
    }
  }

  function addDocument(doc: Document, depth: number) {
    const keyWithoutLang = stripLangPrefix(doc.filename);
    if (keyWithoutLang === "404") return;

    items.push({
      key: doc.filename,
      title: doc.title,
      depth,
    });

    const children = childrenMap.get(doc.filename) || [];
    for (const child of children) {
      addDocument(child, depth + 1);
    }
  }

  const rootKey = lang === defaultLang ? "index" : `${lang}/index`;
  const rootDoc = documents[rootKey];
  if (rootDoc) {
    addDocument(rootDoc, 0);
  }

  return items;
}

interface SidebarProps {
  documents: DocumentDict;
  currentKey: string;
}

export const Sidebar: FC<SidebarProps> = ({ documents, currentKey }) => {
  const currentLang = detectLang(currentKey);
  const navItems = buildNavTree(documents, currentLang);

  const keyWithoutLang = stripLangPrefix(currentKey);
  const availableLangs = Object.keys(languages);
  const currentDoc = documents[currentKey];

  const navList = (
    <ul>
      {navItems.map((item) => {
        const isCurrent = item.key === currentKey;
        const classes = [`depth-${item.depth}`, isCurrent && "current"]
          .filter(Boolean)
          .join(" ");
        return (
          <li class={classes}>
            <a href={`/${item.key}`}>{item.title}</a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside class={styles.sidebar}>
      <div class={styles.langSwitch}>
        {availableLangs.map((lang, index) => {
          const config = languages[lang];
          const targetKey = addLangPrefix(keyWithoutLang, lang);
          const url = lang === defaultLang
            ? `/${keyWithoutLang}`
            : `/${targetKey}`;

          return (
            <>
              {index > 0 && <span class="separator">|</span>}
              {lang === currentLang
                ? <span class="current">{config.nativeName}</span>
                : <a href={url}>{config.nativeName}</a>}
            </>
          );
        })}
      </div>
      <nav class={styles.desktopNav}>
        {navList}
      </nav>
      <nav class={styles.mobileNav}>
        <details>
          <summary>{currentDoc?.title}</summary>
          {navList}
        </details>
      </nav>
    </aside>
  );
};

const styles = {
  sidebar: css`
    width: 200px;
    flex-shrink: 0;
    font-size: 0.9em;
    @media (max-width: 768px) {
      width: 100%;
    }
  `,
  langSwitch: css`
    margin-bottom: 1.2em;
    padding: 0 0.6em;
    font-size: 0.85em;
    display: flex;
    gap: 0.3em;
    flex-wrap: wrap;
    & a, & span.current {
      padding: 0.2em 0.5em;
      border-radius: 3px;
    }
    & a {
      color: var(--text-muted);
    }
    & a:hover {
      background: var(--bg-light);
      text-decoration: none;
      color: var(--text-color);
    }
    & span.current {
      background: var(--bg-light);
      color: var(--text-color);
    }
    & span.separator {
      display: none;
    }
    @media (max-width: 768px) {
      justify-content: center;
      padding: 0;
    }
  `,
  desktopNav: css`
    @media (max-width: 768px) {
      display: none;
    }
    & ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    & li {
      position: relative;
    }
    & li a {
      display: block;
      padding: 0.4em 0.6em;
      color: var(--text-color);
    }
    & li.current > a {
      color: var(--primary);
      font-weight: 600;
    }
    & li.depth-1, & li.depth-2, & li.depth-3 {
      border-left: 1px solid var(--border-color);
      padding-left: 0.8em;
    }
    & li.depth-1 {
      margin-left: 0.5em;
    }
    & li.depth-2 {
      margin-left: 1.5em;
    }
    & li.depth-3 {
      margin-left: 2.5em;
    }
  `,
  mobileNav: css`
    display: none;
    @media (max-width: 768px) {
      display: block;
      & details {
        border: 1px solid var(--border-color);
        border-radius: 4px;
      }
      & summary {
        padding: 0.6em 1em;
        cursor: pointer;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
      }
      & summary::-webkit-details-marker {
        display: none;
      }
      & summary::after {
        content: "▼";
        font-size: 0.7em;
      }
      & details[open] summary::after {
        transform: rotate(180deg);
      }
      & ul {
        list-style: none;
        margin: 0;
        padding: 0;
        border-top: 1px solid var(--border-color);
      }
      & li a {
        display: block;
        padding: 0.5em 1em;
        color: var(--text-color);
        border-bottom: 1px solid var(--bg-light);
      }
      & li:last-child a {
        border-bottom: none;
      }
      & li.current > a {
        color: var(--primary);
        font-weight: 600;
      }
      & li.depth-1 a {
        padding-left: 2em;
      }
      & li.depth-2 a {
        padding-left: 3em;
      }
      & li.depth-3 a {
        padding-left: 4em;
      }
    }
  `,
};
