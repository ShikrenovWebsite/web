"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { refreshSkillSuggestions } from "@/lib/skills/suggestions";
import {
  changeStatusSchema,
  deleteContentSchema,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  reorderContentSchema,
  skillSchema,
} from "@/lib/validations/content";

export type ActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function validationError(error: z.ZodError): ActionResult {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function optional(value: string) {
  return value.trim() || null;
}

function dateOrNull(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function publicationDate(
  status: "DRAFT" | "PUBLISHED" | "HIDDEN",
  existing?: Date | null,
) {
  return status === "PUBLISHED" ? (existing ?? new Date()) : null;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function revalidateContent() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/profile");
  revalidatePath("/admin/experience");
  revalidatePath("/admin/education");
  revalidatePath("/admin/skills");
  revalidatePath("/admin/projects");
}

function messageFromError(error: unknown) {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return "A record with that name already exists.";
  }

  return error instanceof Error ? error.message : "The operation failed.";
}

export async function saveProfile(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdminPage();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const data = parsed.data;
    const existing = await db.portfolioProfile.findUnique({
      where: { userId: admin.id },
      select: { publishedAt: true },
    });

    await db.portfolioProfile.upsert({
      where: { userId: admin.id },
      update: {
        fullName: optional(data.fullName),
        professionalTitle: optional(data.professionalTitle),
        biography: optional(data.biography),
        email: optional(data.email),
        phone: optional(data.phone),
        location: optional(data.location),
        websiteUrl: optional(data.websiteUrl),
        status: data.status,
        displayOrder: data.displayOrder,
        publishedAt: publicationDate(data.status, existing?.publishedAt),
      },
      create: {
        userId: admin.id,
        fullName: optional(data.fullName),
        professionalTitle: optional(data.professionalTitle),
        biography: optional(data.biography),
        email: optional(data.email),
        phone: optional(data.phone),
        location: optional(data.location),
        websiteUrl: optional(data.websiteUrl),
        status: data.status,
        displayOrder: data.displayOrder,
        publishedAt: publicationDate(data.status),
        sourceType: "MANUAL",
      },
    });

    revalidateContent();
    return { success: true, message: "Profile saved." };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

export async function saveExperience(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdminPage();
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { id, highlightsText, ...data } = parsed.data;
    const payload = {
      company: data.company,
      role: data.role,
      employmentType: optional(data.employmentType),
      location: optional(data.location),
      description: optional(data.description),
      highlights: splitLines(highlightsText),
      startDate: dateOrNull(data.startDate),
      endDate: data.isCurrent ? null : dateOrNull(data.endDate),
      isCurrent: data.isCurrent,
      status: data.status,
      displayOrder: data.displayOrder,
    };

    if (id) {
      const existing = await db.experience.findFirst({
        where: { id, userId: admin.id },
        select: { publishedAt: true },
      });
      if (!existing) return { success: false, message: "Experience not found." };
      await db.experience.update({
        where: { id },
        data: {
          ...payload,
          publishedAt: publicationDate(data.status, existing.publishedAt),
        },
      });
    } else {
      await db.experience.create({
        data: {
          ...payload,
          userId: admin.id,
          sourceType: "MANUAL",
          publishedAt: publicationDate(data.status),
        },
      });
    }

    revalidateContent();
    return { success: true, message: id ? "Experience updated." : "Experience created." };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

export async function saveEducation(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdminPage();
  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { id, achievementsText, ...data } = parsed.data;
    const payload = {
      institution: data.institution,
      qualification: optional(data.qualification),
      fieldOfStudy: optional(data.fieldOfStudy),
      location: optional(data.location),
      description: optional(data.description),
      achievements: splitLines(achievementsText),
      startDate: dateOrNull(data.startDate),
      endDate: dateOrNull(data.endDate),
      status: data.status,
      displayOrder: data.displayOrder,
    };

    if (id) {
      const existing = await db.education.findFirst({
        where: { id, userId: admin.id },
        select: { publishedAt: true },
      });
      if (!existing) return { success: false, message: "Education record not found." };
      await db.education.update({
        where: { id },
        data: {
          ...payload,
          publishedAt: publicationDate(data.status, existing.publishedAt),
        },
      });
    } else {
      await db.education.create({
        data: {
          ...payload,
          userId: admin.id,
          sourceType: "MANUAL",
          publishedAt: publicationDate(data.status),
        },
      });
    }

    revalidateContent();
    return { success: true, message: id ? "Education updated." : "Education created." };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

export async function saveSkill(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdminPage();
  const parsed = skillSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { id, ...data } = parsed.data;
    const payload = {
      name: data.name,
      category: optional(data.category),
      proficiency: optional(data.proficiency),
      status: data.status,
      displayOrder: data.displayOrder,
    };

    if (id) {
      const existing = await db.skill.findFirst({
        where: { id, userId: admin.id },
        select: { publishedAt: true },
      });
      if (!existing) return { success: false, message: "Skill not found." };
      await db.skill.update({
        where: { id },
        data: {
          ...payload,
          publishedAt: publicationDate(data.status, existing.publishedAt),
        },
      });
    } else {
      await db.skill.create({
        data: {
          ...payload,
          userId: admin.id,
          sourceType: "MANUAL",
          publishedAt: publicationDate(data.status),
        },
      });
    }

    revalidateContent();
    return { success: true, message: id ? "Skill updated." : "Skill created." };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}

async function uniqueProjectSlug(userId: string, title: string, currentId?: string) {
  const root = slugify(title);
  let slug = root;
  let suffix = 2;

  while (
    await db.portfolioProject.findFirst({
      where: {
        userId,
        slug,
        ...(currentId ? { NOT: { id: currentId } } : {}),
      },
      select: { id: true },
    })
  ) {
    slug = `${root}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function saveProject(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdminPage();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { id, technologiesText, highlightsText, ...data } = parsed.data;
    const slug = await uniqueProjectSlug(admin.id, data.title, id);
    const payload = {
      title: data.title,
      slug,
      shortDescription: optional(data.shortDescription),
      longDescription: optional(data.longDescription),
      highlights: splitLines(highlightsText),
      technologies: splitTags(technologiesText),
      liveUrl: optional(data.liveUrl),
      sourceCodeUrl: optional(data.sourceCodeUrl),
      coverImageUrl: optional(data.coverImageUrl),
      startDate: dateOrNull(data.startDate),
      endDate: dateOrNull(data.endDate),
      featured: data.featured,
      status: data.status,
      sourceType: data.sourceType,
      displayOrder: data.displayOrder,
    };

    if (id) {
      const existing = await db.portfolioProject.findFirst({
        where: { id, userId: admin.id },
        select: { publishedAt: true },
      });
      if (!existing) return { success: false, message: "Project not found." };
      await db.portfolioProject.update({
        where: { id },
        data: {
          ...payload,
          publishedAt: publicationDate(data.status, existing.publishedAt),
        },
      });
    } else {
      await db.portfolioProject.create({
        data: {
          ...payload,
          userId: admin.id,
          publishedAt: publicationDate(data.status),
        },
      });
    }

    await refreshSkillSuggestions(admin.id);
    revalidateContent();
    return { success: true, message: id ? "Project updated." : "Project created." };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

export async function deleteContent(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdminPage();
  const parsed = deleteContentSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { type, id } = parsed.data;
    let count = 0;

    if (type === "profile") {
      ({ count } = await db.portfolioProfile.deleteMany({
        where: { id, userId: admin.id },
      }));
    } else if (type === "experience") {
      ({ count } = await db.experience.deleteMany({
        where: { id, userId: admin.id },
      }));
    } else if (type === "education") {
      ({ count } = await db.education.deleteMany({
        where: { id, userId: admin.id },
      }));
    } else if (type === "skill") {
      ({ count } = await db.skill.deleteMany({
        where: { id, userId: admin.id },
      }));
    } else {
      ({ count } = await db.portfolioProject.deleteMany({
        where: { id, userId: admin.id },
      }));
    }

    if (!count) return { success: false, message: "Record not found." };
    revalidateContent();
    return { success: true, message: "Record deleted." };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

export async function changeContentStatus(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdminPage();
  const parsed = changeStatusSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { type, id, status } = parsed.data;
    const data = {
      status,
      publishedAt: publicationDate(status),
    };
    let count = 0;

    if (type === "profile") {
      ({ count } = await db.portfolioProfile.updateMany({
        where: { id, userId: admin.id },
        data,
      }));
    } else if (type === "experience") {
      ({ count } = await db.experience.updateMany({
        where: { id, userId: admin.id },
        data,
      }));
    } else if (type === "education") {
      ({ count } = await db.education.updateMany({
        where: { id, userId: admin.id },
        data,
      }));
    } else if (type === "skill") {
      ({ count } = await db.skill.updateMany({
        where: { id, userId: admin.id },
        data,
      }));
    } else {
      ({ count } = await db.portfolioProject.updateMany({
        where: { id, userId: admin.id },
        data,
      }));
    }

    if (!count) return { success: false, message: "Record not found." };
    revalidateContent();
    return {
      success: true,
      message:
        status === "PUBLISHED"
          ? "Record published."
          : status === "HIDDEN"
            ? "Record hidden."
            : "Record moved to drafts.",
    };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}

async function reorderExperience(userId: string, id: string, direction: "up" | "down") {
  const items = await db.experience.findMany({
    where: { userId },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return swapOrder(items, id, direction, (itemId, order) =>
    db.experience.update({ where: { id: itemId }, data: { displayOrder: order } }),
  );
}

async function reorderEducation(userId: string, id: string, direction: "up" | "down") {
  const items = await db.education.findMany({
    where: { userId },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return swapOrder(items, id, direction, (itemId, order) =>
    db.education.update({ where: { id: itemId }, data: { displayOrder: order } }),
  );
}

async function reorderSkills(userId: string, id: string, direction: "up" | "down") {
  const items = await db.skill.findMany({
    where: { userId },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return swapOrder(items, id, direction, (itemId, order) =>
    db.skill.update({ where: { id: itemId }, data: { displayOrder: order } }),
  );
}

async function reorderProjects(userId: string, id: string, direction: "up" | "down") {
  const items = await db.portfolioProject.findMany({
    where: { userId },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return swapOrder(items, id, direction, (itemId, order) =>
    db.portfolioProject.update({
      where: { id: itemId },
      data: { displayOrder: order },
    }),
  );
}

async function swapOrder<T>(
  items: { id: string }[],
  id: string,
  direction: "up" | "down",
  update: (id: string, order: number) => T,
) {
  const index = items.findIndex((item) => item.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return false;

  const reordered = [...items];
  [reordered[index], reordered[targetIndex]] = [
    reordered[targetIndex],
    reordered[index],
  ];
  await db.$transaction(
    reordered.map((item, order) => update(item.id, order)) as never,
  );
  return true;
}

export async function reorderContent(input: unknown): Promise<ActionResult> {
  const { admin } = await requireAdminPage();
  const parsed = reorderContentSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { type, id, direction } = parsed.data;
    const moved =
      type === "experience"
        ? await reorderExperience(admin.id, id, direction)
        : type === "education"
          ? await reorderEducation(admin.id, id, direction)
          : type === "skill"
            ? await reorderSkills(admin.id, id, direction)
            : await reorderProjects(admin.id, id, direction);

    if (!moved) {
      return { success: false, message: "This item cannot move any further." };
    }

    revalidateContent();
    return { success: true, message: "Display order updated." };
  } catch (error) {
    return { success: false, message: messageFromError(error) };
  }
}
