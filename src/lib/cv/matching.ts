import { normalizeSkillKey } from "@/lib/skills/normalize";

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function datesOverlap(
  leftStart: string | null | undefined,
  leftEnd: string | null | undefined,
  rightStart: string | null | undefined,
  rightEnd: string | null | undefined,
) {
  if (!leftStart || !rightStart) return true;
  const leftStartTime = Date.parse(leftStart);
  const leftEndTime = Date.parse(leftEnd || "9999-12-31");
  const rightStartTime = Date.parse(rightStart);
  const rightEndTime = Date.parse(rightEnd || "9999-12-31");
  return leftStartTime <= rightEndTime && rightStartTime <= leftEndTime;
}

export function experienceMatchScore(
  incoming: {
    company: string;
    role: string;
    startDate?: string;
    endDate?: string;
  },
  existing: {
    company: string;
    role: string;
    startDate?: string | null;
    endDate?: string | null;
  },
) {
  let score = 0;
  if (normalized(incoming.company) === normalized(existing.company)) score += 0.45;
  if (normalized(incoming.role) === normalized(existing.role)) score += 0.4;
  if (
    datesOverlap(
      incoming.startDate,
      incoming.endDate,
      existing.startDate,
      existing.endDate,
    )
  ) {
    score += 0.15;
  }
  return score;
}

export function educationMatchScore(
  incoming: {
    institution: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
  },
  existing: {
    institution: string;
    qualification?: string | null;
    fieldOfStudy?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  },
) {
  let score = 0;
  if (normalized(incoming.institution) === normalized(existing.institution)) {
    score += 0.5;
  }
  if (
    incoming.degree &&
    normalized(incoming.degree) === normalized(existing.qualification)
  ) {
    score += 0.25;
  }
  if (
    incoming.fieldOfStudy &&
    normalized(incoming.fieldOfStudy) === normalized(existing.fieldOfStudy)
  ) {
    score += 0.15;
  }
  if (
    datesOverlap(
      incoming.startDate,
      incoming.endDate,
      existing.startDate,
      existing.endDate,
    )
  ) {
    score += 0.1;
  }
  return score;
}

export function projectMatchScore(
  incoming: {
    title: string;
    liveUrl?: string;
    sourceUrl?: string;
  },
  existing: {
    title: string;
    liveUrl?: string | null;
    sourceCodeUrl?: string | null;
    githubFullName?: string | null;
  },
) {
  let score = 0;
  if (normalized(incoming.title) === normalized(existing.title)) score += 0.55;
  if (
    incoming.liveUrl &&
    existing.liveUrl &&
    incoming.liveUrl.replace(/\/$/, "").toLowerCase() ===
      existing.liveUrl.replace(/\/$/, "").toLowerCase()
  ) {
    score += 0.35;
  }
  if (
    incoming.sourceUrl &&
    existing.sourceCodeUrl &&
    incoming.sourceUrl.replace(/\/$/, "").toLowerCase() ===
      existing.sourceCodeUrl.replace(/\/$/, "").toLowerCase()
  ) {
    score += 0.65;
  }
  if (
    existing.githubFullName &&
    (normalized(incoming.title).includes(normalized(existing.githubFullName.split("/").at(-1))) ||
      normalized(incoming.sourceUrl).includes(normalized(existing.githubFullName)))
  ) {
    score += 0.45;
  }
  return Math.min(score, 1);
}

export function skillMatches(left: string, right: string) {
  return normalizeSkillKey(left) === normalizeSkillKey(right);
}
