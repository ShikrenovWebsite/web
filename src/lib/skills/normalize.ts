import { TECHNOLOGY_DICTIONARY } from "@/lib/skills/technology-dictionary";

export type SkillEvidence = {
  sourceType: "GITHUB_REPOSITORY" | "PORTFOLIO_PROJECT" | "CV_IMPORT";
  sourceId: string;
  sourceName: string;
  technology: string;
  confidence: number;
};

const aliases: Record<string, { displayName: string; category: string }> = {
  next: { displayName: "Next.js", category: "Frontend" },
  nextjs: { displayName: "Next.js", category: "Frontend" },
  node: { displayName: "Node.js", category: "Backend" },
  nodejs: { displayName: "Node.js", category: "Backend" },
  postgres: { displayName: "PostgreSQL", category: "Databases" },
  postgresql: { displayName: "PostgreSQL", category: "Databases" },
  tailwind: { displayName: "Tailwind CSS", category: "Frontend" },
  tailwindcss: { displayName: "Tailwind CSS", category: "Frontend" },
  githubactions: { displayName: "GitHub Actions", category: "Infrastructure" },
  cloudflarer2: { displayName: "Cloudflare R2", category: "Cloud" },
  typescript: { displayName: "TypeScript", category: "Languages" },
  javascript: { displayName: "JavaScript", category: "Languages" },
  react: { displayName: "React", category: "Frontend" },
  prisma: { displayName: "Prisma", category: "Databases" },
  docker: { displayName: "Docker", category: "Infrastructure" },
  aws: { displayName: "AWS", category: "Cloud" },
  vercel: { displayName: "Vercel", category: "Cloud" },
  npm: { displayName: "npm", category: "Tooling" },
  pnpm: { displayName: "pnpm", category: "Tooling" },
  stripe: { displayName: "Stripe", category: "APIs and Services" },
  mapbox: { displayName: "Mapbox", category: "APIs and Services" },
  playwright: { displayName: "Playwright", category: "Testing" },
  vitest: { displayName: "Vitest", category: "Testing" },
  jest: { displayName: "Jest", category: "Testing" },
};

function basicNormalize(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\.js\b/g, "js")
    .replace(/[^a-z0-9+#]+/g, "");
}

const technologyAliasKeys = new Map(
  TECHNOLOGY_DICTIONARY.flatMap((technology) => {
    const canonical = basicNormalize(technology.name);
    return technology.aliases.map((alias) => [basicNormalize(alias), canonical]);
  }),
);

export function normalizeSkillKey(value: string) {
  const normalized = basicNormalize(value);
  return (
    technologyAliasKeys.get(normalized) ??
    {
      postgres: "postgresql",
      tailwind: "tailwindcss",
      node: "nodejs",
    }[normalized] ?? normalized
  );
}

export function skillPresentation(value: string) {
  const normalizedKey = normalizeSkillKey(value);
  const known = aliases[normalizedKey];
  if (known) return { normalizedKey, ...known };

  const displayName = value.trim().replace(/\s+/g, " ");
  return {
    normalizedKey,
    displayName,
    category: inferSkillCategory(displayName),
  };
}

export function inferSkillCategory(value: string) {
  const normalized = normalizeSkillKey(value);
  if (/^(html|css|sass|vue|angular|svelte)$/.test(normalized)) return "Frontend";
  if (/^(python|java|go|rust|ruby|php|c|c\+\+|c#)$/.test(normalized)) {
    return "Languages";
  }
  if (/^(mysql|mongodb|redis|neon|supabase|drizzleorm)$/.test(normalized)) {
    return "Databases";
  }
  if (/^(azure|googlecloud|cloudflare)$/.test(normalized)) return "Cloud";
  if (/^(git|yarn|bun|webpack|vite)$/.test(normalized)) return "Tooling";
  return "Tooling";
}

export function aggregateSkillEvidence(evidence: SkillEvidence[]) {
  const grouped = new Map<
    string,
    {
      normalizedKey: string;
      displayName: string;
      category: string;
      sourceTypes: string[];
      evidence: SkillEvidence[];
      sourceCount: number;
      confidence: number;
    }
  >();

  for (const item of evidence) {
    const presentation = skillPresentation(item.technology);
    if (!presentation.normalizedKey) continue;
    const current = grouped.get(presentation.normalizedKey) ?? {
      ...presentation,
      sourceTypes: [],
      evidence: [],
      sourceCount: 0,
      confidence: 0,
    };
    const evidenceKey = `${item.sourceType}:${item.sourceId}`;
    if (
      !current.evidence.some(
        (existing) =>
          `${existing.sourceType}:${existing.sourceId}` === evidenceKey,
      )
    ) {
      current.evidence.push(item);
    }
    current.sourceTypes = [
      ...new Set([...current.sourceTypes, item.sourceType]),
    ];
    current.sourceCount = current.evidence.length;
    current.confidence = Math.max(current.confidence, item.confidence);
    grouped.set(presentation.normalizedKey, current);
  }

  return [...grouped.values()].sort(
    (left, right) =>
      right.confidence - left.confidence ||
      left.displayName.localeCompare(right.displayName),
  );
}

export function resolvedSuggestionState(input: {
  existingStatus?: "PENDING" | "ACCEPTED" | "IGNORED";
  existingSkillId?: string | null;
  canonicalSkillId?: string | null;
}) {
  if (input.canonicalSkillId) {
    return { status: "ACCEPTED" as const, skillId: input.canonicalSkillId };
  }
  return {
    status: input.existingStatus ?? ("PENDING" as const),
    skillId: input.existingSkillId ?? null,
  };
}
