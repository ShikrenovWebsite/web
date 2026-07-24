import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      (() => {
        try {
          return ["http:", "https:"].includes(new URL(value).protocol);
        } catch {
          return false;
        }
      })(),
    "Only HTTP(S) URLs are allowed.",
  );

const optionalDate = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(value),
    "Use YYYY, YYYY-MM, or YYYY-MM-DD.",
  );

export const cvProfileSchema = z.object({
  fullName: z.string().trim().max(160).default(""),
  headline: z.string().trim().max(200).default(""),
  summary: z.string().trim().max(10_000).default(""),
  location: z.string().trim().max(200).default(""),
  email: z.union([z.literal(""), z.email()]).default(""),
  phone: z.string().trim().max(80).default(""),
  website: optionalUrl.default(""),
  github: optionalUrl.default(""),
  linkedin: optionalUrl.default(""),
  otherLinks: z
    .array(z.object({ label: z.string().max(120), url: optionalUrl }))
    .default([]),
});

export const cvExperienceSchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  employmentType: z.string().trim().max(100).default(""),
  location: z.string().trim().max(200).default(""),
  startDate: optionalDate.default(""),
  endDate: optionalDate.default(""),
  isCurrent: z.boolean().default(false),
  description: z.string().trim().max(20_000).default(""),
  achievements: z.array(z.string().trim().min(1).max(2000)).default([]),
  technologies: z.array(z.string().trim().min(1).max(120)).default([]),
});

export const cvEducationSchema = z.object({
  institution: z.string().trim().min(1).max(250),
  degree: z.string().trim().max(200).default(""),
  fieldOfStudy: z.string().trim().max(200).default(""),
  location: z.string().trim().max(200).default(""),
  startDate: optionalDate.default(""),
  endDate: optionalDate.default(""),
  description: z.string().trim().max(10_000).default(""),
  achievements: z.array(z.string().trim().min(1).max(2000)).default([]),
});

export const cvProjectSchema = z.object({
  title: z.string().trim().min(1).max(200),
  shortSummary: z.string().trim().max(500).default(""),
  description: z.string().trim().max(20_000).default(""),
  achievements: z.array(z.string().trim().min(1).max(2000)).default([]),
  technologies: z.array(z.string().trim().min(1).max(120)).default([]),
  liveUrl: optionalUrl.default(""),
  sourceUrl: optionalUrl.default(""),
  startDate: optionalDate.default(""),
  endDate: optionalDate.default(""),
});

export const cvSkillSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().max(120).default(""),
  proficiency: z.string().trim().max(120).default(""),
  sourceSection: z.string().trim().max(120).default("Skills"),
});

export const cvCertificationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  issuer: z.string().trim().max(200).default(""),
  credentialUrl: optionalUrl.default(""),
  credentialId: z.string().trim().max(200).default(""),
  issuedAt: optionalDate.default(""),
  expiresAt: optionalDate.default(""),
});

export const cvLanguageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  proficiency: z.string().trim().max(120).default(""),
});

export const cvStructuredDraftSchema = z.object({
  profile: cvProfileSchema,
  experience: z.array(cvExperienceSchema).default([]),
  education: z.array(cvEducationSchema).default([]),
  projects: z.array(cvProjectSchema).default([]),
  skills: z.array(cvSkillSchema).default([]),
  certifications: z.array(cvCertificationSchema).default([]),
  languages: z.array(cvLanguageSchema).default([]),
  courses: z.array(z.string().trim().min(1).max(500)).default([]),
  awards: z.array(z.string().trim().min(1).max(1000)).default([]),
  volunteering: z.array(z.string().trim().min(1).max(2000)).default([]),
  publications: z.array(z.string().trim().min(1).max(2000)).default([]),
  interests: z.array(z.string().trim().min(1).max(500)).default([]),
  unclassified: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(20_000),
        sourcePage: z.number().int().positive(),
        sourceSection: z.string().trim().max(120),
        startParagraph: z.number().int().nonnegative(),
        endParagraph: z.number().int().nonnegative(),
        reason: z.string().trim().max(500),
      }),
    )
    .default([]),
});

export type CvStructuredDraft = z.infer<typeof cvStructuredDraftSchema>;

export function schemaForImportItem(type: string) {
  return type === "PROFILE" || type === "CONTACT"
    ? cvProfileSchema
    : type === "EXPERIENCE"
      ? cvExperienceSchema
      : type === "EDUCATION"
        ? cvEducationSchema
        : type === "PROJECT"
          ? cvProjectSchema
          : type === "SKILL"
            ? cvSkillSchema
            : type === "CERTIFICATION"
              ? cvCertificationSchema
              : type === "LANGUAGE"
                ? cvLanguageSchema
                : null;
}
