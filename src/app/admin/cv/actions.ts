"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { canonicalUpdatedAtForUser } from "@/lib/cv/document";
import { db } from "@/lib/db";

export type CvVersionActionResult = {
  success: boolean;
  message: string;
};

const cvVersionSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(120),
  customHeadline: z.string().trim().max(200),
  customSummary: z.string().trim().max(10_000),
  selectedExperienceIds: z.array(z.string().cuid()).max(100),
  selectedProjectIds: z.array(z.string().cuid()).max(100),
  selectedEducationIds: z.array(z.string().cuid()).max(100),
  selectedSkillIds: z.array(z.string().cuid()).max(200),
  selectedCertificationIds: z.array(z.string().cuid()).max(100),
  selectedLanguageIds: z.array(z.string().cuid()).max(100),
  sectionOrder: z
    .array(
      z.enum([
        "experience",
        "projects",
        "education",
        "skills",
        "certifications",
        "languages",
      ]),
    )
    .min(1),
  overridesJson: z.string().max(100_000),
});

const deleteSchema = z.object({ id: z.string().cuid() });

async function assertOwnedIds(
  userId: string,
  input: z.infer<typeof cvVersionSchema>,
) {
  const [experience, projects, education, skills, certifications, languages] =
    await Promise.all([
      db.experience.count({
        where: { userId, id: { in: input.selectedExperienceIds } },
      }),
      db.portfolioProject.count({
        where: { userId, id: { in: input.selectedProjectIds } },
      }),
      db.education.count({
        where: { userId, id: { in: input.selectedEducationIds } },
      }),
      db.skill.count({
        where: { userId, id: { in: input.selectedSkillIds } },
      }),
      db.certification.count({
        where: { userId, id: { in: input.selectedCertificationIds } },
      }),
      db.language.count({
        where: { userId, id: { in: input.selectedLanguageIds } },
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
  const parsed = cvVersionSchema.safeParse(input);
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
    overridesJson: _overridesJson,
    ...data
  } = parsed.data;
  void _overridesJson;
  const payload = {
    ...data,
    customHeadline: customHeadline || null,
    customSummary: customSummary || null,
    overrides: overrides as object,
    sourceUpdatedAt: await canonicalUpdatedAtForUser(admin.id),
  };

  if (id) {
    const updated = await db.cvVersion.updateMany({
      where: { id, userId: admin.id },
      data: payload,
    });
    if (!updated.count) return { success: false, message: "CV version not found." };
  } else {
    await db.cvVersion.create({ data: { ...payload, userId: admin.id } });
  }
  revalidatePath("/admin/cv");
  return { success: true, message: id ? "CV version updated." : "CV version created." };
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
