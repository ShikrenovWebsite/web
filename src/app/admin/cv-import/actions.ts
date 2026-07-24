"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type ImportItemType } from "@/generated/prisma/client";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { schemaForImportItem } from "@/lib/cv/schema";
import { extractCvText } from "@/lib/cv/extract";
import { parseCvDocument } from "@/lib/cv/parser";
import { stageCvImport } from "@/lib/cv/stage";
import { stageCvTechnologySuggestions } from "@/lib/cv/technologies";
import { db } from "@/lib/db";

export type CvActionResult = {
  success: boolean;
  message: string;
};

const reviewItemSchema = z.object({
  itemId: z.string().cuid(),
  resolution: z.enum([
    "CREATE_NEW",
    "KEEP_EXISTING",
    "REPLACE",
    "MERGE",
    "SKIP",
  ]),
  editedJson: z.string().max(100_000),
});

const runSchema = z.object({ importRunId: z.string().cuid() });
const uploadSchema = z.object({ cvUploadId: z.string().cuid() });

function dateValue(value: unknown) {
  return typeof value === "string" && value
    ? new Date(`${value.length === 4 ? `${value}-01-01` : value.length === 7 ? `${value}-01` : value}T00:00:00.000Z`)
    : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

function array(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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

async function transactionSlug(
  transaction: Prisma.TransactionClient,
  userId: string,
  title: string,
) {
  const root = slugify(title);
  let slug = root;
  let suffix = 2;
  while (
    await transaction.portfolioProject.findFirst({
      where: { userId, slug },
      select: { id: true },
    })
  ) {
    slug = `${root}-${suffix++}`;
  }
  return slug;
}

function mergeText(current: string | null, incoming: unknown) {
  return current || text(incoming);
}

export async function updateCvImportItem(
  input: unknown,
): Promise<CvActionResult> {
  const { admin } = await requireAdminPage("/admin/cv-import");
  const parsed = reviewItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid review decision." };
  }
  const item = await db.cvImportItem.findFirst({
    where: {
      id: parsed.data.itemId,
      importRun: { userId: admin.id },
    },
    include: { importRun: { select: { status: true } } },
  });
  if (!item) return { success: false, message: "Import item not found." };
  if (item.importRun.status === "COMPLETED") {
    return {
      success: false,
      message: "Create a new review draft before changing a completed import.",
    };
  }

  let edited: unknown;
  try {
    edited = JSON.parse(parsed.data.editedJson);
  } catch {
    return { success: false, message: "Edited proposal must be valid JSON." };
  }
  const itemSchema = schemaForImportItem(item.itemType);
  const validated = itemSchema?.safeParse(edited);
  if (!validated?.success) {
    return {
      success: false,
      message:
        validated?.error.issues[0]?.message ?? "The edited proposal is invalid.",
    };
  }
  if (
    ["MERGE", "REPLACE", "KEEP_EXISTING"].includes(parsed.data.resolution) &&
    !item.existingRecordId
  ) {
    return {
      success: false,
      message: "That decision requires a verified existing record.",
    };
  }

  await db.cvImportItem.update({
    where: { id: item.id },
    data: {
      resolution: parsed.data.resolution,
      editedData: validated.data as Prisma.InputJsonValue,
      status: parsed.data.resolution === "SKIP" ? "SKIPPED" : "ACCEPTED",
    },
  });
  revalidatePath("/admin/cv-import");
  return { success: true, message: "Review decision saved." };
}

async function applyItem(
  transaction: Prisma.TransactionClient,
  userId: string,
  item: {
    id: string;
    itemType: ImportItemType;
    resolution:
      | "CREATE_NEW"
      | "KEEP_EXISTING"
      | "REPLACE"
      | "MERGE"
      | "SKIP"
      | null;
    importedData: Prisma.JsonValue;
    editedData: Prisma.JsonValue | null;
    existingRecordId: string | null;
    createdRecordId: string | null;
  },
) {
  if (item.createdRecordId) {
    return { action: "already_applied", recordId: item.createdRecordId };
  }
  if (!item.resolution || ["SKIP", "KEEP_EXISTING"].includes(item.resolution)) {
    return {
      action: item.resolution === "KEEP_EXISTING" ? "kept_existing" : "skipped",
      recordId: item.existingRecordId,
    };
  }
  const schema = schemaForImportItem(item.itemType);
  const parsed = schema?.parse(item.editedData ?? item.importedData) as Record<
    string,
    unknown
  >;
  const replacing = item.resolution === "REPLACE";
  const merging = item.resolution === "MERGE";
  const existingId = item.existingRecordId;
  let recordId = existingId;

  if (item.itemType === "PROFILE") {
    const existing = await transaction.portfolioProfile.findUnique({
      where: { userId },
    });
    const socialLinks = {
      ...(typeof existing?.socialLinks === "object" &&
      existing.socialLinks &&
      !Array.isArray(existing.socialLinks)
        ? existing.socialLinks
        : {}),
      ...(text(parsed.github) ? { github: text(parsed.github) } : {}),
      ...(text(parsed.linkedin) ? { linkedin: text(parsed.linkedin) } : {}),
    };
    const data = {
      fullName: replacing
        ? text(parsed.fullName)
        : mergeText(existing?.fullName ?? null, parsed.fullName),
      professionalTitle: replacing
        ? text(parsed.headline)
        : mergeText(existing?.professionalTitle ?? null, parsed.headline),
      biography: replacing
        ? text(parsed.summary)
        : mergeText(existing?.biography ?? null, parsed.summary),
      location: replacing
        ? text(parsed.location)
        : mergeText(existing?.location ?? null, parsed.location),
      email: replacing
        ? text(parsed.email)
        : mergeText(existing?.email ?? null, parsed.email),
      phone: replacing
        ? text(parsed.phone)
        : mergeText(existing?.phone ?? null, parsed.phone),
      websiteUrl: replacing
        ? text(parsed.website)
        : mergeText(existing?.websiteUrl ?? null, parsed.website),
      socialLinks,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    const result = await transaction.portfolioProfile.upsert({
      where: { userId },
      update: data,
      create: {
        ...data,
        userId,
        status: "PUBLISHED",
        publishedAt: new Date(),
        sourceType: "CV_IMPORT",
        sourceReferenceId: item.id,
      },
    });
    recordId = result.id;
  } else if (item.itemType === "EXPERIENCE") {
    const existing = existingId
      ? await transaction.experience.findFirst({
          where: { id: existingId, userId },
        })
      : null;
    if (existingId && !existing) throw new Error("Experience match is unavailable.");
    const incomingHighlights = array(parsed.achievements);
    const data = {
      company:
        merging && existing ? existing.company : String(parsed.company),
      role: merging && existing ? existing.role : String(parsed.role),
      employmentType:
        merging && existing
          ? mergeText(existing.employmentType, parsed.employmentType)
          : text(parsed.employmentType),
      location:
        merging && existing
          ? mergeText(existing.location, parsed.location)
          : text(parsed.location),
      description:
        merging && existing
          ? mergeText(existing.description, parsed.description)
          : text(parsed.description),
      highlights:
        merging && existing
          ? [...new Set([...existing.highlights, ...incomingHighlights])]
          : incomingHighlights,
      startDate:
        merging && existing && existing.startDate
          ? existing.startDate
          : dateValue(parsed.startDate),
      endDate:
        merging && existing && existing.endDate
          ? existing.endDate
          : dateValue(parsed.endDate),
      isCurrent: Boolean(parsed.isCurrent),
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    const result = existing
      ? await transaction.experience.update({ where: { id: existing.id }, data })
      : await transaction.experience.create({
          data: {
            ...data,
            userId,
            status: "PUBLISHED",
            sourceType: "CV_IMPORT",
            sourceReferenceId: item.id,
          },
        });
    recordId = result.id;
  } else if (item.itemType === "EDUCATION") {
    const existing = existingId
      ? await transaction.education.findFirst({ where: { id: existingId, userId } })
      : null;
    if (existingId && !existing) throw new Error("Education match is unavailable.");
    const incomingAchievements = array(parsed.achievements);
    const data = {
      institution:
        merging && existing ? existing.institution : String(parsed.institution),
      qualification:
        merging && existing
          ? mergeText(existing.qualification, parsed.degree)
          : text(parsed.degree),
      fieldOfStudy:
        merging && existing
          ? mergeText(existing.fieldOfStudy, parsed.fieldOfStudy)
          : text(parsed.fieldOfStudy),
      location:
        merging && existing
          ? mergeText(existing.location, parsed.location)
          : text(parsed.location),
      description:
        merging && existing
          ? mergeText(existing.description, parsed.description)
          : text(parsed.description),
      achievements:
        merging && existing
          ? [...new Set([...existing.achievements, ...incomingAchievements])]
          : incomingAchievements,
      startDate:
        merging && existing && existing.startDate
          ? existing.startDate
          : dateValue(parsed.startDate),
      endDate:
        merging && existing && existing.endDate
          ? existing.endDate
          : dateValue(parsed.endDate),
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    const result = existing
      ? await transaction.education.update({ where: { id: existing.id }, data })
      : await transaction.education.create({
          data: {
            ...data,
            userId,
            status: "PUBLISHED",
            sourceType: "CV_IMPORT",
            sourceReferenceId: item.id,
          },
        });
    recordId = result.id;
  } else if (item.itemType === "SKILL") {
    const existing = existingId
      ? await transaction.skill.findFirst({ where: { id: existingId, userId } })
      : null;
    if (existingId && !existing) throw new Error("Skill match is unavailable.");
    const data = {
      name: merging && existing ? existing.name : String(parsed.name),
      category:
        merging && existing
          ? mergeText(existing.category, parsed.category)
          : text(parsed.category),
      proficiency:
        merging && existing
          ? mergeText(existing.proficiency, parsed.proficiency)
          : text(parsed.proficiency),
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    const result = existing
      ? await transaction.skill.update({ where: { id: existing.id }, data })
      : await transaction.skill.create({
          data: {
            ...data,
            userId,
            status: "PUBLISHED",
            sourceType: "CV_IMPORT",
            sourceReferenceId: item.id,
          },
        });
    recordId = result.id;
  } else if (item.itemType === "PROJECT") {
    const existing = existingId
      ? await transaction.portfolioProject.findFirst({
          where: { id: existingId, userId },
        })
      : null;
    if (existingId && !existing) throw new Error("Project match is unavailable.");
    const incomingTechnologies = array(parsed.technologies);
    const incomingHighlights = array(parsed.achievements);
    const title =
      merging && existing ? existing.title : String(parsed.title);
    const data = {
      title,
      shortDescription:
        merging && existing
          ? mergeText(existing.shortDescription, parsed.shortSummary)
          : text(parsed.shortSummary),
      longDescription:
        merging && existing
          ? mergeText(existing.longDescription, parsed.description)
          : text(parsed.description),
      highlights:
        merging && existing
          ? [...new Set([...existing.highlights, ...incomingHighlights])]
          : incomingHighlights,
      technologies:
        merging && existing
          ? [...new Set([...existing.technologies, ...incomingTechnologies])]
          : incomingTechnologies,
      liveUrl:
        merging && existing
          ? mergeText(existing.liveUrl, parsed.liveUrl)
          : text(parsed.liveUrl),
      sourceCodeUrl:
        merging && existing
          ? mergeText(existing.sourceCodeUrl, parsed.sourceUrl)
          : text(parsed.sourceUrl),
      startDate:
        merging && existing && existing.startDate
          ? existing.startDate
          : dateValue(parsed.startDate),
      endDate:
        merging && existing && existing.endDate
          ? existing.endDate
          : dateValue(parsed.endDate),
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    const result = existing
      ? await transaction.portfolioProject.update({
          where: { id: existing.id },
          data,
        })
      : await transaction.portfolioProject.create({
          data: {
            ...data,
            slug: await transactionSlug(transaction, userId, title),
            userId,
            status: "PUBLISHED",
            featured: false,
            sourceType: "CV_IMPORT",
            sourceReferenceId: item.id,
          },
        });
    recordId = result.id;
  } else if (item.itemType === "CERTIFICATION") {
    const existing = existingId
      ? await transaction.certification.findFirst({
          where: { id: existingId, userId },
        })
      : null;
    const data = {
      name: merging && existing ? existing.name : String(parsed.name),
      issuer:
        merging && existing
          ? mergeText(existing.issuer, parsed.issuer)
          : text(parsed.issuer),
      credentialUrl:
        merging && existing
          ? mergeText(existing.credentialUrl, parsed.credentialUrl)
          : text(parsed.credentialUrl),
      credentialId:
        merging && existing
          ? mergeText(existing.credentialId, parsed.credentialId)
          : text(parsed.credentialId),
      issuedAt:
        merging && existing && existing.issuedAt
          ? existing.issuedAt
          : dateValue(parsed.issuedAt),
      expiresAt:
        merging && existing && existing.expiresAt
          ? existing.expiresAt
          : dateValue(parsed.expiresAt),
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    const result = existing
      ? await transaction.certification.update({ where: { id: existing.id }, data })
      : await transaction.certification.create({
          data: {
            ...data,
            userId,
            status: "PUBLISHED",
            sourceType: "CV_IMPORT",
            sourceReferenceId: item.id,
          },
        });
    recordId = result.id;
  } else if (item.itemType === "LANGUAGE") {
    const existing = existingId
      ? await transaction.language.findFirst({ where: { id: existingId, userId } })
      : null;
    const data = {
      name: merging && existing ? existing.name : String(parsed.name),
      proficiency:
        merging && existing
          ? mergeText(existing.proficiency, parsed.proficiency)
          : text(parsed.proficiency),
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    const result = existing
      ? await transaction.language.update({ where: { id: existing.id }, data })
      : await transaction.language.create({
          data: {
            ...data,
            userId,
            status: "PUBLISHED",
            sourceType: "CV_IMPORT",
            sourceReferenceId: item.id,
          },
        });
    recordId = result.id;
  }

  if (!recordId) throw new Error("Import item did not create or update a record.");
  return {
    action: existingId ? (replacing ? "replaced" : "merged") : "created",
    recordId,
  };
}

export async function applyCvImport(input: unknown): Promise<CvActionResult> {
  const { admin } = await requireAdminPage("/admin/cv-import");
  const parsed = runSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid import run." };
  const run = await db.cvImportRun.findFirst({
    where: { id: parsed.data.importRunId, userId: admin.id },
    include: { items: { orderBy: { displayOrder: "asc" } }, cvUpload: true },
  });
  if (!run) return { success: false, message: "Import run not found." };
  if (run.status === "COMPLETED") {
    return { success: true, message: "This reviewed import was already applied." };
  }
  const unresolved = run.items.filter((item) => !item.resolution);
  if (unresolved.length) {
    return {
      success: false,
      message: `${unresolved.length} item${unresolved.length === 1 ? " still needs" : "s still need"} an explicit import or skip decision.`,
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const audit: Array<{
        itemId: string;
        itemType: ImportItemType;
        action: string;
        recordId: string | null;
      }> = [];
      for (const item of run.items) {
        const result = await applyItem(transaction, admin.id, item);
        audit.push({ itemId: item.id, itemType: item.itemType, ...result });
        await transaction.cvImportItem.update({
          where: { id: item.id },
          data: {
            status:
              result.action === "skipped" || result.action === "kept_existing"
                ? "SKIPPED"
                : "ACCEPTED",
            createdRecordId: result.recordId,
            appliedAt: new Date(),
            publishedAt:
              result.action === "skipped" ||
              result.action === "kept_existing"
                ? null
                : new Date(),
          },
        });
      }
      const importedCount = audit.filter(
        (item) => !["skipped", "kept_existing"].includes(item.action),
      ).length;
      const skippedCount = audit.length - importedCount;
      await transaction.cvImportRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          importAudit: audit as unknown as Prisma.InputJsonValue,
          appliedAt: new Date(),
          completedAt: new Date(),
        },
      });
      await transaction.cvUpload.update({
        where: { id: run.cvUploadId },
        data: {
          status: skippedCount ? "PARTIALLY_IMPORTED" : "IMPORTED",
        },
      });
    });
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/cv-import");
    revalidatePath("/admin/profile");
    revalidatePath("/admin/experience");
    revalidatePath("/admin/education");
    revalidatePath("/admin/skills");
    revalidatePath("/admin/projects");
    return {
      success: true,
      message:
        "Approved CV data was applied transactionally and queued for the next portfolio publication.",
    };
  } catch {
    return {
      success: false,
      message:
        "The import could not be applied. No canonical changes were committed; the review draft is available for retry.",
    };
  }
}

export async function reviewCvImportAgain(
  input: unknown,
): Promise<CvActionResult & { importRunId?: string }> {
  const { admin } = await requireAdminPage("/admin/cv-import");
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid CV upload." };
  const upload = await db.cvUpload.findFirst({
    where: { id: parsed.data.cvUploadId, userId: admin.id },
    include: {
      mediaAsset: { select: { fileData: true } },
    },
  });
  if (!upload?.mediaAsset.fileData) {
    return { success: false, message: "The private source file is unavailable." };
  }
  try {
    const extraction = await extractCvText(
      Buffer.from(upload.mediaAsset.fileData),
      upload.mimeType,
    );
    const parsedDocument = parseCvDocument({
      pages: extraction.pages,
      truncated: extraction.truncated,
      extractionWarnings: extraction.warnings,
    });
    const run = await stageCvImport({
      userId: admin.id,
      cvUploadId: upload.id,
      draft: parsedDocument.draft,
      itemMetadata: parsedDocument.itemMetadata,
      diagnostics: parsedDocument.diagnostics,
    });
    await stageCvTechnologySuggestions({
      userId: admin.id,
      cvUploadId: upload.id,
      sourceName: upload.originalName,
      text: extraction.pages.map((page) => page.text).join("\n"),
    });
    await db.cvUpload.update({
      where: { id: upload.id },
      data: {
        status: "READY_FOR_REVIEW",
        extractedText: extraction.text,
        extractionWarnings: extraction.warnings,
        pageCount: extraction.pageCount,
        scannedLikely: extraction.scannedLikely,
        extractedAt: new Date(),
        extractionMetadata: {
          pageCount: extraction.pageCount,
          truncated: extraction.truncated,
          pages: extraction.pages.map((page) => ({
            pageNumber: page.pageNumber,
            characterCount: page.text.length,
            lineCount: page.text.split(/\r?\n/).length,
          })),
        },
      },
    });
    revalidatePath("/admin/cv-import");
    return {
      success: true,
      message: "A fresh review draft was created. Existing portfolio data was not changed.",
      importRunId: run.id,
    };
  } catch {
    return {
      success: false,
      message: "The stored CV could not be parsed again.",
    };
  }
}

export async function deleteCvImportHistory(
  input: unknown,
): Promise<CvActionResult> {
  const { admin } = await requireAdminPage("/admin/cv-import");
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid CV upload." };
  const upload = await db.cvUpload.findFirst({
    where: { id: parsed.data.cvUploadId, userId: admin.id },
    select: { id: true, mediaAssetId: true },
  });
  if (!upload) return { success: false, message: "CV history was not found." };
  await db.$transaction(async (transaction) => {
    await transaction.cvUpload.delete({ where: { id: upload.id } });
    await transaction.mediaAsset.deleteMany({
      where: {
        id: upload.mediaAssetId,
        userId: admin.id,
        kind: "CV",
      },
    });
  });
  revalidatePath("/admin/cv-import");
  return {
    success: true,
    message: "CV source and import history deleted. Portfolio records were preserved.",
  };
}
