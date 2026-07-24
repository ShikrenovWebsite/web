import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  aggregateSkillEvidence,
  normalizeSkillKey,
  resolvedSuggestionState,
  type SkillEvidence,
} from "@/lib/skills/normalize";

export async function refreshSkillSuggestions(userId: string) {
  const [repositories, projects, skills, existingSuggestions] =
    await Promise.all([
      db.gitHubRepository.findMany({
        where: {
          connection: { userId },
          status: "ACCEPTED",
        },
        select: {
          id: true,
          fullName: true,
          primaryLanguage: true,
          detectedTechnologies: true,
        },
      }),
      db.portfolioProject.findMany({
        where: { userId },
        select: { id: true, title: true, technologies: true },
      }),
      db.skill.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
      db.skillSuggestion.findMany({
        where: { userId },
        select: {
          id: true,
          normalizedKey: true,
          status: true,
          skillId: true,
          category: true,
          displayName: true,
        },
      }),
    ]);

  const evidence: SkillEvidence[] = [];
  for (const repository of repositories) {
    for (const technology of repository.detectedTechnologies) {
      evidence.push({
        sourceType: "GITHUB_REPOSITORY",
        sourceId: repository.id,
        sourceName: repository.fullName,
        technology,
        confidence: 0.95,
      });
    }
    if (repository.primaryLanguage) {
      evidence.push({
        sourceType: "GITHUB_REPOSITORY",
        sourceId: repository.id,
        sourceName: repository.fullName,
        technology: repository.primaryLanguage,
        confidence: 0.85,
      });
    }
  }
  for (const project of projects) {
    for (const technology of project.technologies) {
      evidence.push({
        sourceType: "PORTFOLIO_PROJECT",
        sourceId: project.id,
        sourceName: project.title,
        technology,
        confidence: 0.9,
      });
    }
  }

  const grouped = aggregateSkillEvidence(evidence);
  const skillByKey = new Map(
    skills.map((skill) => [normalizeSkillKey(skill.name), skill]),
  );
  const existingByKey = new Map(
    existingSuggestions.map((suggestion) => [
      suggestion.normalizedKey,
      suggestion,
    ]),
  );

  await db.$transaction(
    grouped.map((suggestion) => {
      const existing = existingByKey.get(suggestion.normalizedKey);
      const canonicalSkill = skillByKey.get(suggestion.normalizedKey);
      const resolution = resolvedSuggestionState({
        existingStatus: existing?.status,
        existingSkillId: existing?.skillId,
        canonicalSkillId: canonicalSkill?.id,
      });
      return db.skillSuggestion.upsert({
        where: {
          userId_normalizedKey: {
            userId,
            normalizedKey: suggestion.normalizedKey,
          },
        },
        create: {
          userId,
          normalizedKey: suggestion.normalizedKey,
          displayName: suggestion.displayName,
          category: suggestion.category,
          sourceTypes: suggestion.sourceTypes,
          evidence: suggestion.evidence as unknown as Prisma.InputJsonValue,
          sourceCount: suggestion.sourceCount,
          confidence: suggestion.confidence,
          status: resolution.status,
          skillId: resolution.skillId,
        },
        update: {
          displayName: existing?.displayName ?? suggestion.displayName,
          category: existing?.category ?? suggestion.category,
          sourceTypes: suggestion.sourceTypes,
          evidence: suggestion.evidence as unknown as Prisma.InputJsonValue,
          sourceCount: suggestion.sourceCount,
          confidence: suggestion.confidence,
          status: resolution.status,
          skillId: resolution.skillId,
          lastDetectedAt: new Date(),
        },
      });
    }),
  );

  return grouped.length;
}
