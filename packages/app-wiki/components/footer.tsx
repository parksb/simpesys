import type { FC } from "hono/jsx";
import { css } from "hono/css";

export const Footer: FC = () => (
  <footer class={style}>Powered by Simpesys</footer>
);

const style = css`
  border-top: 1px solid var(--border-color);
  margin-top: 2em;
  padding: 1em;
  font-size: 0.85em;
  color: var(--text-muted);
`;
