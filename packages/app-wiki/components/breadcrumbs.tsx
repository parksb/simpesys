import type { Document } from "@simpesys/core";
import type { FC } from "hono/jsx";
import { css } from "hono/css";

export const Breadcrumbs: FC<{ breadcrumbs: Document["breadcrumbs"] }> = (
  { breadcrumbs },
) => {
  return (
    <div class={style}>
      {breadcrumbs.map((b, i) =>
        i === breadcrumbs.length - 1
          ? <span key={b.filename}>{b.title}</span>
          : (
            <span key={b.filename}>
              <a href={`/${b.filename}`}>{b.title}</a>
              {` / `}
            </span>
          )
      )}
    </div>
  );
};

const style = css`
  font-size: 0.85em;
  color: var(--text-muted);
  margin-bottom: 0.5em;
  & a {
    color: var(--text-muted);
  }
`;
