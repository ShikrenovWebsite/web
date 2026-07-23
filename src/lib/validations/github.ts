import { z } from "zod";

export const repositoryIdSchema = z.object({
  repositoryId: z.string().cuid(),
});

export const repositoryReviewSchema = repositoryIdSchema.extend({
  status: z.enum(["PENDING", "IGNORED"]),
});

export const githubProjectFieldSchema = repositoryIdSchema.extend({
  field: z.enum([
    "title",
    "shortDescription",
    "longDescription",
    "technologies",
    "liveUrl",
    "sourceCodeUrl",
  ]),
});

export const unavailableRepositoryActionSchema = repositoryIdSchema.extend({
  action: z.enum(["KEEP", "UNPUBLISH", "DISCONNECT", "REMOVE_PROJECT"]),
});

export const organizationSyncPreferenceSchema = z.object({
  ownerId: z.string().cuid(),
  syncEnabled: z.boolean(),
});

export const githubAccessTestSchema = z.object({
  organizationLogin: z
    .string()
    .trim()
    .min(1)
    .max(39)
    .regex(
      /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i,
      "Enter a valid GitHub organization login.",
    ),
  repositoryName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/, "Enter a valid GitHub repository name."),
});
