"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeSkillKey } from "@/lib/skills/normalize";
import { refreshSkillSuggestions } from "@/lib/skills/suggestions";

export type SkillSuggestionActionResult = {
  success: boolean;
  message: string;
};

const suggestionActionSchema = z.object({
  suggestionId: z.string().cuid(),
  action: z.enum(["ACCEPT", "IGNORE", "RESTORE"]),
});
const bulkSuggestionSchema = z.object({
  suggestionIds: z.array(z.string().cuid()).min(1).max(500),
  action: z.enum(["ACCEPT", "IGNORE"]),
});

function revalidateSkills() {
  revalidatePath("/admin");
  revalidatePath("/admin/skills");
  revalidatePath("/");
}

export async function refreshSuggestions(): Promise<SkillSuggestionActionResult> {
  const { admin } = await requireAdminPage("/admin/skills");
  const count = await refreshSkillSuggestions(admin.id);
  revalidateSkills();
  return {
    success: true,
    message: `${count} normalized skill suggestion${count === 1 ? "" : "s"} refreshed.`,
  };
}

export async function updateSkillSuggestion(
  input: unknown,
): Promise<SkillSuggestionActionResult> {
  const { admin } = await requireAdminPage("/admin/skills");
  const parsed = suggestionActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid skill suggestion action." };
  }

  const suggestion = await db.skillSuggestion.findFirst({
    where: { id: parsed.data.suggestionId, userId: admin.id },
  });
  if (!suggestion) {
    return { success: false, message: "Skill suggestion not found." };
  }

  if (parsed.data.action === "IGNORE") {
    await db.skillSuggestion.update({
      where: { id: suggestion.id },
      data: { status: "IGNORED", acceptedAt: null },
    });
    revalidateSkills();
    return {
      success: true,
      message: "Suggestion ignored. Future refreshes will preserve this decision.",
    };
  }

  if (parsed.data.action === "RESTORE") {
    await db.skillSuggestion.update({
      where: { id: suggestion.id },
      data: { status: "PENDING", skillId: null, acceptedAt: null },
    });
    revalidateSkills();
    return { success: true, message: "Suggestion restored to pending." };
  }

  await db.$transaction(async (transaction) => {
    const skills = await transaction.skill.findMany({
      where: { userId: admin.id },
      select: { id: true, name: true },
    });
    const existing = skills.find(
      (skill) => normalizeSkillKey(skill.name) === suggestion.normalizedKey,
    );
    let skillId = existing?.id;
    if (!skillId) {
      const last = await transaction.skill.findFirst({
        where: { userId: admin.id },
        orderBy: { displayOrder: "desc" },
        select: { displayOrder: true },
      });
      const created = await transaction.skill.create({
        data: {
          userId: admin.id,
          name: suggestion.displayName,
          category: suggestion.category,
          status: "PUBLISHED",
          publishedAt: new Date(),
          sourceType: suggestion.sourceTypes.includes("CV_IMPORT")
            ? "CV_IMPORT"
            : "GITHUB",
          sourceReferenceId: suggestion.id,
          displayOrder: (last?.displayOrder ?? -1) + 1,
        },
      });
      skillId = created.id;
    } else {
      await transaction.skill.updateMany({
        where: { id: skillId, userId: admin.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    }
    await transaction.skillSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: "ACCEPTED",
        skillId,
        acceptedAt: new Date(),
        publishedAt: new Date(),
      },
    });
  });

  revalidateSkills();
  return {
    success: true,
    message:
      "Skill approved for the next portfolio publication. Existing manual fields were preserved.",
  };
}

export async function updateSkillSuggestionsBulk(
  input: unknown,
): Promise<SkillSuggestionActionResult> {
  const { admin } = await requireAdminPage("/admin/cv-import");
  const parsed = bulkSuggestionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid technology selection." };
  }
  const suggestions = await db.skillSuggestion.findMany({
    where: { userId: admin.id, id: { in: parsed.data.suggestionIds } },
    select: { id: true },
  });
  if (suggestions.length !== new Set(parsed.data.suggestionIds).size) {
    return { success: false, message: "A technology suggestion was not found." };
  }
  if (parsed.data.action === "IGNORE") {
    await db.skillSuggestion.updateMany({
      where: { userId: admin.id, id: { in: parsed.data.suggestionIds } },
      data: { status: "IGNORED", acceptedAt: null },
    });
  } else {
    for (const suggestion of suggestions) {
      const result = await updateSkillSuggestion({
        suggestionId: suggestion.id,
        action: "ACCEPT",
      });
      if (!result.success) return result;
    }
  }
  revalidatePath("/admin/cv-import");
  revalidateSkills();
  return {
    success: true,
    message: `${suggestions.length} technolog${suggestions.length === 1 ? "y" : "ies"} ${parsed.data.action === "ACCEPT" ? "accepted as draft skills" : "ignored"}.`,
  };
}

export async function acceptHighConfidenceSuggestions(): Promise<SkillSuggestionActionResult> {
  const { admin } = await requireAdminPage("/admin/skills");
  const suggestions = await db.skillSuggestion.findMany({
    where: {
      userId: admin.id,
      status: "PENDING",
      confidence: { gte: 0.9 },
    },
    select: { id: true },
  });
  for (const suggestion of suggestions) {
    await updateSkillSuggestion({
      suggestionId: suggestion.id,
      action: "ACCEPT",
    });
  }
  revalidateSkills();
  return {
    success: true,
    message: `${suggestions.length} high-confidence suggestion${suggestions.length === 1 ? "" : "s"} accepted as drafts.`,
  };
}
