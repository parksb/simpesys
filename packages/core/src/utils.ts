import type { Document } from "./document.ts";

export async function readFile(path: string | URL) {
  const decoder = new TextDecoder("utf-8");
  const file = await Deno.readFile(path);
  return decoder.decode(file);
}

export function sortBy(
  a: Document,
  b: Document,
  key: "createdAt" | "updatedAt",
) {
  const aDate = a[key]?.toString();
  const bDate = b[key]?.toString();
  if (aDate === undefined && bDate === undefined) {
    return -1;
  } else if (aDate === undefined) {
    return 1;
  } else if (bDate === undefined) {
    return -1;
  } else {
    return bDate.localeCompare(aDate);
  }
}
