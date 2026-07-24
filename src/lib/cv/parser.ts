import {
  cvStructuredDraftSchema,
  type CvStructuredDraft,
} from "@/lib/cv/schema";
import { skillPresentation } from "@/lib/skills/normalize";

export const CV_PARSER_VERSION = "deterministic-1";

const sectionAliases: Record<string, keyof CvStructuredDraft | "summary"> = {
  summary: "summary",
  profile: "summary",
  "professional summary": "summary",
  "work experience": "experience",
  experience: "experience",
  employment: "experience",
  education: "education",
  projects: "projects",
  "selected projects": "projects",
  skills: "skills",
  technologies: "skills",
  "technical skills": "skills",
  certifications: "certifications",
  certificates: "certifications",
  languages: "languages",
  courses: "courses",
  awards: "awards",
  volunteering: "volunteering",
  publications: "publications",
  interests: "interests",
};

function cleanLine(value: string) {
  return value.replace(/^[•·▪◦*-]\s*/, "").trim();
}

function sectionedLines(text: string) {
  const result = new Map<string, string[]>();
  let section = "header";
  result.set(section, []);
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const alias = sectionAliases[line.toLowerCase().replace(/:$/, "")];
    if (alias) {
      section = alias;
      if (!result.has(section)) result.set(section, []);
      continue;
    }
    result.get(section)?.push(raw);
  }
  return result;
}

function blocks(lines: string[]) {
  return lines
    .join("\n")
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((block) => block.length);
}

function dateRange(lines: string[]) {
  const joined = lines.join(" ");
  const match = joined.match(
    /((?:19|20)\d{2}(?:-\d{2})?)\s*(?:-|–|—|to)\s*(present|current|(?:19|20)\d{2}(?:-\d{2})?)/i,
  );
  return {
    startDate: match?.[1] ?? "",
    endDate:
      match?.[2] && !/present|current/i.test(match[2]) ? match[2] : "",
    isCurrent: Boolean(match?.[2] && /present|current/i.test(match[2])),
  };
}

function splitHeading(value: string) {
  const parts = value
    .split(/\s+(?:at|\||@|—|–)\s+|\s+-\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : [value.trim(), ""];
}

function urls(text: string) {
  return [
    ...text.matchAll(/https?:\/\/[^\s<>()]+/gi),
  ].map((match) => match[0].replace(/[),.;]+$/, ""));
}

export function parseCvText(text: string) {
  const sections = sectionedLines(text);
  const header = (sections.get("header") ?? [])
    .map(cleanLine)
    .filter(Boolean);
  const allUrls = urls(text);
  const email = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "";
  const phone =
    text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/)?.[0] ??
    "";
  const github = allUrls.find((url) => /github\.com/i.test(url)) ?? "";
  const linkedin = allUrls.find((url) => /linkedin\.com/i.test(url)) ?? "";
  const website =
    allUrls.find((url) => !/github\.com|linkedin\.com/i.test(url)) ?? "";
  const summary = (sections.get("summary") ?? [])
    .map(cleanLine)
    .filter(Boolean)
    .join(" ");

  const experience = blocks(sections.get("experience") ?? []).flatMap(
    (block) => {
      if (!block[0]) return [];
      const cleaned = block.map(cleanLine);
      const [role, company] = splitHeading(cleaned[0]);
      if (!company) return [];
      const achievements = block
        .slice(1)
        .filter((line) => /^[•·▪◦*-]\s*/.test(line))
        .map(cleanLine);
      const dates = dateRange(cleaned);
      return [
        {
          company,
          role,
          employmentType: "",
          location: "",
          ...dates,
          description: cleaned
            .slice(1)
            .filter((line) => !achievements.includes(line))
            .join("\n"),
          achievements,
          technologies: [],
        },
      ];
    },
  );

  const education = blocks(sections.get("education") ?? []).flatMap((block) => {
    if (!block[0]) return [];
    const cleaned = block.map(cleanLine);
    const [degree, institution] = splitHeading(cleaned[0]);
    const dates = dateRange(cleaned);
    const achievements = block
      .slice(1)
      .filter((line) => /^[•·▪◦*-]\s*/.test(line))
      .map(cleanLine);
    return [
      {
        institution: institution || degree,
        degree: institution ? degree : "",
        fieldOfStudy: "",
        location: "",
        startDate: dates.startDate,
        endDate: dates.endDate,
        description: cleaned
          .slice(1)
          .filter((line) => !achievements.includes(line))
          .join("\n"),
        achievements,
      },
    ];
  });

  const projects = blocks(sections.get("projects") ?? []).flatMap((block) => {
    if (!block[0]) return [];
    const cleaned = block.map(cleanLine);
    const projectUrls = urls(cleaned.join(" "));
    const achievements = block
      .slice(1)
      .filter((line) => /^[•·▪◦*-]\s*/.test(line))
      .map(cleanLine);
    return [
      {
        title: cleaned[0],
        shortSummary: cleaned[1] ?? "",
        description: cleaned
          .slice(1)
          .filter((line) => !achievements.includes(line))
          .join("\n"),
        achievements,
        technologies: [],
        liveUrl:
          projectUrls.find((url) => !/github\.com/i.test(url)) ?? "",
        sourceUrl: projectUrls.find((url) => /github\.com/i.test(url)) ?? "",
        startDate: dateRange(cleaned).startDate,
        endDate: dateRange(cleaned).endDate,
      },
    ];
  });

  const skillNames = (sections.get("skills") ?? [])
    .flatMap((line) => cleanLine(line).split(/[,;|•·]/))
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 1 && skill.length <= 120);
  const skillByKey = new Map(
    skillNames.map((skill) => {
      const presentation = skillPresentation(skill);
      return [
        presentation.normalizedKey,
        {
          name: presentation.displayName,
          category: presentation.category,
          proficiency: "",
          sourceSection: "Skills",
        },
      ];
    }),
  );

  const draft = {
    profile: {
      fullName: header[0] ?? "",
      headline: header.find((line) => line !== header[0] && !line.includes("@")) ?? "",
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
    },
    experience,
    education,
    projects,
    skills: [...skillByKey.values()],
    certifications: blocks(sections.get("certifications") ?? []).map((block) => {
      const cleaned = block.map(cleanLine);
      return {
        name: cleaned[0],
        issuer: cleaned[1] ?? "",
        credentialUrl: urls(cleaned.join(" "))[0] ?? "",
        credentialId: "",
        issuedAt: dateRange(cleaned).startDate,
        expiresAt: dateRange(cleaned).endDate,
      };
    }),
    languages: (sections.get("languages") ?? [])
      .map(cleanLine)
      .filter(Boolean)
      .map((line) => {
        const [name, proficiency = ""] = line.split(/[-–—:|]/).map((part) => part.trim());
        return { name, proficiency };
      }),
    courses: (sections.get("courses") ?? []).map(cleanLine).filter(Boolean),
    awards: (sections.get("awards") ?? []).map(cleanLine).filter(Boolean),
    volunteering: (sections.get("volunteering") ?? []).map(cleanLine).filter(Boolean),
    publications: (sections.get("publications") ?? []).map(cleanLine).filter(Boolean),
    interests: (sections.get("interests") ?? []).map(cleanLine).filter(Boolean),
  };

  return cvStructuredDraftSchema.parse(draft);
}
