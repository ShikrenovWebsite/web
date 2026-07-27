export type DeletableContentType =
  | "profile"
  | "experience"
  | "education"
  | "skill"
  | "project";

type DeleteManyModel = {
  deleteMany(args: {
    where: { id: string; userId: string };
  }): Promise<{ count: number }>;
};

export type ContentDeletionDatabase = {
  portfolioProfile: DeleteManyModel;
  experience: DeleteManyModel;
  education: DeleteManyModel;
  skill: DeleteManyModel;
  portfolioProject: DeleteManyModel;
};

export async function deleteOwnedContentRecord(
  database: ContentDeletionDatabase,
  input: { type: DeletableContentType; id: string; userId: string },
) {
  const where = { id: input.id, userId: input.userId };
  if (input.type === "profile") {
    return database.portfolioProfile.deleteMany({ where });
  }
  if (input.type === "experience") {
    return database.experience.deleteMany({ where });
  }
  if (input.type === "education") {
    return database.education.deleteMany({ where });
  }
  if (input.type === "skill") {
    return database.skill.deleteMany({ where });
  }
  return database.portfolioProject.deleteMany({ where });
}

export function pruneDeletedRecordFromPublication(
  value: unknown,
  type: DeletableContentType,
  id: string,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { changed: false, data: value };
  }

  const data = value as Record<string, unknown>;
  if (type === "profile") {
    const profile = data.profile;
    if (
      profile &&
      typeof profile === "object" &&
      !Array.isArray(profile) &&
      (profile as Record<string, unknown>).id === id
    ) {
      return { changed: true, data: { ...data, profile: null } };
    }
    return { changed: false, data: value };
  }

  const key =
    type === "experience"
      ? "experiences"
      : type === "project"
        ? "projects"
        : `${type}`;
  const records = data[key];
  if (!Array.isArray(records)) return { changed: false, data: value };
  const filtered = records.filter(
    (record) =>
      !record ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      (record as Record<string, unknown>).id !== id,
  );
  if (filtered.length === records.length) {
    return { changed: false, data: value };
  }
  return { changed: true, data: { ...data, [key]: filtered } };
}
