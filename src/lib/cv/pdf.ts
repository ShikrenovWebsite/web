import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { CvDocumentData } from "@/lib/cv/document";

const A4 = { width: 595.28, height: 841.89 };
const margin = 48;
const contentWidth = A4.width - margin * 2;

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

  const paragraphs = text.split(/\r?\n/);
  return paragraphs.flatMap((paragraph, paragraphIndex) => {
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
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${data.profile.fullName} - ${data.version.name}`);
  pdf.setAuthor(data.profile.fullName);
  pdf.setSubject("Curriculum Vitae");
  pdf.setCreator("Portfolio CV Builder");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - margin;

  function newPage() {
    page = pdf.addPage([A4.width, A4.height]);
    y = A4.height - margin;
  }

  function ensure(height: number) {
    if (y - height < margin) newPage();
  }

  function lines(
    value: string,
    options: {
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      gapAfter?: number;
    } = {},
  ) {
    const font = options.font ?? regular;
    const size = options.size ?? 9.5;
    const indent = options.indent ?? 0;
    const lineHeight = size * 1.35;
    const wrapped = wrap(value, font, size, contentWidth - indent);
    ensure(Math.max(lineHeight, wrapped.length * lineHeight));
    for (const line of wrapped) {
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font,
        color: options.color ?? rgb(0.12, 0.12, 0.12),
      });
      y -= lineHeight;
    }
    y -= options.gapAfter ?? 0;
  }

  function section(title: string, firstItemHeight = 38) {
    ensure(38 + firstItemHeight);
    y -= 8;
    lines(title.toUpperCase(), { font: bold, size: 10, gapAfter: 3 });
    page.drawLine({
      start: { x: margin, y: y + 2 },
      end: { x: A4.width - margin, y: y + 2 },
      thickness: 0.7,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 13;
  }

  function bullets(values: string[]) {
    for (const value of values) {
      const wrapped = wrap(value, regular, 9.25, contentWidth - 14);
      ensure(wrapped.length * 12.5 + 2);
      page.drawText("-", { x: margin + 2, y, size: 9.25, font: regular });
      for (const line of wrapped) {
        page.drawText(line, {
          x: margin + 14,
          y,
          size: 9.25,
          font: regular,
          color: rgb(0.12, 0.12, 0.12),
        });
        y -= 12.5;
      }
      y -= 1;
    }
  }

  lines(data.profile.fullName || "Curriculum Vitae", {
    font: bold,
    size: 22,
    gapAfter: 2,
  });
  if (data.version.headline) {
    lines(data.version.headline, {
      size: 11,
      color: rgb(0.25, 0.25, 0.25),
      gapAfter: 5,
    });
  }
  const contact = [
    data.profile.email,
    data.profile.phone,
    data.profile.location,
    data.profile.website,
    ...data.profile.links,
  ].filter(Boolean);
  if (contact.length) lines(contact.join(" | "), { size: 8.5, gapAfter: 7 });
  if (data.version.summary) lines(data.version.summary, { gapAfter: 4 });

  for (const sectionName of data.version.sectionOrder) {
    if (sectionName === "experience" && data.experience.length) {
      section("Experience", 52);
      for (const item of data.experience) {
        ensure(52);
        lines(`${item.role} - ${item.company}`, { font: bold, size: 10.5 });
        lines(
          [item.location, [item.startDate, item.endDate].filter(Boolean).join(" - ")]
            .filter(Boolean)
            .join(" | "),
          { size: 8.5, color: rgb(0.35, 0.35, 0.35), gapAfter: 2 },
        );
        if (item.description) lines(item.description, { gapAfter: 2 });
        bullets(item.highlights);
        y -= 5;
      }
    } else if (sectionName === "projects" && data.projects.length) {
      section("Projects", 48);
      for (const item of data.projects) {
        ensure(48);
        lines(item.title, { font: bold, size: 10.5 });
        if (item.shortDescription) lines(item.shortDescription);
        if (item.longDescription) lines(item.longDescription);
        if (item.technologies.length) {
          lines(`Technologies: ${item.technologies.join(", ")}`, {
            size: 8.75,
            gapAfter: 2,
          });
        }
        bullets(item.highlights);
        const links = [item.liveUrl, item.sourceCodeUrl].filter(Boolean);
        if (links.length) lines(links.join(" | "), { size: 8 });
        y -= 5;
      }
    } else if (sectionName === "education" && data.education.length) {
      section("Education", 42);
      for (const item of data.education) {
        ensure(42);
        lines(
          [item.qualification, item.fieldOfStudy].filter(Boolean).join(", ") ||
            item.institution,
          { font: bold, size: 10.5 },
        );
        if (item.qualification || item.fieldOfStudy) {
          lines(item.institution, { size: 9.5 });
        }
        lines([item.startDate, item.endDate].filter(Boolean).join(" - "), {
          size: 8.5,
          color: rgb(0.35, 0.35, 0.35),
        });
        if (item.description) lines(item.description);
        y -= 5;
      }
    } else if (sectionName === "skills" && data.skills.length) {
      section("Skills");
      const categories = new Map<string, typeof data.skills>();
      for (const skill of data.skills) {
        const category = skill.category || "Skills";
        categories.set(category, [...(categories.get(category) ?? []), skill]);
      }
      for (const [category, skills] of categories) {
        lines(`${category}: ${skills.map((skill) => skill.name).join(", ")}`, {
          size: 9.25,
          gapAfter: 2,
        });
      }
    } else if (
      sectionName === "certifications" &&
      data.certifications.length
    ) {
      section("Certifications");
      for (const item of data.certifications) {
        lines([item.name, item.issuer].filter(Boolean).join(" - "));
      }
    } else if (sectionName === "languages" && data.languages.length) {
      section("Languages");
      lines(
        data.languages
          .map((item) =>
            [item.name, item.proficiency].filter(Boolean).join(" - "),
          )
          .join(", "),
      );
    }
  }

  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false }));
  return { bytes, pageCount: pdf.getPageCount() };
}

export function cvFilename(fullName: string, versionName: string) {
  const slug = `${fullName}-${versionName}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "portfolio"}-cv.pdf`;
}
