import { z } from "zod";

export const databaseCuidSchema = z.string().trim().cuid();

// Portfolio rows created by Prisma use CUIDs, but older seed data contains
// stable IDs such as "seed-education-computer-science". These are opaque
// database identifiers, not route IDs, and ownership is verified separately.
export const portfolioRecordIdSchema = z
  .string()
  .trim()
  .min(1, "A selected portfolio record is missing an ID.")
  .max(191)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "A selected portfolio record has an invalid ID.",
  );

export const contactFieldSchema = z.enum([
  "email",
  "phone",
  "location",
  "website",
  "links",
]);

export const cvVersionInputSchema = z.object({
  id: databaseCuidSchema.optional(),
  name: z.string().trim().min(1).max(120),
  customHeadline: z.string().trim().max(200),
  customSummary: z.string().trim().max(10_000),
  selectedExperienceIds: z.array(portfolioRecordIdSchema).max(100),
  selectedProjectIds: z.array(portfolioRecordIdSchema).max(100),
  selectedEducationIds: z.array(portfolioRecordIdSchema).max(100),
  selectedSkillIds: z.array(portfolioRecordIdSchema).max(200),
  selectedCertificationIds: z.array(portfolioRecordIdSchema).max(100),
  selectedLanguageIds: z.array(portfolioRecordIdSchema).max(100),
  contactFields: z.array(contactFieldSchema).max(5),
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
    .min(1)
    .refine(
      (items) => new Set(items).size === items.length,
      "Each CV section can appear only once.",
    ),
  overridesJson: z.string().max(100_000),
});

export type CvVersionInput = z.infer<typeof cvVersionInputSchema>;

export function suggestUniqueCvVersionName(
  requestedName: string,
  existingNames: Iterable<string>,
) {
  const names = new Set(existingNames);
  if (!names.has(requestedName)) return requestedName;

  const suffixMatch = requestedName.match(/^(.*) \((\d+)\)$/);
  const baseName =
    suffixMatch && Number(suffixMatch[2]) >= 2
      ? suffixMatch[1]
      : requestedName;
  let suffix = 2;
  while (names.has(`${baseName} (${suffix})`)) suffix += 1;
  return `${baseName} (${suffix})`;
}

export async function allocateUniqueCvVersionName<T>(input: {
  requestedName: string;
  exclusive: <TResult>(operation: () => Promise<TResult>) => Promise<TResult>;
  listExistingNames: () => Promise<string[]>;
  create: (name: string) => Promise<T>;
}) {
  return input.exclusive(async () => {
    const existingNames = await input.listExistingNames();
    const name = suggestUniqueCvVersionName(
      input.requestedName,
      existingNames,
    );
    return {
      name,
      renamed: name !== input.requestedName,
      created: await input.create(name),
    };
  });
}

export function cvVersionSavedMessage(
  requestedName: string,
  savedName: string,
  created: boolean,
) {
  if (requestedName !== savedName) {
    return `A CV version with this name already exists. ${created ? "Created" : "Saved"} as "${savedName}".`;
  }
  return created ? "CV version created." : "CV version updated.";
}

export function cvPreviewPath(id: string) {
  return `/admin/cv/${databaseCuidSchema.parse(id)}/preview`;
}

export async function createCvVersionForPreview(
  create: () => Promise<{ id: string }>,
) {
  const created = await create();
  const id = databaseCuidSchema.parse(created.id);
  return { id, previewPath: cvPreviewPath(id) };
}
