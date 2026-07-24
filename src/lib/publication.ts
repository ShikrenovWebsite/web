import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { groupPublishableCvRecordIds } from "@/lib/cv/publication";

type DatabaseClient = Prisma.TransactionClient | typeof db;

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

export async function buildPortfolioPublicationData(
  client: DatabaseClient,
  userId: string,
) {
  const [profile, experiences, education, skills, projects, siteSettings] =
    await Promise.all([
      client.portfolioProfile.findFirst({
        where: { userId, status: "PUBLISHED" },
      }),
      client.experience.findMany({
        where: { userId, status: "PUBLISHED" },
        orderBy: [{ displayOrder: "asc" }, { startDate: "desc" }],
      }),
      client.education.findMany({
        where: { userId, status: "PUBLISHED" },
        orderBy: [{ displayOrder: "asc" }, { startDate: "desc" }],
      }),
      client.skill.findMany({
        where: { userId, status: "PUBLISHED" },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      client.portfolioProject.findMany({
        where: { userId, status: "PUBLISHED" },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      }),
      client.siteSettings.findUnique({ where: { userId } }),
    ]);

  return {
    profile: profile
      ? {
          id: profile.id,
          fullName: profile.fullName,
          professionalTitle: profile.professionalTitle,
          biography: profile.biography,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          websiteUrl: profile.websiteUrl,
          socialLinks: profile.socialLinks,
        }
      : null,
    experiences: experiences.map((item) => ({
      id: item.id,
      company: item.company,
      role: item.role,
      employmentType: item.employmentType,
      location: item.location,
      description: item.description,
      highlights: item.highlights,
      startDate: iso(item.startDate),
      endDate: iso(item.endDate),
      isCurrent: item.isCurrent,
    })),
    education: education.map((item) => ({
      id: item.id,
      institution: item.institution,
      qualification: item.qualification,
      fieldOfStudy: item.fieldOfStudy,
      location: item.location,
      description: item.description,
      achievements: item.achievements,
      startDate: iso(item.startDate),
      endDate: iso(item.endDate),
    })),
    skills: skills.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      proficiency: item.proficiency,
    })),
    projects: projects.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      shortDescription: item.shortDescription,
      longDescription: item.longDescription,
      highlights: item.highlights,
      technologies: item.technologies,
      liveUrl: item.liveUrl,
      sourceCodeUrl: item.sourceCodeUrl,
      coverImageUrl: item.coverImageUrl,
      startDate: iso(item.startDate),
      endDate: iso(item.endDate),
      featured: item.featured,
    })),
    siteSettings: siteSettings
      ? {
          siteTitle: siteSettings.siteTitle,
          siteDescription: siteSettings.siteDescription,
          contactEmail: siteSettings.contactEmail,
          isContactFormEnabled: siteSettings.isContactFormEnabled,
          isCvDownloadEnabled: siteSettings.isCvDownloadEnabled,
          publicCvUploadId: siteSettings.publicCvUploadId,
          socialLinks: siteSettings.socialLinks,
          seoMetadata: siteSettings.seoMetadata,
        }
      : null,
  };
}

export async function approveAppliedCvRecords(
  transaction: Prisma.TransactionClient,
  userId: string,
) {
  const items = await transaction.cvImportItem.findMany({
    where: {
      status: "ACCEPTED",
      appliedAt: { not: null },
      createdRecordId: { not: null },
      publishedAt: null,
      importRun: { userId },
    },
    select: { id: true, itemType: true, createdRecordId: true },
  });
  const grouped = groupPublishableCvRecordIds(items);
  const acceptedCvSkills = await transaction.skillSuggestion.findMany({
    where: {
      userId,
      status: "ACCEPTED",
      acceptedAt: { not: null },
      skillId: { not: null },
      sourceTypes: { has: "CV_IMPORT" },
      publishedAt: null,
    },
    select: { id: true, skillId: true },
  });
  const now = new Date();
  await Promise.all([
    transaction.portfolioProfile.updateMany({
      where: { userId, id: { in: grouped.PROFILE } },
      data: { status: "PUBLISHED", publishedAt: now },
    }),
    transaction.experience.updateMany({
      where: { userId, id: { in: grouped.EXPERIENCE } },
      data: { status: "PUBLISHED", publishedAt: now },
    }),
    transaction.education.updateMany({
      where: { userId, id: { in: grouped.EDUCATION } },
      data: { status: "PUBLISHED", publishedAt: now },
    }),
    transaction.skill.updateMany({
      where: {
        userId,
        id: {
          in: [
            ...grouped.SKILL,
            ...acceptedCvSkills.flatMap((item) =>
              item.skillId ? [item.skillId] : [],
            ),
          ],
        },
      },
      data: { status: "PUBLISHED", publishedAt: now },
    }),
    transaction.portfolioProject.updateMany({
      where: { userId, id: { in: grouped.PROJECT } },
      data: { status: "PUBLISHED", publishedAt: now },
    }),
  ]);
  await Promise.all([
    transaction.cvImportItem.updateMany({
      where: { id: { in: items.map((item) => item.id) } },
      data: { publishedAt: now },
    }),
    transaction.skillSuggestion.updateMany({
      where: { id: { in: acceptedCvSkills.map((item) => item.id) } },
      data: { publishedAt: now },
    }),
  ]);
}

export async function publishPortfolio(userId: string) {
  return db.$transaction(async (transaction) => {
    await approveAppliedCvRecords(transaction, userId);
    const data = await buildPortfolioPublicationData(transaction, userId);
    return transaction.portfolioPublication.upsert({
      where: { userId },
      create: {
        userId,
        data: data as unknown as Prisma.InputJsonValue,
        revision: 1,
      },
      update: {
        data: data as unknown as Prisma.InputJsonValue,
        revision: { increment: 1 },
        publishedAt: new Date(),
      },
      select: {
        revision: true,
        publishedAt: true,
      },
    });
  });
}

export type PortfolioPublicationData = Awaited<
  ReturnType<typeof buildPortfolioPublicationData>
>;
