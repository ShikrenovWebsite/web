import type { CvSourcePage } from "@/lib/cv/parser";

const pageMarker = /^<<<CV_PAGE_(\d+)>>>$/;

export function joinCvPages(pages: CvSourcePage[]) {
  return pages
    .map(
      (page) =>
        `<<<CV_PAGE_${page.pageNumber}>>>\n${page.text.trim()}`,
    )
    .join("\n\n");
}

export function splitCvPages(text: string): CvSourcePage[] {
  const lines = text.split(/\r?\n/);
  const pages: CvSourcePage[] = [];
  let current: CvSourcePage | null = null;
  for (const line of lines) {
    const marker = line.trim().match(pageMarker);
    if (marker) {
      if (current) current.text = current.text.trim();
      current = { pageNumber: Number(marker[1]), text: "" };
      pages.push(current);
    } else if (current) {
      current.text += `${current.text ? "\n" : ""}${line}`;
    }
  }
  if (!pages.length) return [{ pageNumber: 1, text: text.trim() }];
  if (current) current.text = current.text.trim();
  return pages;
}
