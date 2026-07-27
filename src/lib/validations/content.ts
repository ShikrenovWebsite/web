import { z } from "zod";

export const publicationStatusSchema = z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]);
export const sourceTypeSchema = z.enum(["MANUAL", "CV_IMPORT", "GITHUB"]);

const optionalText = (maximum: number) => z.string().trim().max(maximum);
const dateText = z
  .string()
  .refine(
    (value) => value === "" || !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
    "Enter a valid date.",
  );
const urlText = z
  .string()
  .trim()
  .refine((value) => value === "" || z.url().safeParse(value).success, {
    message: "Enter a valid URL including https://.",
  });

export const profileSchema = z.object({
  fullName: optionalText(120),
  professionalTitle: optionalText(160),
  biography: optionalText(5000),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Enter a valid email address.",
    }),
  phone: optionalText(50),
  location: optionalText(160),
  websiteUrl: urlText,
  status: publicationStatusSchema,
  displayOrder: z.number().int().min(0).max(100000),
});

export const experienceSchema = z
  .object({
    id: z.string().cuid().optional(),
    company: z.string().trim().min(1, "Company is required.").max(160),
    role: z.string().trim().min(1, "Role is required.").max(160),
    employmentType: optionalText(100),
    location: optionalText(160),
    description: optionalText(5000),
    highlightsText: optionalText(5000),
    startDate: dateText,
    endDate: dateText,
    isCurrent: z.boolean(),
    status: publicationStatusSchema,
    displayOrder: z.number().int().min(0).max(100000),
  })
  .refine(
    ({ startDate, endDate, isCurrent }) =>
      isCurrent ||
      !startDate ||
      !endDate ||
      new Date(endDate) >= new Date(startDate),
    {
      message: "End date must not be before the start date.",
      path: ["endDate"],
    },
  );

export const educationSchema = z
  .object({
    id: z.string().cuid().optional(),
    institution: z
      .string()
      .trim()
      .min(1, "Institution is required.")
      .max(200),
    qualification: optionalText(200),
    fieldOfStudy: optionalText(200),
    location: optionalText(160),
    description: optionalText(5000),
    achievementsText: optionalText(5000),
    startDate: dateText,
    endDate: dateText,
    status: publicationStatusSchema,
    displayOrder: z.number().int().min(0).max(100000),
  })
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || new Date(endDate) >= new Date(startDate),
    {
      message: "End date must not be before the start date.",
      path: ["endDate"],
    },
  );

export const skillSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(1, "Skill name is required.").max(100),
  category: optionalText(100),
  proficiency: optionalText(100),
  status: publicationStatusSchema,
  displayOrder: z.number().int().min(0).max(100000),
});

export const projectSchema = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string().trim().min(1, "Project title is required.").max(160),
    shortDescription: optionalText(300),
    longDescription: optionalText(10000),
    highlightsText: optionalText(10000),
    technologiesText: optionalText(2000),
    liveUrl: urlText,
    sourceCodeUrl: urlText,
    coverImageUrl: urlText,
    startDate: dateText,
    endDate: dateText,
    featured: z.boolean(),
    status: publicationStatusSchema,
    sourceType: sourceTypeSchema,
    displayOrder: z.number().int().min(0).max(100000),
  })
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || new Date(endDate) >= new Date(startDate),
    {
      message: "End date must not be before the start date.",
      path: ["endDate"],
    },
  );

export const contentTypeSchema = z.enum([
  "profile",
  "experience",
  "education",
  "skill",
  "project",
]);

export const portfolioRecordIdSchema = z.string().refine(
  (value) =>
    z.string().cuid().safeParse(value).success ||
    /^seed-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
  "Invalid record ID.",
);

export const deleteContentSchema = z.object({
  type: contentTypeSchema,
  id: portfolioRecordIdSchema,
});

export const changeStatusSchema = deleteContentSchema.extend({
  status: publicationStatusSchema,
});

export const reorderContentSchema = z.object({
  type: z.enum(["experience", "education", "skill", "project"]),
  id: portfolioRecordIdSchema,
  direction: z.enum(["up", "down"]),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
