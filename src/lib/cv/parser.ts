import {
  cvStructuredDraftSchema,
  type CvStructuredDraft,
} from "@/lib/cv/schema";
import { skillPresentation } from "@/lib/skills/normalize";
import { detectTechnologies } from "@/lib/skills/technology-dictionary";

export const CV_PARSER_VERSION = "deterministic-3";

export type CvSourcePage = {
  pageNumber: number;
  text: string;
};

type SectionKey =
  | "header"
  | "summary"
  | "contact"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "courses"
  | "languages"
  | "awards"
  | "volunteering"
  | "publications"
  | "interests";

type SourceParagraph = {
  index: number;
  page: number;
  line: number;
  text: string;
};

export type CvDetectedSection = {
  key: SectionKey;
  heading: string;
  headingPage: number;
  startParagraph: number;
  endParagraph: number;
  paragraphs: SourceParagraph[];
};

export type CvParsedItemMetadata = {
  itemType:
    | "PROFILE"
    | "EXPERIENCE"
    | "EDUCATION"
    | "PROJECT"
    | "SKILL"
    | "CERTIFICATION"
    | "LANGUAGE";
  itemIndex: number;
  sourcePage: number;
  sourceSection: string;
  startParagraph: number;
  endParagraph: number;
  sourceText: string;
  confidence: number;
  warnings: string[];
};

export type CvParseDiagnostics = {
  pageCount: number;
  extractedCharacterCount: number;
  detectedHeadings: Array<{
    heading: string;
    section: string;
    page: number;
    paragraph: number;
  }>;
  sectionRanges: Array<{
    section: string;
    heading: string;
    page: number;
    startParagraph: number;
    endParagraph: number;
    characterCount: number;
  }>;
  parsedItemCounts: Record<string, number>;
  unclassifiedCount: number;
  truncated: boolean;
  warnings: string[];
};

export type CvParseResult = {
  draft: CvStructuredDraft;
  itemMetadata: CvParsedItemMetadata[];
  diagnostics: CvParseDiagnostics;
};

const sectionAliases: Record<string, SectionKey> = {
  summary: "summary",
  profile: "summary",
  "professional summary": "summary",
  "career summary": "summary",
  "about me": "summary",
  about: "summary",
  contact: "contact",
  "contact details": "contact",
  experience: "experience",
  "work experience": "experience",
  employment: "experience",
  "professional experience": "experience",
  "employment history": "experience",
  "career history": "experience",
  "work history": "experience",
  "professional history": "experience",
  education: "education",
  "academic background": "education",
  "academic history": "education",
  qualifications: "education",
  training: "education",
  projects: "projects",
  "personal projects": "projects",
  "selected projects": "projects",
  "selected work": "projects",
  portfolio: "projects",
  skills: "skills",
  "technical skills": "skills",
  technologies: "skills",
  technology: "skills",
  "tech stack": "skills",
  tools: "skills",
  expertise: "skills",
  competencies: "skills",
  "core competencies": "skills",
  "key skills": "skills",
  certifications: "certifications",
  certification: "certifications",
  certificates: "certifications",
  licenses: "certifications",
  courses: "courses",
  languages: "languages",
  awards: "awards",
  honors: "awards",
  volunteering: "volunteering",
  publications: "publications",
  interests: "interests",
};

const roleEvidence =
  /\b(engineer|developer|architect|manager|director|lead|consultant|designer|analyst|specialist|administrator|founder|officer|intern|freelancer|contractor|programmer|researcher|technician|coordinator|associate|head|owner|executive|assistant|representative|trainer|coach|teacher|accountant|recruiter|support|product|project|marketing|sales|operations|quality|scrum)\b/i;
const institutionEvidence =
  /\b(university|college|school|academy|institute|polytechnic|faculty|conservatory)\b/i;
const degreeEvidence =
  /\b(bachelor|master|doctor|phd|bsc|msc|mba|degree|diploma|qualification|certificate|major|minor|computer science|engineering)\b/i;
const bulletPattern = /^[•·▪◦*-]\s*/;

function cleanLine(value: string) {
  return value.replace(bulletPattern, "").trim();
}

function normalizedHeading(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[#>|]+|[:|]+$/g, "")
    .replace(/\s+/g, " ");
}

function headingForLine(value: string) {
  for (const cell of value.split("\t")) {
    const normalized = normalizedHeading(cell);
    const section = sectionAliases[normalized];
    if (section) return { section, heading: normalized };
  }
  return null;
}

function paragraphsForPages(pages: CvSourcePage[]) {
  let index = 0;
  return pages.flatMap((page) =>
    page.text.split(/\r?\n/).flatMap((raw, line) => {
      const text = raw.trim();
      if (!text) return [];
      return [{ index: index++, page: page.pageNumber, line: line + 1, text }];
    }),
  );
}

export function detectCvSections(pages: CvSourcePage[]) {
  const paragraphs = paragraphsForPages(pages);
  const sections: CvDetectedSection[] = [];
  let current: CvDetectedSection = {
    key: "header",
    heading: "Header",
    headingPage: pages[0]?.pageNumber ?? 1,
    startParagraph: paragraphs[0]?.index ?? 0,
    endParagraph: paragraphs[0]?.index ?? 0,
    paragraphs: [],
  };

  for (const paragraph of paragraphs) {
    const heading = headingForLine(paragraph.text);
    if (heading) {
      current.endParagraph =
        current.paragraphs.at(-1)?.index ?? Math.max(0, paragraph.index - 1);
      sections.push(current);
      current = {
        key: heading.section,
        heading: heading.heading,
        headingPage: paragraph.page,
        startParagraph: paragraph.index + 1,
        endParagraph: paragraph.index,
        paragraphs: [],
      };
      continue;
    }
    current.paragraphs.push(paragraph);
  }
  current.endParagraph =
    current.paragraphs.at(-1)?.index ?? current.startParagraph;
  sections.push(current);
  return sections.filter(
    (section, index) => index === 0 || section.paragraphs.length > 0,
  );
}

function urls(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s<>()]+/gi)].map((match) =>
    match[0].replace(/[),.;]+$/, ""),
  );
}

const months: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function normalizedDate(value: string) {
  const year = value.match(/(?:19|20)\d{2}/)?.[0] ?? "";
  const monthName = value.toLowerCase().match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/,
  )?.[1];
  const numericMonth = value.match(
    /(?:^|\D)(?:(0?[1-9]|1[0-2])[./-](?:19|20)\d{2}|(?:19|20)\d{2}[./-](0?[1-9]|1[0-2]))(?:\D|$)/,
  );
  const month = monthName
    ? months[monthName.slice(0, 3)]
    : (numericMonth?.[1] ?? numericMonth?.[2])?.padStart(2, "0");
  return year && month ? `${year}-${month}` : year;
}

function dateRange(lines: string[]) {
  const joined = lines.join(" ");
  const dateToken =
    "(?:(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\\s./-]+)?(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])[./-](?:19|20)\\d{2}|(?:19|20)\\d{2}[./-](?:0?[1-9]|1[0-2]))";
  const range = joined.match(
    new RegExp(
      `(${dateToken})\\s*(?:-|–|—|to)\\s*(present|current|now|${dateToken})`,
      "i",
    ),
  );
  return {
    startDate: range?.[1] ? normalizedDate(range[1]) : "",
    endDate:
      range?.[2] && !/present|current|now/i.test(range[2])
        ? normalizedDate(range[2])
        : "",
    isCurrent: Boolean(
      range?.[2] && /present|current|now/i.test(range[2]),
    ),
  };
}

function isDateRange(value: string) {
  const range = dateRange([value]);
  return Boolean(range.startDate || range.endDate || range.isCurrent);
}

function splitCombinedHeading(value: string) {
  const parts = value
    .split(/\s+(?:at|@)\s+|\s+\|\s+|\s+[—–]\s+|\s+-\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const roleIndex = parts.findIndex((part) => roleEvidence.test(part));
  if (roleIndex < 0) return null;
  return {
    role: parts[roleIndex],
    company: parts.find((_, index) => index !== roleIndex) ?? "",
  };
}

function sourceMetadata(
  itemType: CvParsedItemMetadata["itemType"],
  itemIndex: number,
  section: CvDetectedSection,
  source: SourceParagraph[],
  confidence: number,
  warnings: string[],
): CvParsedItemMetadata {
  return {
    itemType,
    itemIndex,
    sourcePage: source[0]?.page ?? section.headingPage,
    sourceSection: section.key,
    startParagraph: source[0]?.index ?? section.startParagraph,
    endParagraph: source.at(-1)?.index ?? section.endParagraph,
    sourceText: source.map((paragraph) => paragraph.text).join("\n"),
    confidence,
    warnings,
  };
}

function segmentsAroundDates(section: CvDetectedSection) {
  const lines = section.paragraphs;
  const dates = lines.flatMap((line, index) =>
    isDateRange(line.text) ? [index] : [],
  );
  if (!dates.length) return lines.length ? [lines] : [];
  const starts = dates.map((dateIndex, index) => {
    const floor = index ? dates[index - 1] + 1 : 0;
    const windowStart = Math.max(floor, dateIndex - 4);
    const roleOffset = lines
      .slice(windowStart, dateIndex)
      .findIndex((line) => roleEvidence.test(cleanLine(line.text)));
    return roleOffset >= 0 ? windowStart + roleOffset : windowStart;
  });
  return starts.map((start, index) =>
    lines.slice(start, starts[index + 1] ?? lines.length),
  );
}

function experienceFromSections(
  sections: CvDetectedSection[],
  metadata: CvParsedItemMetadata[],
  unclassified: CvStructuredDraft["unclassified"],
) {
  const experience: CvStructuredDraft["experience"] = [];
  for (const section of sections.filter(
    (item) => item.key === "experience" || item.key === "education",
  )) {
    for (const segment of segmentsAroundDates(section)) {
      const cleanedSegment = segment.map((line) => cleanLine(line.text));
      const recoveredFromEducation =
        section.key === "education" &&
        cleanedSegment.some((line) => roleEvidence.test(line)) &&
        !cleanedSegment.some(
          (line) =>
            institutionEvidence.test(line) || degreeEvidence.test(line),
        );
      if (section.key === "education" && !recoveredFromEducation) continue;
      const dateIndex = segment.findIndex((line) => isDateRange(line.text));
      const headingLines = segment
        .slice(0, dateIndex >= 0 ? dateIndex : Math.min(2, segment.length))
        .map((line) => cleanLine(line.text))
        .filter(Boolean);
      const combined = headingLines[0]
        ? splitCombinedHeading(headingLines[0])
        : null;
      const roleLine = headingLines.find((line) => roleEvidence.test(line));
      const companyLine = headingLines.find((line) => line !== roleLine);
      const role = combined?.role ?? roleLine ?? "";
      const company = combined?.company ?? companyLine ?? "";
      if (!role || !company) {
        if (segment.length) {
          unclassified.push({
            text: segment.map((line) => line.text).join("\n"),
            sourcePage: segment[0].page,
            sourceSection: section.key,
            startParagraph: segment[0].index,
            endParagraph: segment.at(-1)?.index ?? segment[0].index,
            reason:
              "The Experience section did not contain enough role and company evidence for a safe classification.",
          });
        }
        continue;
      }
      const achievements = segment
        .filter((line) => bulletPattern.test(line.text))
        .map((line) => cleanLine(line.text));
      const body = segment
        .slice(dateIndex >= 0 ? dateIndex + 1 : headingLines.length)
        .filter((line) => !bulletPattern.test(line.text))
        .map((line) => cleanLine(line.text))
        .filter(Boolean);
      const dates = dateRange(segment.map((line) => line.text));
      const warnings = [
        ...(dates.startDate
          ? []
          : ["No explicit employment date range was detected."]),
        ...(recoveredFromEducation
          ? [
              "Recovered from an Education-labelled range because the PDF two-column reading order placed a role/company/date block there; review this classification.",
            ]
          : []),
      ];
      experience.push({
        company,
        role,
        employmentType: "",
        location: "",
        ...dates,
        description: body.join("\n"),
        achievements,
        technologies: [],
      });
      metadata.push(
        sourceMetadata(
          "EXPERIENCE",
          experience.length - 1,
          section,
          segment,
          recoveredFromEducation
            ? dates.startDate
              ? 0.72
              : 0.62
            : dates.startDate
              ? 0.92
              : 0.78,
          warnings,
        ),
      );
    }
  }
  return experience;
}

function educationFromSections(
  sections: CvDetectedSection[],
  metadata: CvParsedItemMetadata[],
  unclassified: CvStructuredDraft["unclassified"],
) {
  const education: CvStructuredDraft["education"] = [];
  for (const section of sections.filter(
    (item) => item.key === "education" || item.key === "header",
  )) {
    for (const segment of segmentsAroundDates(section)) {
      const cleaned = segment.map((line) => cleanLine(line.text));
      const institution = cleaned.find((line) => institutionEvidence.test(line));
      const degree = cleaned.find((line) => degreeEvidence.test(line)) ?? "";
      const detectedTechnologies = detectTechnologies(cleaned.join("\n"));
      const looksLikeTechnologyList =
        detectedTechnologies.length >= 2 &&
        !institution &&
        cleaned.some((line) => /[,;|•·]/.test(line));
      const recoveredFromHeader =
        section.key === "header" && Boolean(institution || degree);
      if (section.key === "header" && !recoveredFromHeader) continue;
      if (looksLikeTechnologyList) {
        if (segment.length) {
          unclassified.push({
            text: segment.map((line) => line.text).join("\n"),
            sourcePage: segment[0].page,
            sourceSection: section.key,
            startParagraph: segment[0].index,
            endParagraph: segment.at(-1)?.index ?? segment[0].index,
            reason:
              "This range is a technology list, not an academic record. Technologies were staged separately as skill suggestions.",
          });
        }
        continue;
      }
      if (!institution && !degree) {
        if (cleaned.some((line) => roleEvidence.test(line))) continue;
        if (segment.length) {
          unclassified.push({
            text: segment.map((line) => line.text).join("\n"),
            sourcePage: segment[0].page,
            sourceSection: section.key,
            startParagraph: segment[0].index,
            endParagraph: segment.at(-1)?.index ?? segment[0].index,
            reason:
              "The Education section lacked university, school, degree, qualification, or academic evidence.",
          });
        }
        continue;
      }
      const dates = dateRange(cleaned);
      const achievements = segment
        .filter((line) => bulletPattern.test(line.text))
        .map((line) => cleanLine(line.text));
      const headingValues = new Set([institution, degree].filter(Boolean));
      const body = cleaned.filter(
        (line) =>
          line &&
          !headingValues.has(line) &&
          !isDateRange(line) &&
          !achievements.includes(line),
      );
      const warnings = [
        ...(institution
          ? []
          : ["A degree was detected, but the institution was uncertain."]),
        ...(recoveredFromHeader
          ? [
              "Recovered from the pre-heading range because the PDF two-column reading order placed academic content before its visual Education heading; review this classification.",
            ]
          : []),
      ];
      education.push({
        institution: institution ?? degree,
        degree: institution ? degree : "",
        fieldOfStudy: "",
        location: "",
        startDate: dates.startDate,
        endDate: dates.endDate,
        description: body.join("\n"),
        achievements,
      });
      metadata.push(
        sourceMetadata(
          "EDUCATION",
          education.length - 1,
          section,
          segment,
          recoveredFromHeader
            ? institution && degree
              ? 0.74
              : 0.65
            : institution && degree
              ? 0.93
              : 0.72,
          warnings,
        ),
      );
    }
  }
  return education;
}

function simpleSectionLines(sections: CvDetectedSection[], key: SectionKey) {
  return sections
    .filter((section) => section.key === key)
    .flatMap((section) => section.paragraphs);
}

function retainUnclassifiedGaps(
  sections: CvDetectedSection[],
  metadata: CvParsedItemMetadata[],
  unclassified: CvStructuredDraft["unclassified"],
) {
  const scalarSections = new Set<SectionKey>([
    "header",
    "summary",
    "contact",
    "courses",
    "awards",
    "volunteering",
    "publications",
    "interests",
  ]);
  const covered = new Set<number>();
  for (const item of metadata) {
    for (
      let paragraph = item.startParagraph;
      paragraph <= item.endParagraph;
      paragraph++
    ) {
      covered.add(paragraph);
    }
  }
  for (const item of unclassified) {
    for (
      let paragraph = item.startParagraph;
      paragraph <= item.endParagraph;
      paragraph++
    ) {
      covered.add(paragraph);
    }
  }
  for (const section of sections) {
    if (scalarSections.has(section.key)) continue;
    let gap: SourceParagraph[] = [];
    const flush = () => {
      if (!gap.length) return;
      unclassified.push({
        text: gap.map((paragraph) => paragraph.text).join("\n"),
        sourcePage: gap[0].page,
        sourceSection: section.key,
        startParagraph: gap[0].index,
        endParagraph: gap.at(-1)?.index ?? gap[0].index,
        reason:
          "This source range did not form a safely classified record and was retained for manual review.",
      });
      gap = [];
    };
    for (const paragraph of section.paragraphs) {
      if (covered.has(paragraph.index)) {
        flush();
      } else {
        gap.push(paragraph);
      }
    }
    flush();
  }
}

export function parseCvDocument(input: {
  pages: CvSourcePage[];
  truncated?: boolean;
  extractionWarnings?: string[];
}): CvParseResult {
  const pages = input.pages.map((page) => ({
    pageNumber: page.pageNumber,
    text: page.text.replace(/\u0000/g, "").trim(),
  }));
  const completeText = pages.map((page) => page.text).join("\n");
  const sections = detectCvSections(pages);
  const headerSection = sections[0];
  const header = headerSection?.paragraphs.map((line) => cleanLine(line.text)) ?? [];
  const allUrls = urls(completeText);
  const email =
    completeText.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "";
  const phone =
    completeText.match(
      /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/,
    )?.[0] ?? "";
  const github = allUrls.find((url) => /github\.com/i.test(url)) ?? "";
  const linkedin = allUrls.find((url) => /linkedin\.com/i.test(url)) ?? "";
  const website =
    allUrls.find((url) => !/github\.com|linkedin\.com/i.test(url)) ?? "";
  const summary = simpleSectionLines(sections, "summary")
    .map((line) => cleanLine(line.text))
    .join(" ");
  const profile = {
    fullName: header[0] ?? "",
    headline:
      header.find(
        (line) =>
          line !== header[0] &&
          !line.includes("@") &&
          !urls(line).length &&
          !isDateRange(line),
      ) ?? "",
    summary,
    location: "",
    email,
    phone,
    website,
    github,
    linkedin,
    otherLinks: allUrls
      .filter((url) => ![website, github, linkedin].includes(url))
      .map((url) => ({ label: "Link", url })),
  };

  const itemMetadata: CvParsedItemMetadata[] = [];
  if (headerSection) {
    itemMetadata.push(
      sourceMetadata(
        "PROFILE",
        0,
        headerSection,
        headerSection.paragraphs,
        profile.fullName ? 0.85 : 0.55,
        profile.fullName ? [] : ["The full name could not be identified safely."],
      ),
    );
  }
  const unclassified: CvStructuredDraft["unclassified"] = [];
  if (
    sections.length === 1 &&
    headerSection &&
    headerSection.paragraphs.length > 3
  ) {
    const uncertain = headerSection.paragraphs.slice(2);
    unclassified.push({
      text: uncertain.map((line) => line.text).join("\n"),
      sourcePage: uncertain[0]?.page ?? headerSection.headingPage,
      sourceSection: "unclassified",
      startParagraph:
        uncertain[0]?.index ?? headerSection.startParagraph,
      endParagraph:
        uncertain.at(-1)?.index ?? headerSection.endParagraph,
      reason:
        "No recognized section headings were found; this content was retained for manual classification.",
    });
  }
  const experience = experienceFromSections(
    sections,
    itemMetadata,
    unclassified,
  );
  const education = educationFromSections(
    sections,
    itemMetadata,
    unclassified,
  );

  const projects: CvStructuredDraft["projects"] = [];
  for (const section of sections.filter((item) => item.key === "projects")) {
    const source = section.paragraphs;
    if (!source.length) continue;
    const cleaned = source.map((line) => cleanLine(line.text));
    const title = cleaned[0];
    const projectUrls = urls(cleaned.join(" "));
    const achievements = source
      .filter((line) => bulletPattern.test(line.text))
      .map((line) => cleanLine(line.text));
    projects.push({
      title,
      shortSummary: cleaned.find((line) => line !== title && !urls(line).length) ?? "",
      description: cleaned.slice(1).filter((line) => !achievements.includes(line)).join("\n"),
      achievements,
      technologies: [],
      liveUrl: projectUrls.find((url) => !/github\.com/i.test(url)) ?? "",
      sourceUrl: projectUrls.find((url) => /github\.com/i.test(url)) ?? "",
      ...dateRange(cleaned),
    });
    itemMetadata.push(
      sourceMetadata(
        "PROJECT",
        projects.length - 1,
        section,
        source,
        projectUrls.length || achievements.length ? 0.78 : 0.62,
        projectUrls.length || achievements.length
          ? []
          : ["Project boundaries are approximate; review this proposal."],
      ),
    );
  }

  const skillByKey = new Map<
    string,
    { item: CvStructuredDraft["skills"][number]; source: SourceParagraph }
  >();
  for (const source of simpleSectionLines(sections, "skills")) {
    for (const value of source.text.split(/[,;|•·\t]/)) {
      const skill = cleanLine(value);
      if (skill.length <= 1 || skill.length > 120) continue;
      const presentation = skillPresentation(skill.replace(/^[^:]+:\s*/, ""));
      if (!presentation.normalizedKey) continue;
      skillByKey.set(presentation.normalizedKey, {
        item: {
          name: presentation.displayName,
          category: presentation.category,
          proficiency: "",
          sourceSection: "Skills",
        },
        source,
      });
    }
  }
  const skills = [...skillByKey.values()].map((entry, index) => {
    const section =
      sections.find(
        (candidate) =>
          candidate.key === "skills" &&
          candidate.paragraphs.some(
            (paragraph) => paragraph.index === entry.source.index,
          ),
      ) ?? sections.find((candidate) => candidate.key === "skills")!;
    itemMetadata.push(
      sourceMetadata("SKILL", index, section, [entry.source], 0.9, []),
    );
    return entry.item;
  });

  const certifications = simpleSectionLines(sections, "certifications").map(
    (source, index) => {
      const section = sections.find(
        (candidate) =>
          candidate.key === "certifications" &&
          candidate.paragraphs.some(
            (paragraph) => paragraph.index === source.index,
          ),
      )!;
      itemMetadata.push(
        sourceMetadata("CERTIFICATION", index, section, [source], 0.72, [
          "Certification field boundaries should be reviewed.",
        ]),
      );
      return {
        name: cleanLine(source.text),
        issuer: "",
        credentialUrl: urls(source.text)[0] ?? "",
        credentialId: "",
        issuedAt: dateRange([source.text]).startDate,
        expiresAt: dateRange([source.text]).endDate,
      };
    },
  );
  const languages = simpleSectionLines(sections, "languages").flatMap(
    (source) =>
      source.text.split(/[,;|•·\t]/).flatMap((value) => {
        const [name, proficiency = ""] = cleanLine(value)
          .split(/[-–—:]/)
          .map((part) => part.trim());
        return name ? [{ name, proficiency, source }] : [];
      }),
  );
  const languageItems = languages.map(({ source, ...item }, index) => {
    const section = sections.find(
      (candidate) =>
        candidate.key === "languages" &&
        candidate.paragraphs.some(
          (paragraph) => paragraph.index === source.index,
        ),
    )!;
    itemMetadata.push(
      sourceMetadata("LANGUAGE", index, section, [source], 0.88, []),
    );
    return item;
  });
  retainUnclassifiedGaps(sections, itemMetadata, unclassified);

  const draft = cvStructuredDraftSchema.parse({
    profile,
    experience,
    education,
    projects,
    skills,
    certifications,
    languages: languageItems,
    courses: simpleSectionLines(sections, "courses").map((line) =>
      cleanLine(line.text),
    ),
    awards: simpleSectionLines(sections, "awards").map((line) =>
      cleanLine(line.text),
    ),
    volunteering: simpleSectionLines(sections, "volunteering").map((line) =>
      cleanLine(line.text),
    ),
    publications: simpleSectionLines(sections, "publications").map((line) =>
      cleanLine(line.text),
    ),
    interests: simpleSectionLines(sections, "interests").map((line) =>
      cleanLine(line.text),
    ),
    unclassified,
  });
  const diagnostics: CvParseDiagnostics = {
    pageCount: pages.length,
    extractedCharacterCount: pages.reduce(
      (total, page) => total + page.text.length,
      0,
    ),
    detectedHeadings: sections.slice(1).map((section) => ({
      heading: section.heading,
      section: section.key,
      page: section.headingPage,
      paragraph: Math.max(0, section.startParagraph - 1),
    })),
    sectionRanges: sections.map((section) => ({
      section: section.key,
      heading: section.heading,
      page: section.headingPage,
      startParagraph: section.startParagraph,
      endParagraph: section.endParagraph,
      characterCount: section.paragraphs.reduce(
        (total, paragraph) => total + paragraph.text.length,
        0,
      ),
    })),
    parsedItemCounts: {
      profile: profile.fullName || profile.email ? 1 : 0,
      experience: experience.length,
      education: education.length,
      projects: projects.length,
      skills: skills.length,
      certifications: certifications.length,
      languages: languageItems.length,
    },
    unclassifiedCount: unclassified.length,
    truncated: Boolean(input.truncated),
    warnings: [
      ...(input.extractionWarnings ?? []),
      ...(input.truncated
        ? ["The extraction reached a processing limit and may be incomplete."]
        : []),
    ],
  };
  return { draft, itemMetadata, diagnostics };
}

export function parseCvText(text: string) {
  return parseCvDocument({
    pages: [{ pageNumber: 1, text }],
  }).draft;
}
