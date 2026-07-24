import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  normalizeSkillKey,
  resolvedSuggestionState,
} from "@/lib/skills/normalize";
import { detectTechnologies } from "@/lib/skills/technology-dictionary";

type StoredEvidence = {
  sourceType: string;
  sourceId: string;
  sourceName: string;
  technology: string;
  confidence: number;
  matchedAliases?: string[];
};

function evidenceArray(value: Prisma.JsonValue): StoredEvidence[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is StoredEvidence =>
          typeof item === "object" &&
          item !== null &&
          "sourceType" in item &&
          "sourceId" in item &&
          typeof item.sourceType === "string" &&
          typeof item.sourceId === "string",
      )
    : [];
}

export async function stageCvTechnologySuggestions(input: {
  userId: string;
  cvUploadId: string;
  sourceName: string;
  text: string;
}) {
  const detected = detectTechnologies(input.text);
  const [existingSuggestions, skills] = await Promise.all([
    db.skillSuggestion.findMany({ where: { userId: input.userId } }),
    db.skill.findMany({
      where: { userId: input.userId },
      select: { id: true, name: true },
    }),
  ]);
  const existingByKey = new Map(
    existingSuggestions.map((item) => [item.normalizedKey, item]),
  );
  const skillByKey = new Map(
    skills.map((item) => [normalizeSkillKey(item.name), item]),
  );

  await db.$transaction(
    detected.map((technology) => {
      const normalizedKey = normalizeSkillKey(technology.name);
      const existing = existingByKey.get(normalizedKey);
      const evidence = evidenceArray(existing?.evidence ?? []).filter(
        (item) =>
          !(
            item.sourceType === "CV_IMPORT" &&
            item.sourceId === input.cvUploadId
          ),
      );
      evidence.push({
        sourceType: "CV_IMPORT",
        sourceId: input.cvUploadId,
        sourceName: input.sourceName,
        technology: technology.name,
        confidence: 0.95,
        matchedAliases: technology.matchedAliases,
      });
      const resolution = resolvedSuggestionState({
        existingStatus: existing?.status,
        existingSkillId: existing?.skillId,
        canonicalSkillId: skillByKey.get(normalizedKey)?.id,
      });
      return db.skillSuggestion.upsert({
        where: { userId_normalizedKey: { userId: input.userId, normalizedKey } },
        create: {
          userId: input.userId,
          normalizedKey,
          displayName: technology.name,
          category: technology.category,
          sourceTypes: ["CV_IMPORT"],
          evidence: evidence as unknown as Prisma.InputJsonValue,
          sourceCount: evidence.length,
          confidence: 0.95,
          status: resolution.status,
          skillId: resolution.skillId,
        },
        update: {
          displayName: existing?.displayName ?? technology.name,
          category: existing?.category ?? technology.category,
          sourceTypes: [
            ...new Set([...(existing?.sourceTypes ?? []), "CV_IMPORT"]),
          ],
          evidence: evidence as unknown as Prisma.InputJsonValue,
          sourceCount: evidence.length,
          confidence: Math.max(existing?.confidence ?? 0, 0.95),
          status: resolution.status,
          skillId: resolution.skillId,
          lastDetectedAt: new Date(),
        },
      });
    }),
  );
  return detected;
}

export function suggestionBelongsToCvUpload(
  evidence: Prisma.JsonValue,
  cvUploadId: string,
) {
  return evidenceArray(evidence).some(
    (item) =>
      item.sourceType === "CV_IMPORT" && item.sourceId === cvUploadId,
  );
}
