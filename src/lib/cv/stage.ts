import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { CV_PARSER_VERSION } from "@/lib/cv/parser";
import {
  educationMatchScore,
  experienceMatchScore,
  projectMatchScore,
  skillMatches,
} from "@/lib/cv/matching";
import type { CvStructuredDraft } from "@/lib/cv/schema";
import { db } from "@/lib/db";

function dateText(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function stageCvImport(input: {
  userId: string;
  cvUploadId: string;
  draft: CvStructuredDraft;
}) {
  const [profile, experiences, education, skills, projects, certifications, languages] =
    await Promise.all([
      db.portfolioProfile.findUnique({ where: { userId: input.userId } }),
      db.experience.findMany({ where: { userId: input.userId } }),
      db.education.findMany({ where: { userId: input.userId } }),
      db.skill.findMany({ where: { userId: input.userId } }),
      db.portfolioProject.findMany({
        where: { userId: input.userId },
        include: {
          githubRepository: { select: { fullName: true } },
        },
      }),
      db.certification.findMany({ where: { userId: input.userId } }),
      db.language.findMany({ where: { userId: input.userId } }),
    ]);

  const items: Array<{
    itemType:
      | "PROFILE"
      | "EXPERIENCE"
      | "EDUCATION"
      | "SKILL"
      | "CERTIFICATION"
      | "LANGUAGE"
      | "PROJECT";
    status: "PENDING" | "CONFLICT";
    importedData: Prisma.InputJsonValue;
    existingRecordId?: string;
    existingData?: Prisma.InputJsonValue;
    duplicateScore?: number;
    displayOrder: number;
  }> = [];
  let displayOrder = 0;

  if (Object.values(input.draft.profile).some(Boolean)) {
    items.push({
      itemType: "PROFILE",
      status: profile ? "CONFLICT" : "PENDING",
      importedData: json(input.draft.profile),
      ...(profile
        ? {
            existingRecordId: profile.id,
            existingData: json({
              fullName: profile.fullName ?? "",
              headline: profile.professionalTitle ?? "",
              summary: profile.biography ?? "",
              location: profile.location ?? "",
              email: profile.email ?? "",
              phone: profile.phone ?? "",
              website: profile.websiteUrl ?? "",
              socialLinks: profile.socialLinks,
            }),
            duplicateScore: 1,
          }
        : {}),
      displayOrder: displayOrder++,
    });
  }

  for (const proposed of input.draft.experience) {
    const matches = experiences
      .map((record) => ({
        record,
        score: experienceMatchScore(proposed, {
          ...record,
          startDate: dateText(record.startDate),
          endDate: dateText(record.endDate),
        }),
      }))
      .sort((left, right) => right.score - left.score);
    const match = matches[0]?.score >= 0.7 ? matches[0] : null;
    items.push({
      itemType: "EXPERIENCE",
      status: match ? "CONFLICT" : "PENDING",
      importedData: json(proposed),
      ...(match
        ? {
            existingRecordId: match.record.id,
            existingData: json({
              company: match.record.company,
              role: match.record.role,
              employmentType: match.record.employmentType ?? "",
              location: match.record.location ?? "",
              description: match.record.description ?? "",
              achievements: match.record.highlights,
              technologies: [],
              startDate: dateText(match.record.startDate),
              endDate: dateText(match.record.endDate),
              isCurrent: match.record.isCurrent,
            }),
            duplicateScore: match.score,
          }
        : {}),
      displayOrder: displayOrder++,
    });
  }

  for (const proposed of input.draft.education) {
    const matches = education
      .map((record) => ({
        record,
        score: educationMatchScore(proposed, {
          ...record,
          startDate: dateText(record.startDate),
          endDate: dateText(record.endDate),
        }),
      }))
      .sort((left, right) => right.score - left.score);
    const match = matches[0]?.score >= 0.65 ? matches[0] : null;
    items.push({
      itemType: "EDUCATION",
      status: match ? "CONFLICT" : "PENDING",
      importedData: json(proposed),
      ...(match
        ? {
            existingRecordId: match.record.id,
            existingData: json({
              institution: match.record.institution,
              degree: match.record.qualification ?? "",
              fieldOfStudy: match.record.fieldOfStudy ?? "",
              location: match.record.location ?? "",
              description: match.record.description ?? "",
              achievements: match.record.achievements,
              startDate: dateText(match.record.startDate),
              endDate: dateText(match.record.endDate),
            }),
            duplicateScore: match.score,
          }
        : {}),
      displayOrder: displayOrder++,
    });
  }

  for (const proposed of input.draft.skills) {
    const match = skills.find((record) => skillMatches(proposed.name, record.name));
    items.push({
      itemType: "SKILL",
      status: match ? "CONFLICT" : "PENDING",
      importedData: json(proposed),
      ...(match
        ? {
            existingRecordId: match.id,
            existingData: json({
              name: match.name,
              category: match.category ?? "",
              proficiency: match.proficiency ?? "",
            }),
            duplicateScore: 1,
          }
        : {}),
      displayOrder: displayOrder++,
    });
  }

  for (const proposed of input.draft.projects) {
    const matches = projects
      .map((record) => ({
        record,
        score: projectMatchScore(proposed, {
          ...record,
          githubFullName: record.githubRepository?.fullName,
        }),
      }))
      .sort((left, right) => right.score - left.score);
    const match = matches[0]?.score >= 0.55 ? matches[0] : null;
    items.push({
      itemType: "PROJECT",
      status: match ? "CONFLICT" : "PENDING",
      importedData: json(proposed),
      ...(match
        ? {
            existingRecordId: match.record.id,
            existingData: json({
              title: match.record.title,
              shortSummary: match.record.shortDescription ?? "",
              description: match.record.longDescription ?? "",
              achievements: match.record.highlights,
              technologies: match.record.technologies,
              liveUrl: match.record.liveUrl ?? "",
              sourceUrl: match.record.sourceCodeUrl ?? "",
              githubFullName: match.record.githubRepository?.fullName ?? "",
            }),
            duplicateScore: match.score,
          }
        : {}),
      displayOrder: displayOrder++,
    });
  }

  for (const proposed of input.draft.certifications) {
    const match = certifications.find(
      (record) => record.name.toLowerCase() === proposed.name.toLowerCase(),
    );
    items.push({
      itemType: "CERTIFICATION",
      status: match ? "CONFLICT" : "PENDING",
      importedData: json(proposed),
      ...(match
        ? {
            existingRecordId: match.id,
            existingData: json({
              name: match.name,
              issuer: match.issuer ?? "",
              credentialUrl: match.credentialUrl ?? "",
              credentialId: match.credentialId ?? "",
              issuedAt: dateText(match.issuedAt),
              expiresAt: dateText(match.expiresAt),
            }),
            duplicateScore: 1,
          }
        : {}),
      displayOrder: displayOrder++,
    });
  }

  for (const proposed of input.draft.languages) {
    const match = languages.find(
      (record) => record.name.toLowerCase() === proposed.name.toLowerCase(),
    );
    items.push({
      itemType: "LANGUAGE",
      status: match ? "CONFLICT" : "PENDING",
      importedData: json(proposed),
      ...(match
        ? {
            existingRecordId: match.id,
            existingData: json({
              name: match.name,
              proficiency: match.proficiency ?? "",
            }),
            duplicateScore: 1,
          }
        : {}),
      displayOrder: displayOrder++,
    });
  }

  return db.cvImportRun.create({
    data: {
      userId: input.userId,
      cvUploadId: input.cvUploadId,
      status: "READY_FOR_REVIEW",
      parserVersion: CV_PARSER_VERSION,
      structuredData: json(input.draft),
      validationResult: json({ success: true, parserVersion: CV_PARSER_VERSION }),
      completedAt: new Date(),
      items: { create: items },
    },
    include: { items: true },
  });
}
