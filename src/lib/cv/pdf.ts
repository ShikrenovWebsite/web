import {
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { CvDocumentData } from "@/lib/cv/document";

const A4 = { width: 595.28, height: 841.89 };

function wrap(text: string, font: PDFFont, size: number, width: number) {
  function splitLongWord(word: string) {
    if (font.widthOfTextAtSize(word, size) <= width) return [word];
    const chunks: string[] = [];
    let chunk = "";
    for (const character of word) {
      const next = `${chunk}${character}`;
      if (chunk && font.widthOfTextAtSize(next, size) > width) {
        chunks.push(chunk);
        chunk = character;
      } else {
        chunk = next;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  }

  return text.split(/\r?\n/).flatMap((paragraph, paragraphIndex, paragraphs) => {
    const words = paragraph
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .flatMap(splitLongWord);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push("");
    return lines;
  });
}

export async function generateCvPdf(data: CvDocumentData) {
  const compact = data.version.layoutMode === "COMPACT_ONE_PAGE";
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${data.profile.fullName} - ${data.version.name}`);
  pdf.setAuthor(data.profile.fullName);
  pdf.setSubject("Curriculum Vitae");
  pdf.setCreator("Portfolio CV Builder");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = compact ? 28.35 : 39.7;
  const bodySize = compact ? 8.35 : 9.15;
  const lineHeight = bodySize * (compact ? 1.28 : 1.34);
  const contentWidth = A4.width - margin * 2;
  const gap = compact ? 17 : 22;
  const sideWidth = compact ? 156 : 164;
  const mainWidth = contentWidth - gap - sideWidth;
  const pages: PDFPage[] = [];

  function pageAt(index: number) {
    while (!pages[index]) pages.push(pdf.addPage([A4.width, A4.height]));
    return pages[index];
  }

  function addLink(
    page: PDFPage,
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const annotation = pdf.context.register(
      pdf.context.obj({
        Type: PDFName.of("Annot"),
        Subtype: PDFName.of("Link"),
        Rect: [x, y - 2, x + width, y + height],
        Border: [0, 0, 0],
        A: {
          Type: PDFName.of("Action"),
          S: PDFName.of("URI"),
          URI: PDFString.of(url),
        },
      }),
    );
    page.node.addAnnot(annotation);
  }

  const firstPage = pageAt(0);
  let headerY = A4.height - margin;
  firstPage.drawText(data.profile.fullName || "Curriculum Vitae", {
    x: margin,
    y: headerY,
    size: compact ? 22 : 23,
    font: bold,
    color: rgb(0.07, 0.07, 0.07),
  });
  headerY -= compact ? 17 : 19;
  if (data.version.headline) {
    firstPage.drawText(data.version.headline, {
      x: margin,
      y: headerY,
      size: compact ? 10.25 : 11,
      font: regular,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  const contact = [
    data.profile.email,
    data.profile.phone,
    data.profile.location,
    data.profile.website,
    ...data.profile.links,
  ].filter(Boolean);
  const contactWidth = compact ? 210 : 225;
  const contactRows: string[][] = [];
  let currentRow: string[] = [];
  for (const item of contact) {
    const candidate = [...currentRow, item].join(" | ");
    if (
      currentRow.length &&
      regular.widthOfTextAtSize(candidate, 7.1) > contactWidth
    ) {
      contactRows.push(currentRow);
      currentRow = [item];
    } else {
      currentRow.push(item);
    }
  }
  if (currentRow.length) contactRows.push(currentRow);
  let contactY = A4.height - margin;
  for (const row of contactRows) {
    const rowText = row.join(" | ");
    let contactX =
      A4.width - margin - regular.widthOfTextAtSize(rowText, 7.1);
    row.forEach((item, index) => {
      if (index) {
        firstPage.drawText(" | ", {
          x: contactX,
          y: contactY,
          size: 7.1,
          font: regular,
          color: rgb(0.4, 0.4, 0.4),
        });
        contactX += regular.widthOfTextAtSize(" | ", 7.1);
      }
      firstPage.drawText(item, {
        x: contactX,
        y: contactY,
        size: 7.1,
        font: regular,
        color: rgb(0.2, 0.2, 0.2),
      });
      if (item.startsWith("http") || item.includes("@")) {
        addLink(
          firstPage,
          item.startsWith("http") ? item : `mailto:${item}`,
          contactX,
          contactY,
          regular.widthOfTextAtSize(item, 7.1),
          7.1,
        );
      }
      contactX += regular.widthOfTextAtSize(item, 7.1);
    });
    contactY -= 9;
  }

  const ruleY = Math.min(headerY - 6, contactY - 2);
  firstPage.drawLine({
    start: { x: margin, y: ruleY },
    end: { x: A4.width - margin, y: ruleY },
    thickness: 0.8,
    color: rgb(0.12, 0.12, 0.12),
  });

  let contentStartY = ruleY - (compact ? 11 : 14);
  if (data.version.summary) {
    const summaryLines = wrap(
      data.version.summary,
      regular,
      bodySize,
      contentWidth,
    );
    for (const line of summaryLines) {
      firstPage.drawText(line, {
        x: margin,
        y: contentStartY,
        size: bodySize,
        font: regular,
        color: rgb(0.1, 0.1, 0.1),
      });
      contentStartY -= lineHeight;
    }
    contentStartY -= compact ? 7 : 10;
  }

  type Writer = {
    x: number;
    width: number;
    pageIndex: number;
    y: number;
  };
  const main: Writer = {
    x: margin,
    width: mainWidth,
    pageIndex: 0,
    y: contentStartY,
  };
  const side: Writer = {
    x: margin + mainWidth + gap,
    width: sideWidth,
    pageIndex: 0,
    y: contentStartY,
  };

  function ensure(writer: Writer, height: number) {
    if (writer.y - height >= margin) return;
    writer.pageIndex += 1;
    writer.y = A4.height - margin;
    pageAt(writer.pageIndex);
  }

  function drawWrapped(
    writer: Writer,
    value: string,
    options: {
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      gapAfter?: number;
      link?: string;
      ensureSpace?: boolean;
    } = {},
  ) {
    const font = options.font ?? regular;
    const size = options.size ?? bodySize;
    const indent = options.indent ?? 0;
    const height = size * (compact ? 1.28 : 1.34);
    const lines = wrap(value, font, size, writer.width - indent);
    if (options.ensureSpace !== false) ensure(writer, lines.length * height);
    for (const line of lines) {
      const page = pageAt(writer.pageIndex);
      page.drawText(line, {
        x: writer.x + indent,
        y: writer.y,
        size,
        font,
        color: options.color ?? rgb(0.1, 0.1, 0.1),
      });
      if (options.link) {
        addLink(
          page,
          options.link,
          writer.x + indent,
          writer.y,
          font.widthOfTextAtSize(line, size),
          size,
        );
      }
      writer.y -= height;
    }
    writer.y -= options.gapAfter ?? 0;
  }

  function section(writer: Writer, title: string, firstItemHeight = 28) {
    const headingHeight = compact ? 20 : 23;
    ensure(writer, headingHeight + firstItemHeight);
    drawWrapped(writer, title.toUpperCase(), {
      font: bold,
      size: compact ? 7.8 : 8.4,
      gapAfter: 3,
      ensureSpace: false,
    });
    const page = pageAt(writer.pageIndex);
    page.drawLine({
      start: { x: writer.x, y: writer.y + 1.5 },
      end: { x: writer.x + writer.width, y: writer.y + 1.5 },
      thickness: 0.55,
      color: rgb(0.18, 0.18, 0.18),
    });
    writer.y -= compact ? 7 : 9;
  }

  function measureText(
    value: string,
    width: number,
    size = bodySize,
    font = regular,
  ) {
    return wrap(value, font, size, width).length *
      size *
      (compact ? 1.28 : 1.34);
  }

  function bullets(writer: Writer, values: string[]) {
    for (const value of values) {
      const bulletIndent = 11;
      const height = measureText(value, writer.width - bulletIndent) + 1;
      ensure(writer, height);
      const page = pageAt(writer.pageIndex);
      page.drawText("-", {
        x: writer.x + 1,
        y: writer.y,
        size: bodySize,
        font: regular,
      });
      drawWrapped(writer, value, {
        indent: bulletIndent,
        gapAfter: 1,
        ensureSpace: false,
      });
    }
  }

  if (data.experience.length) {
    section(main, "Experience", 44);
    for (const item of data.experience) {
      const metadata = [
        item.location,
        [item.startDate, item.endDate].filter(Boolean).join(" - "),
      ]
        .filter(Boolean)
        .join(" | ");
      const itemHeight =
        measureText(`${item.role} - ${item.company}`, main.width, bodySize, bold) +
        measureText(metadata, main.width, compact ? 7.3 : 7.8) +
        measureText(item.description, main.width) +
        item.highlights.reduce(
          (height, value) =>
            height + measureText(value, main.width - 11) + 1,
          0,
        ) +
        (compact ? 7 : 10);
      ensure(main, itemHeight);
      drawWrapped(main, `${item.role} - ${item.company}`, {
        font: bold,
        gapAfter: 1,
        ensureSpace: false,
      });
      if (metadata) {
        drawWrapped(main, metadata, {
          size: compact ? 7.3 : 7.8,
          color: rgb(0.35, 0.35, 0.35),
          gapAfter: 2,
          ensureSpace: false,
        });
      }
      if (item.description) {
        drawWrapped(main, item.description, {
          gapAfter: 2,
          ensureSpace: false,
        });
      }
      bullets(main, item.highlights);
      main.y -= compact ? 5 : 8;
    }
  }

  if (data.projects.length) {
    section(main, "Selected projects", 40);
    for (const item of data.projects) {
      const itemHeight =
        measureText(item.title, main.width, bodySize, bold) +
        measureText(item.shortDescription, main.width) +
        measureText(item.longDescription, main.width) +
        measureText(
          item.technologies.length
            ? `Stack: ${item.technologies.join(", ")}`
            : "",
          main.width,
          compact ? 7.3 : 7.8,
        ) +
        item.highlights.reduce(
          (height, value) =>
            height + measureText(value, main.width - 11) + 1,
          0,
        ) +
        (compact ? 9 : 12);
      ensure(main, itemHeight);
      drawWrapped(main, item.title, {
        font: bold,
        gapAfter: 1,
        ensureSpace: false,
      });
      if (item.shortDescription) {
        drawWrapped(main, item.shortDescription, { ensureSpace: false });
      }
      if (item.longDescription) {
        drawWrapped(main, item.longDescription, {
          gapAfter: 2,
          ensureSpace: false,
        });
      }
      bullets(main, item.highlights);
      if (item.technologies.length) {
        drawWrapped(main, `Stack: ${item.technologies.join(", ")}`, {
          size: compact ? 7.3 : 7.8,
          gapAfter: 2,
          ensureSpace: false,
        });
      }
      for (const url of [item.liveUrl, item.sourceCodeUrl].filter(Boolean)) {
        drawWrapped(main, url, {
          size: 6.8,
          color: rgb(0.1, 0.2, 0.45),
          link: url,
          ensureSpace: false,
        });
      }
      main.y -= compact ? 5 : 8;
    }
  }

  if (data.education.length) {
    section(side, "Education", 34);
    for (const item of data.education) {
      ensure(side, 34);
      drawWrapped(
        side,
        [item.qualification, item.fieldOfStudy].filter(Boolean).join(", ") ||
          item.institution,
        { font: bold, ensureSpace: false },
      );
      if (item.qualification || item.fieldOfStudy) {
        drawWrapped(side, item.institution, { ensureSpace: false });
      }
      drawWrapped(
        side,
        [item.startDate, item.endDate].filter(Boolean).join(" - "),
        {
          size: 7,
          color: rgb(0.35, 0.35, 0.35),
          gapAfter: 2,
          ensureSpace: false,
        },
      );
      if (item.description) {
        drawWrapped(side, item.description, {
          gapAfter: compact ? 5 : 8,
          ensureSpace: false,
        });
      }
    }
  }

  if (data.skills.length) {
    section(side, "Skills", 30);
    const categories = new Map<string, typeof data.skills>();
    for (const skill of data.skills) {
      const category = skill.category || "Skills";
      categories.set(category, [...(categories.get(category) ?? []), skill]);
    }
    for (const [category, skills] of categories) {
      drawWrapped(side, category, { font: bold, ensureSpace: true });
      drawWrapped(side, skills.map((skill) => skill.name).join(", "), {
        gapAfter: compact ? 4 : 6,
      });
    }
  }

  if (data.certifications.length) {
    section(side, "Certifications", 24);
    for (const item of data.certifications) {
      drawWrapped(side, [item.name, item.issuer].filter(Boolean).join(" - "), {
        gapAfter: 2,
      });
    }
  }

  if (data.languages.length) {
    section(side, "Languages", 20);
    drawWrapped(
      side,
      data.languages
        .map((item) =>
          [item.name, item.proficiency].filter(Boolean).join(" - "),
        )
        .join(", "),
    );
  }

  for (let index = 0; index < pages.length; index += 1) {
    pages[index].drawLine({
      start: {
        x: margin + mainWidth + gap / 2,
        y: index === 0 ? contentStartY : A4.height - margin,
      },
      end: { x: margin + mainWidth + gap / 2, y: margin },
      thickness: 0.35,
      color: rgb(0.78, 0.78, 0.78),
    });
    if (index === 0) continue;
    pages[index].drawText(`${data.profile.fullName} · ${data.version.headline}`, {
      x: margin,
      y: A4.height - margin + 10,
      size: 7,
      font: regular,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false }));
  return { bytes, pageCount: pages.length };
}

export function cvFilename(fullName: string, versionName: string) {
  const slug = `${fullName}-${versionName}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "portfolio"}-cv.pdf`;
}
