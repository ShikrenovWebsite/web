import type { ReactNode } from "react";

function safeHref(value: string, repositoryUrl: string) {
  try {
    const url = new URL(value, `${repositoryUrl.replace(/\/$/, "")}/`);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function InlineMarkdown({
  children,
  repositoryUrl,
}: {
  children: string;
  repositoryUrl: string;
}) {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\[[^\]]+]\([^)]+\)|\*\*[^*]+\*\*)/g;
  let cursor = 0;

  for (const match of children.matchAll(pattern)) {
    if (match.index > cursor) nodes.push(children.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code className="rounded bg-muted px-1 py-0.5" key={match.index}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else {
      const link = token.match(/^\[([^\]]+)]\(([^)]+)\)$/);
      const href = link ? safeHref(link[2], repositoryUrl) : null;
      nodes.push(
        href ? (
          <a
            className="underline underline-offset-4"
            href={href}
            key={match.index}
            rel="noreferrer"
            target="_blank"
          >
            {link?.[1]}
          </a>
        ) : (
          <span key={match.index}>{link?.[1] ?? token}</span>
        ),
      );
    }
    cursor = (match.index ?? 0) + token.length;
  }
  if (cursor < children.length) nodes.push(children.slice(cursor));
  return nodes;
}

export function SafeReadme({
  markdown,
  repositoryUrl,
}: {
  markdown: string;
  repositoryUrl: string;
}) {
  const blocks: ReactNode[] = [];
  const lines = markdown.slice(0, 100_000).replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let code: string[] | null = null;
  let list: Array<{ ordered: boolean; text: string }> = [];

  function flushParagraph(key: number) {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (text) {
      blocks.push(
        <p className="leading-6" key={`paragraph-${key}`}>
          <InlineMarkdown repositoryUrl={repositoryUrl}>{text}</InlineMarkdown>
        </p>,
      );
    }
    paragraph = [];
  }

  function flushList(key: number) {
    if (!list.length) return;
    const ordered = list[0].ordered;
    const items = list.map((item, index) => (
      <li key={`${key}-${index}`}>
        <InlineMarkdown repositoryUrl={repositoryUrl}>
          {item.text}
        </InlineMarkdown>
      </li>
    ));
    blocks.push(
      ordered ? (
        <ol className="list-decimal space-y-1 pl-5" key={`list-${key}`}>
          {items}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-5" key={`list-${key}`}>
          {items}
        </ul>
      ),
    );
    list = [];
  }

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      flushParagraph(index);
      flushList(index);
      if (code) {
        blocks.push(
          <pre
            className="overflow-auto rounded-lg bg-muted p-3 text-xs leading-5"
            key={`code-${index}`}
          >
            <code>{code.join("\n")}</code>
          </pre>,
        );
        code = null;
      } else {
        code = [];
      }
      return;
    }
    if (code) {
      code.push(line);
      return;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(index);
      flushList(index);
      const level = heading[1].length;
      const className =
        level === 1
          ? "text-xl font-semibold"
          : level === 2
            ? "text-lg font-semibold"
            : "font-semibold";
      blocks.push(
        <p className={className} key={`heading-${index}`}>
          <InlineMarkdown repositoryUrl={repositoryUrl}>
            {heading[2]}
          </InlineMarkdown>
        </p>,
      );
      return;
    }

    const listItem = line.match(/^\s*(?:(\d+)\.|[-*+])\s+(.+)$/);
    if (listItem) {
      flushParagraph(index);
      list.push({ ordered: Boolean(listItem[1]), text: listItem[2] });
      return;
    }

    if (!line.trim()) {
      flushParagraph(index);
      flushList(index);
      return;
    }
    if (line.startsWith(">")) {
      flushParagraph(index);
      flushList(index);
      blocks.push(
        <blockquote
          className="border-l-2 pl-3 text-muted-foreground"
          key={`quote-${index}`}
        >
          {line.replace(/^>\s?/, "")}
        </blockquote>,
      );
      return;
    }
    paragraph.push(line.trim());
  });

  flushParagraph(lines.length);
  flushList(lines.length);
  const trailingCode = code as string[] | null;
  if (trailingCode?.length) {
    blocks.push(
      <pre
        className="overflow-auto rounded-lg bg-muted p-3 text-xs leading-5"
        key="code-final"
      >
        <code>{trailingCode.join("\n")}</code>
      </pre>,
    );
  }

  return <div className="space-y-3 text-sm">{blocks}</div>;
}
