export type CvLayoutMode = "COMPACT_ONE_PAGE" | "STANDARD_TWO_PAGE";

export const DEFAULT_CV_LAYOUT: CvLayoutMode = "COMPACT_ONE_PAGE";

type SelectableRecord = { id: string; issues: string[] };

export function defaultCompactCvSelection(options: {
  experience: SelectableRecord[];
  projects: SelectableRecord[];
  education: SelectableRecord[];
  skills: SelectableRecord[];
  certifications: SelectableRecord[];
  languages: SelectableRecord[];
}) {
  const ready = (items: SelectableRecord[], limit: number) =>
    items
      .filter((item) => item.issues.length === 0)
      .slice(0, limit)
      .map((item) => item.id);

  return {
    experience: ready(options.experience, 2),
    projects: ready(options.projects, 2),
    education: ready(options.education, 1),
    skills: ready(options.skills, 14),
    certifications: ready(options.certifications, 2),
    languages: ready(options.languages, 2),
  };
}

export type CvFitInput = {
  summary: string;
  experience: Array<{ description: string; highlights: string[] }>;
  projects: Array<{
    shortDescription: string;
    longDescription: string;
    highlights: string[];
    technologies: string[];
  }>;
  education: Array<{ description: string }>;
  skills: Array<unknown>;
  certifications: Array<unknown>;
  languages: Array<unknown>;
};

export function estimateCompactCvFit(input: CvFitInput) {
  const characters =
    input.summary.length +
    input.experience.reduce(
      (total, item) =>
        total +
        item.description.length +
        item.highlights.join(" ").length,
      0,
    ) +
    input.projects.reduce(
      (total, item) =>
        total +
        item.shortDescription.length +
        item.longDescription.length +
        item.highlights.join(" ").length +
        item.technologies.join(" ").length,
      0,
    ) +
    input.education.reduce(
      (total, item) => total + item.description.length,
      0,
    );
  const structuralUnits =
    input.experience.length * 230 +
    input.projects.length * 210 +
    input.education.length * 100 +
    input.skills.length * 18 +
    input.certifications.length * 45 +
    input.languages.length * 25;
  const pressure = characters + structuralUnits;
  const likelyPages = pressure <= 4_100 ? 1 : Math.max(2, Math.ceil(pressure / 4_100));

  return {
    pressure,
    likelyPages,
    fitsOnePage: likelyPages === 1,
  };
}
