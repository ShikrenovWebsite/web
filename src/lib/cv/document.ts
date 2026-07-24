import "server-only";

import { db } from "@/lib/db";
import { databaseCuidSchema } from "@/lib/cv/version-input";

export type CvDocumentData = {
  version: {
    id: string;
    name: string;
    headline: string;
    summary: string;
    sectionOrder: string[];
    updatedAt: string;
    sourceUpdatedAt: string;
    newerDataAvailable: boolean;
  };
  profile: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    links: string[];
  };
  experience: Array<{
    id: string;
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
    highlights: string[];
  }>;
  projects: Array<{
    id: string;
    title: string;
    shortDescription: string;
    longDescription: string;
    technologies: string[];
    highlights: string[];
    liveUrl: string;
    sourceCodeUrl: string;
  }>;
  education: Array<{
    id: string;
    institution: string;
    qualification: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  skills: Array<{ id: string; name: string; category: string }>;
  certifications: Array<{ id: string; name: string; issuer: string }>;
  languages: Array<{ id: string; name: string; proficiency: string }>;
  canonicalUpdatedAt: string;
};

function dateLabel(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(value)
    : "";
}

function ordered<T extends { id: string }>(items: T[], ids: string[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

function maxDate(values: Date[]) {
  return new Date(Math.max(...values.map((value) => value.getTime())));
}

export async function canonicalUpdatedAtForUser(userId: string) {
  const [profile, experience, education, projects, skills, certifications, languages] =
    await Promise.all([
      db.portfolioProfile.findFirst({
        where: { userId, status: "PUBLISHED" },
        select: { updatedAt: true },
      }),
      db.experience.findFirst({
        where: { userId, status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      db.education.findFirst({
        where: { userId, status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      db.portfolioProject.findFirst({
        where: { userId, status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      db.skill.findFirst({
        where: { userId, status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      db.certification.findFirst({
        where: { userId, status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      db.language.findFirst({
        where: { userId, status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);
  const dates = [
    profile?.updatedAt,
    experience?.updatedAt,
    education?.updatedAt,
    projects?.updatedAt,
    skills?.updatedAt,
    certifications?.updatedAt,
    languages?.updatedAt,
  ].filter((value): value is Date => Boolean(value));
  return dates.length ? maxDate(dates) : new Date(0);
}

export async function getCvDocumentData(userId: string, cvVersionId: string) {
  if (!databaseCuidSchema.safeParse(cvVersionId).success) return null;
  const version = await db.cvVersion.findFirst({
    where: { id: cvVersionId, userId },
  });
  if (!version) return null;
  const [profile, experience, projects, education, skills, certifications, languages] =
    await Promise.all([
      db.portfolioProfile.findFirst({
        where: { userId, status: "PUBLISHED" },
      }),
      db.experience.findMany({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: version.selectedExperienceIds },
        },
      }),
      db.portfolioProject.findMany({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: version.selectedProjectIds },
        },
      }),
      db.education.findMany({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: version.selectedEducationIds },
        },
      }),
      db.skill.findMany({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: version.selectedSkillIds },
        },
      }),
      db.certification.findMany({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: version.selectedCertificationIds },
        },
      }),
      db.language.findMany({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: version.selectedLanguageIds },
        },
      }),
    ]);
  const overrides =
    typeof version.overrides === "object" &&
    version.overrides &&
    !Array.isArray(version.overrides)
      ? (version.overrides as Record<string, unknown>)
      : {};
  const experienceOverrides =
    typeof overrides.experience === "object" &&
    overrides.experience &&
    !Array.isArray(overrides.experience)
      ? (overrides.experience as Record<string, { highlights?: string[] }>)
      : {};
  const projectOverrides =
    typeof overrides.projects === "object" &&
    overrides.projects &&
    !Array.isArray(overrides.projects)
      ? (overrides.projects as Record<string, { highlights?: string[] }>)
      : {};
  const social =
    typeof profile?.socialLinks === "object" &&
    profile.socialLinks &&
    !Array.isArray(profile.socialLinks)
      ? Object.values(profile.socialLinks).filter(
          (value): value is string => typeof value === "string",
        )
      : [];
  const canonicalUpdatedAt = await canonicalUpdatedAtForUser(userId);
  const contactFields =
    typeof version.visibilitySettings === "object" &&
    version.visibilitySettings &&
    !Array.isArray(version.visibilitySettings) &&
    "contactFields" in version.visibilitySettings &&
    Array.isArray(version.visibilitySettings.contactFields)
      ? new Set(
          version.visibilitySettings.contactFields.filter(
            (field): field is string => typeof field === "string",
          ),
        )
      : new Set(["email", "phone", "location", "website", "links"]);

  return {
    version: {
      id: version.id,
      name: version.name,
      headline:
        version.customHeadline ?? profile?.professionalTitle ?? "",
      summary: version.customSummary ?? profile?.biography ?? "",
      sectionOrder: version.sectionOrder,
      updatedAt: version.updatedAt.toISOString(),
      sourceUpdatedAt: (version.sourceUpdatedAt ?? new Date(0)).toISOString(),
      newerDataAvailable:
        !version.sourceUpdatedAt ||
        canonicalUpdatedAt > version.sourceUpdatedAt,
    },
    profile: {
      fullName: profile?.fullName ?? "",
      email: contactFields.has("email") ? (profile?.email ?? "") : "",
      phone: contactFields.has("phone") ? (profile?.phone ?? "") : "",
      location: contactFields.has("location") ? (profile?.location ?? "") : "",
      website: contactFields.has("website")
        ? (profile?.websiteUrl ?? "")
        : "",
      links: contactFields.has("links") ? social : [],
    },
    experience: ordered(experience, version.selectedExperienceIds).map(
      (item) => ({
        id: item.id,
        company: item.company,
        role: item.role,
        location: item.location ?? "",
        startDate: dateLabel(item.startDate),
        endDate: item.isCurrent ? "Present" : dateLabel(item.endDate),
        description: item.description ?? "",
        highlights:
          experienceOverrides[item.id]?.highlights ?? item.highlights,
      }),
    ),
    projects: ordered(projects, version.selectedProjectIds).map((item) => ({
      id: item.id,
      title: item.title,
      shortDescription: item.shortDescription ?? "",
      longDescription: item.longDescription ?? "",
      technologies: item.technologies,
      highlights: projectOverrides[item.id]?.highlights ?? item.highlights,
      liveUrl: item.liveUrl ?? "",
      sourceCodeUrl: item.sourceCodeUrl ?? "",
    })),
    education: ordered(education, version.selectedEducationIds).map((item) => ({
      id: item.id,
      institution: item.institution,
      qualification: item.qualification ?? "",
      fieldOfStudy: item.fieldOfStudy ?? "",
      startDate: dateLabel(item.startDate),
      endDate: dateLabel(item.endDate),
      description: item.description ?? "",
    })),
    skills: ordered(skills, version.selectedSkillIds).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category ?? "",
    })),
    certifications: ordered(
      certifications,
      version.selectedCertificationIds,
    ).map((item) => ({
      id: item.id,
      name: item.name,
      issuer: item.issuer ?? "",
    })),
    languages: ordered(languages, version.selectedLanguageIds).map((item) => ({
      id: item.id,
      name: item.name,
      proficiency: item.proficiency ?? "",
    })),
    canonicalUpdatedAt: canonicalUpdatedAt.toISOString(),
  } satisfies CvDocumentData;
}
