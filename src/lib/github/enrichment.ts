import { createHash } from "node:crypto";

export const GITHUB_ENRICHMENT_VERSION = 1;

export type RepositoryContentFile = {
  path: string;
  sha: string | null;
  size: number | null;
  content: string;
};

export type ReadmeImageSuggestion = {
  url: string;
  alt: string;
  source: string;
};

type RepositoryContext = {
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  primaryLanguage: string | null;
  topics: string[];
};

const dependencyDetectors: Array<{
  names: string[];
  category:
    | "frameworks"
    | "libraries"
    | "databases"
    | "cloudProviders"
    | "deploymentPlatforms"
    | "tools";
  technology: string;
}> = [
  { names: ["next"], category: "frameworks", technology: "Next.js" },
  { names: ["react"], category: "libraries", technology: "React" },
  { names: ["vue"], category: "frameworks", technology: "Vue" },
  { names: ["nuxt"], category: "frameworks", technology: "Nuxt" },
  { names: ["svelte", "@sveltejs/kit"], category: "frameworks", technology: "Svelte" },
  { names: ["@angular/core"], category: "frameworks", technology: "Angular" },
  { names: ["express"], category: "frameworks", technology: "Express" },
  { names: ["fastify"], category: "frameworks", technology: "Fastify" },
  { names: ["nestjs", "@nestjs/core"], category: "frameworks", technology: "NestJS" },
  { names: ["tailwindcss"], category: "libraries", technology: "Tailwind CSS" },
  { names: ["typescript"], category: "tools", technology: "TypeScript" },
  { names: ["prisma", "@prisma/client"], category: "databases", technology: "Prisma" },
  { names: ["drizzle-orm"], category: "databases", technology: "Drizzle ORM" },
  { names: ["pg", "postgres"], category: "databases", technology: "PostgreSQL" },
  { names: ["mysql2"], category: "databases", technology: "MySQL" },
  { names: ["mongoose", "mongodb"], category: "databases", technology: "MongoDB" },
  { names: ["redis", "ioredis"], category: "databases", technology: "Redis" },
  { names: ["@neondatabase/serverless"], category: "databases", technology: "Neon" },
  { names: ["@supabase/supabase-js"], category: "databases", technology: "Supabase" },
  { names: ["@aws-sdk/client-s3", "aws-sdk"], category: "cloudProviders", technology: "AWS" },
  { names: ["@google-cloud/storage"], category: "cloudProviders", technology: "Google Cloud" },
  { names: ["@azure/storage-blob"], category: "cloudProviders", technology: "Azure" },
  { names: ["wrangler", "@cloudflare/workers-types"], category: "cloudProviders", technology: "Cloudflare" },
  { names: ["vercel", "@vercel/node"], category: "deploymentPlatforms", technology: "Vercel" },
  { names: ["vitest"], category: "tools", technology: "Vitest" },
  { names: ["jest"], category: "tools", technology: "Jest" },
  { names: ["playwright", "@playwright/test"], category: "tools", technology: "Playwright" },
];

function unique(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))];
}

function repositoryTitle(name: string) {
  return name
    .replace(/^@[^/]+\//, "")
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function plainMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstReadmeSummary(readme: string) {
  const paragraphs = readme
    .split(/\n\s*\n/)
    .map(plainMarkdown)
    .filter(
      (paragraph) =>
        paragraph.length >= 30 &&
        !paragraph.toLowerCase().includes("badge") &&
        !paragraph.startsWith("http"),
    );
  return {
    short: paragraphs[0]?.slice(0, 220) ?? null,
    long: paragraphs.slice(0, 3).join("\n\n").slice(0, 1600) || null,
  };
}

function resolveReadmeImage(
  rawUrl: string,
  context: RepositoryContext,
) {
  const cleaned = rawUrl.trim().replace(/^<|>$/g, "").split(/\s+"/)[0];
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (/^(data:|javascript:|file:|#)/i.test(cleaned)) return null;
  const normalized = cleaned.replace(/^\.\//, "").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return null;
  return `https://raw.githubusercontent.com/${encodeURIComponent(context.owner)}/${encodeURIComponent(context.name)}/${encodeURIComponent(context.defaultBranch)}/${normalized
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function extractReadmeImages(
  readme: string,
  context: RepositoryContext,
) {
  const candidates: ReadmeImageSuggestion[] = [];
  for (const match of readme.matchAll(/!\[([^\]]*)]\(([^)]+)\)/g)) {
    const url = resolveReadmeImage(match[2], context);
    if (url) candidates.push({ url, alt: match[1] || "Project image", source: "markdown" });
  }
  for (const match of readme.matchAll(
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
  )) {
    const url = resolveReadmeImage(match[1], context);
    const alt = match[0].match(/\balt=["']([^"']*)["']/i)?.[1];
    if (url) candidates.push({ url, alt: alt || "Project image", source: "html" });
  }

  return unique(candidates.map((image) => JSON.stringify(image)))
    .map((image) => JSON.parse(image) as ReadmeImageSuggestion)
    .filter(
      (image) =>
        !/(shields\.io|badge|actions\/workflows|coveralls|codecov)/i.test(
          image.url,
        ),
    )
    .slice(0, 12);
}

export function analyzeRepositoryContents(input: {
  context: RepositoryContext;
  files: RepositoryContentFile[];
  readmeMarkdown: string | null;
}) {
  const categories = {
    frameworks: new Set<string>(),
    libraries: new Set<string>(),
    databases: new Set<string>(),
    cloudProviders: new Set<string>(),
    ciCd: new Set<string>(),
    packageManagers: new Set<string>(),
    deploymentPlatforms: new Set<string>(),
    languages: new Set<string>(),
    tools: new Set<string>(),
  };
  if (input.context.primaryLanguage) {
    categories.languages.add(input.context.primaryLanguage);
  }

  let packageTitle: string | null = null;
  for (const file of input.files) {
    const lowerPath = file.path.toLowerCase();
    const basename = lowerPath.split("/").at(-1) ?? lowerPath;

    if (basename === "package.json") {
      try {
        const manifest = JSON.parse(file.content) as {
          name?: unknown;
          displayName?: unknown;
          productName?: unknown;
          packageManager?: unknown;
          dependencies?: Record<string, unknown>;
          devDependencies?: Record<string, unknown>;
        };
        const titleCandidate =
          manifest.displayName ?? manifest.productName ?? manifest.name;
        if (typeof titleCandidate === "string" && titleCandidate.trim()) {
          packageTitle = titleCandidate.trim();
        }
        const dependencies = new Set([
          ...Object.keys(manifest.dependencies ?? {}),
          ...Object.keys(manifest.devDependencies ?? {}),
        ]);
        for (const detector of dependencyDetectors) {
          if (detector.names.some((name) => dependencies.has(name))) {
            categories[detector.category].add(detector.technology);
          }
        }
        if (typeof manifest.packageManager === "string") {
          categories.packageManagers.add(
            manifest.packageManager.split("@")[0].replace(/^pnpm$/, "pnpm"),
          );
        }
      } catch {
        // A malformed package manifest remains source evidence but is ignored.
      }
    }

    if (["pnpm-lock.yaml", "pnpm-workspace.yaml"].includes(basename)) {
      categories.packageManagers.add("pnpm");
    }
    if (basename === "yarn.lock") categories.packageManagers.add("Yarn");
    if (basename === "package-lock.json") categories.packageManagers.add("npm");
    if (basename === "bun.lockb" || basename === "bun.lock") {
      categories.packageManagers.add("Bun");
    }
    if (basename === "dockerfile" || basename.startsWith("dockerfile.")) {
      categories.tools.add("Docker");
    }
    if (/docker-compose.*\.ya?ml$/.test(basename)) {
      categories.tools.add("Docker Compose");
    }
    if (lowerPath.startsWith(".github/workflows/")) {
      categories.ciCd.add("GitHub Actions");
    }
    if (lowerPath === ".gitlab-ci.yml") categories.ciCd.add("GitLab CI");
    if (lowerPath === ".circleci/config.yml") categories.ciCd.add("CircleCI");
    if (basename === "vercel.json") {
      categories.deploymentPlatforms.add("Vercel");
    }
    if (basename === "netlify.toml") {
      categories.deploymentPlatforms.add("Netlify");
    }
    if (["render.yaml", "render.yml"].includes(basename)) {
      categories.deploymentPlatforms.add("Render");
    }
    if (basename === "fly.toml") categories.deploymentPlatforms.add("Fly.io");
    if (basename === "railway.json") {
      categories.deploymentPlatforms.add("Railway");
    }
    if (basename.startsWith("wrangler.")) {
      categories.cloudProviders.add("Cloudflare");
    }
    if (basename === "schema.prisma" || lowerPath.endsWith("/schema.prisma")) {
      categories.databases.add("Prisma");
    }
    if (basename === "requirements.txt" || basename === "pyproject.toml") {
      categories.languages.add("Python");
    }
    if (basename === "go.mod") categories.languages.add("Go");
    if (basename === "cargo.toml") categories.languages.add("Rust");
    if (basename === "composer.json") categories.languages.add("PHP");
    if (basename === "gemfile") categories.languages.add("Ruby");

    const content = file.content.toLowerCase();
    if (content.includes("postgresql") || content.includes("postgres://")) {
      categories.databases.add("PostgreSQL");
    }
    if (content.includes("neon.tech")) categories.databases.add("Neon");
    if (content.includes("supabase")) categories.databases.add("Supabase");
  }

  const normalizedCategories = Object.fromEntries(
    Object.entries(categories).map(([category, values]) => [
      category,
      unique(values).sort(),
    ]),
  ) as Record<keyof typeof categories, string[]>;
  const technologies = unique([
    ...normalizedCategories.languages,
    ...normalizedCategories.frameworks,
    ...normalizedCategories.libraries,
    ...normalizedCategories.databases,
    ...normalizedCategories.cloudProviders,
    ...normalizedCategories.ciCd,
    ...normalizedCategories.deploymentPlatforms,
    ...normalizedCategories.packageManagers,
    ...normalizedCategories.tools,
    ...input.context.topics,
  ]);
  const readmeSummary = firstReadmeSummary(input.readmeMarkdown ?? "");
  const suggestedTitle =
    packageTitle && !packageTitle.startsWith("@")
      ? repositoryTitle(packageTitle)
      : repositoryTitle(input.context.name);
  const suggestedShortDescription =
    input.context.description?.trim() ||
    readmeSummary.short ||
    (technologies.length
      ? `${suggestedTitle} is built with ${technologies.slice(0, 4).join(", ")}.`
      : null);
  const suggestedLongDescription =
    readmeSummary.long ??
    (suggestedShortDescription
      ? `${suggestedShortDescription}\n\nDetected from the repository's manifests and configuration files.`
      : null);
  const readmeImages = extractReadmeImages(
    input.readmeMarkdown ?? "",
    input.context,
  );
  const sourceFiles = input.files.map((file) => ({
    path: file.path,
    sha: file.sha,
    size: file.size,
  }));
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: GITHUB_ENRICHMENT_VERSION,
        files: input.files.map((file) => [
          file.path,
          file.sha,
          createHash("sha256").update(file.content).digest("hex"),
        ]),
        readme: input.readmeMarkdown,
        context: input.context,
      }),
    )
    .digest("hex");

  return {
    version: GITHUB_ENRICHMENT_VERSION,
    fingerprint,
    sourceFiles,
    readmeImages,
    detectedTechnologies: technologies,
    snapshot: {
      categories: normalizedCategories,
      evidenceFiles: sourceFiles,
    },
    suggestions: {
      title: suggestedTitle,
      shortDescription: suggestedShortDescription,
      longDescription: suggestedLongDescription,
      coverImageUrl: readmeImages[0]?.url ?? null,
    },
  };
}
