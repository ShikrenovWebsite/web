export const CV_REVIEW_SECTIONS = [
  "PROFILE",
  "CONTACT",
  "EXPERIENCE",
  "EDUCATION",
  "PROJECTS",
  "SKILLS",
] as const;

export type CvReviewSection = (typeof CV_REVIEW_SECTIONS)[number];

export type CvReviewResolution =
  | "CREATE_NEW"
  | "KEEP_EXISTING"
  | "REPLACE"
  | "MERGE"
  | "SKIP";

type ReviewableItem = {
  itemType: string;
  existingRecordId?: string | null;
  existingData?: unknown;
  importedData?: unknown;
  editedData?: unknown;
};

const SECTION_LABELS: Record<CvReviewSection, string> = {
  PROFILE: "Profile",
  CONTACT: "Contact",
  EXPERIENCE: "Experience",
  EDUCATION: "Education",
  PROJECTS: "Projects",
  SKILLS: "Skills",
};

export function cvReviewSectionLabel(section: CvReviewSection) {
  return SECTION_LABELS[section];
}

export function cvItemSection(itemType: string): CvReviewSection {
  if (itemType === "PROFILE") return "PROFILE";
  if (itemType === "EXPERIENCE") return "EXPERIENCE";
  if (itemType === "EDUCATION") return "EDUCATION";
  if (itemType === "PROJECT") return "PROJECTS";
  return "SKILLS";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function missing(data: Record<string, unknown>, field: string) {
  const value = data[field];
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim())
  );
}

export function requiredCvFields(
  itemType: string,
  value: unknown,
): string[] {
  const data = record(value);
  if (itemType === "PROFILE") {
    return [
      ...(missing(data, "fullName") ? ["Name"] : []),
      ...(missing(data, "headline") ? ["Headline"] : []),
      ...(missing(data, "email") ? ["Email"] : []),
    ];
  }
  if (itemType === "EXPERIENCE") {
    return [
      ...(missing(data, "company") ? ["Company"] : []),
      ...(missing(data, "role") ? ["Position"] : []),
      ...(missing(data, "startDate") ? ["Start date"] : []),
    ];
  }
  if (itemType === "EDUCATION") {
    return [
      ...(missing(data, "institution") ? ["Institution"] : []),
      ...(missing(data, "degree") ? ["Degree"] : []),
    ];
  }
  if (itemType === "PROJECT") {
    return missing(data, "title") ? ["Title"] : [];
  }
  if (["SKILL", "CERTIFICATION", "LANGUAGE"].includes(itemType)) {
    return missing(data, "name") ? ["Name"] : [];
  }
  return [];
}

export function requiredContactFields(value: unknown): string[] {
  const data = record(value);
  return missing(data, "email") ? ["Email"] : [];
}

export function suggestedBulkResolution(
  item: ReviewableItem,
): CvReviewResolution {
  return item.existingRecordId ? "MERGE" : "CREATE_NEW";
}

export function finalReviewData(item: ReviewableItem) {
  return item.editedData ?? item.importedData;
}

export function reviewDataForResolution(
  item: ReviewableItem,
  resolution: CvReviewResolution | null | undefined,
) {
  const imported = record(finalReviewData(item));
  if (resolution === "MERGE") {
    return { ...record(item.existingData), ...imported };
  }
  if (resolution === "KEEP_EXISTING") return record(item.existingData);
  return imported;
}

export function cvReviewChangeKind(input: {
  existingRecordId?: string | null;
  importedData: unknown;
  existingData?: unknown;
}) {
  if (!input.existingRecordId) return "NEW" as const;
  return JSON.stringify(input.importedData) === JSON.stringify(input.existingData)
    ? ("UNCHANGED" as const)
    : ("MODIFIED" as const);
}
