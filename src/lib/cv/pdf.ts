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
import { buildCvPdfFilename } from "@/lib/cv/filename";
import { flatCvSkillsText } from "@/lib/cv/skills-layout";

const A4 = { width: 595.28, height: 841.89 };

// pdf-lib's built-in Helvetica font is WinAnsi encoded. Portfolio content can
// contain emoji (for example a map pin copied into a location), so normalize
// text at the rendering boundary instead of allowing one unsupported glyph to
// abort an otherwise valid CV export.
function pdfSafeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022\u00B7]/g, "|")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  text = pdfSafeText(text);
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
  const bottomGap = compact ? 13 : 17;
  const educationWidth = (contentWidth - bottomGap) * 0.34;
  const skillsWidth = contentWidth - bottomGap - educationWidth;
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
  firstPage.drawText(pdfSafeText(data.profile.fullName || "Curriculum Vitae"), {
    x: margin,
    y: headerY,
    size: compact ? 22 : 23,
    font: bold,
    color: rgb(0.07, 0.07, 0.07),
  });
  headerY -= compact ? 17 : 19;
  if (data.version.headline) {
    firstPage.drawText(pdfSafeText(data.version.headline), {
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
  ].filter(Boolean).map(pdfSafeText);
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
  const content: Writer = {
    x: margin,
    width: contentWidth,
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

  function educationHeight(width: number) {
    return data.education.reduce((height, item) => {
      const title =
        [item.qualification, item.fieldOfStudy].filter(Boolean).join(", ") ||
        item.institution;
      return (
        height +
        measureText(title, width, bodySize, bold) +
        (item.qualification || item.fieldOfStudy
          ? measureText(item.institution, width)
          : 0) +
        measureText(
          [item.startDate, item.endDate].filter(Boolean).join(" - "),
          width,
          7,
        ) +
        (item.description ? measureText(item.description, width) : 0) +
        (compact ? 5 : 8)
      );
    }, compact ? 31 : 36);
  }

  function skillsHeight(width: number) {
    return (
      (compact ? 31 : 36) +
      measureText(flatCvSkillsText(data.skills), width, bodySize)
    );
  }

  const canUseBottomColumns =
    data.education.length > 0 &&
    data.skills.length > 0 &&
    Math.max(educationHeight(educationWidth), skillsHeight(skillsWidth)) <=
      A4.height - margin * 2;
  const bottomBlockHeight = canUseBottomColumns
    ? Math.max(educationHeight(educationWidth), skillsHeight(skillsWidth))
    : educationHeight(content.width) + skillsHeight(content.width);

  if (data.experience.length) {
    section(content, "Experience", 44);
    for (const item of data.experience) {
      const metadata = [
        item.location,
        [item.startDate, item.endDate].filter(Boolean).join(" - "),
      ]
        .filter(Boolean)
        .join(" | ");
      const itemHeight =
        measureText(`${item.role} - ${item.company}`, content.width, bodySize, bold) +
        measureText(metadata, content.width, compact ? 7.3 : 7.8) +
        measureText(item.description, content.width) +
        item.highlights.reduce(
          (height, value) =>
            height + measureText(value, content.width - 11) + 1,
          0,
        ) +
        (compact ? 7 : 10);
      ensure(content, itemHeight);
      drawWrapped(content, `${item.role} - ${item.company}`, {
        font: bold,
        gapAfter: 1,
        ensureSpace: false,
      });
      if (metadata) {
        drawWrapped(content, metadata, {
          size: compact ? 7.3 : 7.8,
          color: rgb(0.35, 0.35, 0.35),
          gapAfter: 2,
          ensureSpace: false,
        });
      }
      if (item.description) {
        drawWrapped(content, item.description, {
          gapAfter: 2,
          ensureSpace: false,
        });
      }
      bullets(content, item.highlights);
      content.y -= compact ? 5 : 8;
    }
  }

  if (data.projects.length) {
    section(content, "Selected projects", 40);
    for (const [projectIndex, item] of data.projects.entries()) {
      const itemHeight =
        measureText(item.title, content.width, bodySize, bold) +
        measureText(item.shortDescription, content.width) +
        measureText(item.longDescription, content.width) +
        measureText(
          item.technologies.length
            ? `Stack: ${item.technologies.join(", ")}`
            : "",
          content.width,
          compact ? 7.3 : 7.8,
        ) +
        item.highlights.reduce(
          (height, value) =>
            height + measureText(value, content.width - 11) + 1,
          0,
        ) +
        (compact ? 9 : 12);
      // Keep the last project with the final supporting block when both fit
      // on a fresh page. This avoids an almost-empty final page of skills.
      const reserveForSupportingBlock =
        projectIndex === data.projects.length - 1 ? bottomBlockHeight : 0;
      ensure(content, itemHeight + reserveForSupportingBlock);
      drawWrapped(content, item.title, {
        font: bold,
        gapAfter: 1,
        ensureSpace: false,
      });
      if (item.shortDescription) {
        drawWrapped(content, item.shortDescription, { ensureSpace: false });
      }
      if (item.longDescription) {
        drawWrapped(content, item.longDescription, {
          gapAfter: 2,
          ensureSpace: false,
        });
      }
      bullets(content, item.highlights);
      if (item.technologies.length) {
        drawWrapped(content, `Stack: ${item.technologies.join(" | ")}`, {
          size: compact ? 7.3 : 7.8,
          gapAfter: 2,
          ensureSpace: false,
        });
      }
      for (const url of [item.liveUrl, item.sourceCodeUrl].filter(Boolean)) {
        drawWrapped(content, url, {
          size: 6.8,
          color: rgb(0.1, 0.2, 0.45),
          link: url,
          ensureSpace: false,
        });
      }
      content.y -= compact ? 5 : 8;
    }
  }

  function drawEducation(writer: Writer) {
    section(writer, "Education", 34);
    for (const item of data.education) {
      ensure(writer, 34);
      drawWrapped(
        writer,
        [item.qualification, item.fieldOfStudy].filter(Boolean).join(", ") ||
          item.institution,
        { font: bold, ensureSpace: false },
      );
      if (item.qualification || item.fieldOfStudy) {
        drawWrapped(writer, item.institution, { ensureSpace: false });
      }
      drawWrapped(
        writer,
        [item.startDate, item.endDate].filter(Boolean).join(" - "),
        {
          size: 7,
          color: rgb(0.35, 0.35, 0.35),
          gapAfter: 2,
          ensureSpace: false,
        },
      );
      if (item.description) {
        drawWrapped(writer, item.description, {
          gapAfter: compact ? 5 : 8,
          ensureSpace: false,
        });
      }
    }
  }

  function drawSkills(writer: Writer) {
    section(writer, "Skills", 30);
    drawWrapped(writer, flatCvSkillsText(data.skills), {
      gapAfter: compact ? 4 : 6,
    });
  }

  if (canUseBottomColumns) {
    const bottomHeight = Math.max(
      educationHeight(educationWidth),
      skillsHeight(skillsWidth),
    );
    ensure(content, bottomHeight);
    const educationWriter: Writer = {
      x: content.x,
      width: educationWidth,
      pageIndex: content.pageIndex,
      y: content.y,
    };
    const skillsWriter: Writer = {
      x: content.x + educationWidth + bottomGap,
      width: skillsWidth,
      pageIndex: content.pageIndex,
      y: content.y,
    };
    drawEducation(educationWriter);
    drawSkills(skillsWriter);
    content.pageIndex = Math.max(educationWriter.pageIndex, skillsWriter.pageIndex);
    content.y = Math.min(educationWriter.y, skillsWriter.y);
  } else {
    if (data.education.length) drawEducation(content);
    if (data.skills.length) drawSkills(content);
  }

  if (data.certifications.length) {
    section(content, "Certifications", 24);
    for (const item of data.certifications) {
      drawWrapped(content, [item.name, item.issuer].filter(Boolean).join(" - "), {
        gapAfter: 2,
      });
    }
  }

  if (data.languages.length) {
    section(content, "Languages", 20);
    drawWrapped(
      content,
      data.languages
        .map((item) =>
          [item.name, item.proficiency].filter(Boolean).join(" - "),
        )
        .join(", "),
    );
  }

  for (let index = 0; index < pages.length; index += 1) {
    if (index === 0) continue;
    pages[index].drawText(pdfSafeText(`${data.profile.fullName} | ${data.version.headline}`), {
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
  return buildCvPdfFilename(versionName, fullName);
}
