"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireAdminPage } from "@/lib/auth";
import { canonicalUpdatedAtForUser } from "@/lib/cv/document";
import {
  allocateUniqueCvVersionName,
  createCvVersionForPreview,
  cvPreviewPath,
  cvVersionSavedMessage,
  cvVersionInputSchema,
  cvVersionUpdateInputSchema,
  databaseCuidSchema,
  resolveCvVersionSelections,
  type CvSelectionFieldName,
  type CvVersionSelections,
} from "@/lib/cv/version-input";
import { db } from "@/lib/db";

export type CvVersionActionResult = {
  success: boolean;
  message: string;
  id?: string;
  previewPath?: string;
  warnings?: string[];
};

const deleteSchema = z.object({ id: databaseCuidSchema });

type InvalidCvSelection = {
  field: CvSelectionFieldName;
  type: string;
  id: string;
  reason: "not found or not owned" | "unpublished";
};

const selectionLabels: Record<CvSelectionFieldName, string> = {
  selectedExperienceIds: "experience",
  selectedProjectIds: "project",
  selectedEducationIds: "education",
  selectedSkillIds: "skill",
  selectedCertificationIds: "certification",
  selectedLanguageIds: "language",
};

async function findInvalidSelections(
  userId: string,
  input: CvVersionSelections,
) {
  const [experience, projects, education, skills, certifications, languages] =
    await Promise.all([
      db.experience.findMany({
        where: {
          userId,
          id: { in: input.selectedExperienceIds },
        },
        select: { id: true, status: true },
      }),
      db.portfolioProject.findMany({
        where: {
          userId,
          id: { in: input.selectedProjectIds },
        },
        select: { id: true, status: true },
      }),
      db.education.findMany({
        where: {
          userId,
          id: { in: input.selectedEducationIds },
        },
        select: { id: true, status: true },
      }),
      db.skill.findMany({
        where: {
          userId,
          id: { in: input.selectedSkillIds },
        },
        select: { id: true, status: true },
      }),
      db.certification.findMany({
        where: {
          userId,
          id: { in: input.selectedCertificationIds },
        },
        select: { id: true, status: true },
      }),
      db.language.findMany({
        where: {
          userId,
          id: { in: input.selectedLanguageIds },
        },
        select: { id: true, status: true },
      }),
    ]);

  const rowsByField = {
    selectedExperienceIds: experience,
    selectedProjectIds: projects,
    selectedEducationIds: education,
    selectedSkillIds: skills,
    selectedCertificationIds: certifications,
    selectedLanguageIds: languages,
  } satisfies Record<CvSelectionFieldName, { id: string; status: string }[]>;

  const invalidSelections: InvalidCvSelection[] = [];
  for (const field of Object.keys(rowsByField) as CvSelectionFieldName[]) {
    const records = new Map(
      rowsByField[field].map((record) => [record.id, record.status]),
    );
    for (const id of new Set(input[field])) {
      const status = records.get(id);
      if (!status) {
        invalidSelections.push({
          field,
          type: selectionLabels[field],
          id,
          reason: "not found or not owned",
        });
      } else if (status !== "PUBLISHED") {
        invalidSelections.push({
          field,
          type: selectionLabels[field],
          id,
          reason: "unpublished",
        });
      }
    }
  }
  return invalidSelections;
}

function validationMessage(invalidSelections: InvalidCvSelection[]) {
  const first = invalidSelections[0];
  if (!first) return "One or more selected records are invalid.";
  const state =
    first.reason === "unpublished"
      ? "is unpublished"
      : "no longer exists or is not available to this account";
  return `The selected ${first.type} record (${first.id}) ${state}. Review the ${first.type} selection.`;
}

function staleSelectionWarning(invalidSelections: InvalidCvSelection[]) {
  const first = invalidSelections[0];
  if (!first) return undefined;
  const count = invalidSelections.length;
  return `${count} existing CV selection${count === 1 ? " is" : "s are"} stale or unpublished. Your CV metadata was saved; review the ${first.type} selection before the next export.`;
}

export async function saveCvVersion(
  input: unknown,
): Promise<CvVersionActionResult> {
  const { admin } = await requireAdminPage("/admin/cv");
  const isUpdate =
    typeof input === "object" &&
    input !== null &&
    "id" in input &&
    Boolean((input as { id?: unknown }).id);
  const parsed = (isUpdate ? cvVersionUpdateInputSchema : cvVersionInputSchema).safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid CV version.",
    };
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
  const data = parsed.data;
  const saved = await db.$transaction(async (transaction) => {
    await transaction.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`cv-version:${admin.id}`}, 0))`,
    );
    const id = "id" in data ? data.id : undefined;
    let existingSelections: CvVersionSelections | undefined;
    if (id) {
      const existing = await transaction.cvVersion.findFirst({
        where: { id, userId: admin.id },
        select: {
          id: true,
          selectedExperienceIds: true,
          selectedProjectIds: true,
          selectedEducationIds: true,
          selectedSkillIds: true,
          selectedCertificationIds: true,
          selectedLanguageIds: true,
        },
      });
      if (!existing) return null;
      existingSelections = existing;
    }

    const { selections, submittedSelectionFields }: {
      selections: CvVersionSelections;
      submittedSelectionFields: CvSelectionFieldName[];
    } = id
      ? resolveCvVersionSelections(existingSelections!, data)
      : {
          selections: {
            selectedExperienceIds: data.selectedExperienceIds!,
            selectedProjectIds: data.selectedProjectIds!,
            selectedEducationIds: data.selectedEducationIds!,
            selectedSkillIds: data.selectedSkillIds!,
            selectedCertificationIds: data.selectedCertificationIds!,
            selectedLanguageIds: data.selectedLanguageIds!,
          },
          submittedSelectionFields: [
            "selectedExperienceIds",
            "selectedProjectIds",
            "selectedEducationIds",
            "selectedSkillIds",
            "selectedCertificationIds",
            "selectedLanguageIds",
          ] as CvSelectionFieldName[],
        };
    const invalidSelections = await findInvalidSelections(admin.id, selections);
    const submittedFields = new Set(submittedSelectionFields);
    const invalidSubmittedSelections = invalidSelections.filter((selection) =>
      submittedFields.has(selection.field),
    );
    if (invalidSubmittedSelections.length) {
      return { invalidSelections: invalidSubmittedSelections };
    }

    const selectionPayload = Object.fromEntries(
      submittedSelectionFields.map((field) => [field, selections[field]]),
    ) as Partial<CvVersionSelections>;
    const payload = {
      ...selectionPayload,
      customHeadline: data.customHeadline || null,
      customSummary: data.customSummary || null,
      overrides: overrides as object,
      visibilitySettings: {
        contactFields: data.contactFields,
        layoutMode: data.layoutMode,
      },
      sectionOrder: data.sectionOrder,
      sourceUpdatedAt: await canonicalUpdatedAtForUser(admin.id),
    };
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
    return {
      allocated,
      staleSelections: invalidSelections.filter(
        (selection) => !submittedFields.has(selection.field),
      ),
    };
  });
  if (!saved) return { success: false, message: "CV version not found." };
  if ("invalidSelections" in saved) {
    const invalidSelections = saved.invalidSelections ?? [];
    if (process.env.NODE_ENV !== "production") {
      console.warn("CV validation failed", {
        cvId: isUpdate ? parsed.data.id : undefined,
        invalidSelections,
      });
    }
    return {
      success: false,
      message: validationMessage(invalidSelections),
    };
  }
  const savedId = saved.allocated.created.id;
  const previewPath = saved.allocated.created.previewPath;
  const warning = staleSelectionWarning(saved.staleSelections);
  revalidatePath("/admin/cv");
  if (savedId) revalidatePath(`/admin/cv/${savedId}/preview`);
  return {
    success: true,
    message: cvVersionSavedMessage(data.name, saved.allocated.name, !isUpdate),
    id: savedId,
    previewPath,
    warnings: warning ? [warning] : undefined,
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
