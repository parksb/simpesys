import type { DocumentDict } from "@simpesys/core";
import type { FC } from "hono/jsx";
import { css } from "hono/css";
import {
  addLangPrefix,
  defaultLang,
  detectLang,
  getLangConfig,
  stripLangPrefix,
} from "../i18n.ts";

interface HeaderProps {
  documents: DocumentDict;
  currentKey: string;
}

export const Header: FC<HeaderProps> = ({ documents, currentKey }) => {
  const currentLang = detectLang(currentKey);
  const langConfig = getLangConfig(currentKey);
  const homeUrl = currentLang === defaultLang ? "/" : `/${currentLang}/index`;

  const navItems: { href: string; label: string }[] = [];
  const directories = new Set<string>();
  const topLevelDocs = new Set<string>();

  for (const key of Object.keys(documents)) {
    if (detectLang(key) !== currentLang) continue;

    const keyWithoutLang = stripLangPrefix(key);
    if (keyWithoutLang === "index" || keyWithoutLang === "404") continue;

    const parts = keyWithoutLang.split("/");
    if (parts.length > 1) {
      directories.add(parts[0]);
    } else {
      topLevelDocs.add(keyWithoutLang);
      navItems.push({ href: `/${key}`, label: documents[key].title });
    }
  }

  for (const dir of [...directories].sort()) {
    if (topLevelDocs.has(dir)) continue;

    const prefix = addLangPrefix(dir + "/", currentLang);
    const firstDoc = Object.entries(documents).find(([key]) =>
      key.startsWith(prefix)
    );
    if (firstDoc) {
      const label = langConfig.categories[dir] ??
        dir.charAt(0).toUpperCase() + dir.slice(1);
      navItems.push({ href: `/${firstDoc[0]}`, label });
    }
  }

  return (
    <header class={styles.header}>
      <div class={styles.inner}>
        <div class={styles.logo}>
          <a href={homeUrl}>Simpesys</a>
        </div>
        <nav class={styles.nav}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>
      </div>
    </header>
  );
};

const styles = {
  header: css`
    border-bottom: 1px solid var(--border-color);
  `,
  inner: css`
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.8em 1em;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      padding: 0.6em 1em;
      gap: 0.5em;
    }
  `,
  logo: css`
    font-size: 1.1em;
    font-weight: 600;
    & a {
      color: var(--text-color);
    }
    & a:hover {
      text-decoration: none;
    }
  `,
  nav: css`
    display: flex;
    flex-wrap: wrap;
    gap: 0.2em;
    & a {
      color: var(--text-color);
      padding: 0.3em 0.6em;
      font-size: 0.9em;
    }
    @media (max-width: 768px) {
      justify-content: center;
      & a {
        font-size: 0.85em;
      }
    }
  `,
};
