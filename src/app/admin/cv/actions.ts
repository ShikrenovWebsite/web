"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireAdminPage } from "@/lib/auth";
import { canonicalUpdatedAtForUser } from "@/lib/cv/document";
import {
  allocateUniqueCvVersionName,
  type CvVersionInput,
  createCvVersionForPreview,
  cvPreviewPath,
  cvVersionSavedMessage,
  cvVersionInputSchema,
  databaseCuidSchema,
} from "@/lib/cv/version-input";
import { db } from "@/lib/db";

export type CvVersionActionResult = {
  success: boolean;
  message: string;
  id?: string;
  previewPath?: string;
};

const deleteSchema = z.object({ id: databaseCuidSchema });

async function assertOwnedIds(
  userId: string,
  input: CvVersionInput,
) {
  const [experience, projects, education, skills, certifications, languages] =
    await Promise.all([
      db.experience.count({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: input.selectedExperienceIds },
        },
      }),
      db.portfolioProject.count({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: input.selectedProjectIds },
        },
      }),
      db.education.count({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: input.selectedEducationIds },
        },
      }),
      db.skill.count({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: input.selectedSkillIds },
        },
      }),
      db.certification.count({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: input.selectedCertificationIds },
        },
      }),
      db.language.count({
        where: {
          userId,
          status: "PUBLISHED",
          id: { in: input.selectedLanguageIds },
        },
      }),
    ]);
  return (
    experience === new Set(input.selectedExperienceIds).size &&
    projects === new Set(input.selectedProjectIds).size &&
    education === new Set(input.selectedEducationIds).size &&
    skills === new Set(input.selectedSkillIds).size &&
    certifications === new Set(input.selectedCertificationIds).size &&
    languages === new Set(input.selectedLanguageIds).size
  );
}

export async function saveCvVersion(
  input: unknown,
): Promise<CvVersionActionResult> {
  const { admin } = await requireAdminPage("/admin/cv");
  const parsed = cvVersionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid CV version.",
    };
  }
  if (!(await assertOwnedIds(admin.id, parsed.data))) {
    return { success: false, message: "One or more selected records are invalid." };
  }
  let overrides: unknown;
  try {
    overrides = JSON.parse(parsed.data.overridesJson || "{}");
  } catch {
    return { success: false, message: "CV overrides must be valid JSON." };
  }
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return { success: false, message: "CV overrides must be a JSON object." };
  }
  const {
    id,
    customHeadline,
    customSummary,
    contactFields,
    layoutMode,
    overridesJson: _overridesJson,
    ...data
  } = parsed.data;
  void _overridesJson;
  const payload = {
    ...data,
    customHeadline: customHeadline || null,
    customSummary: customSummary || null,
    overrides: overrides as object,
    visibilitySettings: { contactFields, layoutMode },
    sourceUpdatedAt: await canonicalUpdatedAtForUser(admin.id),
  };

  const saved = await db.$transaction(async (transaction) => {
    await transaction.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`cv-version:${admin.id}`}, 0))`,
    );
    if (id) {
      const existing = await transaction.cvVersion.findFirst({
        where: { id, userId: admin.id },
        select: { id: true },
      });
      if (!existing) return null;
    }
    const allocated = await allocateUniqueCvVersionName({
      requestedName: data.name,
      exclusive: async (operation) => operation(),
      listExistingNames: async () => {
        const versions = await transaction.cvVersion.findMany({
          where: {
            userId: admin.id,
            ...(id ? { id: { not: id } } : {}),
          },
          select: { name: true },
        });
        return versions.map((version) => version.name);
      },
      create: async (name) => {
        if (id) {
          const updated = await transaction.cvVersion.update({
            where: { id },
            data: { ...payload, name },
            select: { id: true },
          });
          return {
            id: updated.id,
            previewPath: cvPreviewPath(updated.id),
          };
        }
        return createCvVersionForPreview(() =>
          transaction.cvVersion.create({
            data: { ...payload, name, userId: admin.id },
            select: { id: true },
          }),
        );
      },
    });
    return allocated;
  });
  if (!saved) return { success: false, message: "CV version not found." };
  const savedId = saved.created.id;
  const previewPath = saved.created.previewPath;
  revalidatePath("/admin/cv");
  if (savedId) revalidatePath(`/admin/cv/${savedId}/preview`);
  return {
    success: true,
    message: cvVersionSavedMessage(data.name, saved.name, !id),
    id: savedId,
    previewPath,
  };
}

export async function refreshCvVersionFromPortfolio(
  input: unknown,
): Promise<CvVersionActionResult> {
  const { admin } = await requireAdminPage("/admin/cv");
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid CV version." };
  const updated = await db.cvVersion.updateMany({
    where: { id: parsed.data.id, userId: admin.id },
    data: { sourceUpdatedAt: await canonicalUpdatedAtForUser(admin.id) },
  });
  if (!updated.count) return { success: false, message: "CV version not found." };
  revalidatePath("/admin/cv");
  revalidatePath(`/admin/cv/${parsed.data.id}/preview`);
  return {
    success: true,
    message:
      "The CV now uses the latest portfolio data. CV-specific selections and overrides were preserved.",
    id: parsed.data.id,
  };
}

export async function deleteCvVersion(
  input: unknown,
): Promise<CvVersionActionResult> {
  const { admin } = await requireAdminPage("/admin/cv");
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid CV version." };
  const result = await db.cvVersion.deleteMany({
    where: { id: parsed.data.id, userId: admin.id },
  });
  if (!result.count) return { success: false, message: "CV version not found." };
  revalidatePath("/admin/cv");
  return { success: true, message: "CV version and its private exports deleted." };
}
