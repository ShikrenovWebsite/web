type SocialEntry = {
  key: string;
  url: string;
};

export const DEFAULT_GITHUB_URL = "https://github.com/Shikrenov";
export const DEFAULT_LINKEDIN_URL =
  "https://www.linkedin.com/in/peter-shikrenov-b283a7271/";

const LINKEDIN_KEYS = ["linkedinUrl", "linkedInUrl", "linkedin", "linkedIn"];

function safePublicUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeGitHubUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      (hostname !== "github.com" && hostname !== "www.github.com")
    ) {
      return undefined;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export function normalizeLinkedInUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      (hostname !== "linkedin.com" && hostname !== "www.linkedin.com")
    ) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function readLinkedInUrl(value: unknown) {
  if (value && !Array.isArray(value) && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of LINKEDIN_KEYS) {
      const normalized = normalizeLinkedInUrl(record[key]);
      if (normalized) return normalized;
    }
  }

  return normalizeLinkedInUrl(
    findSocial(collectSocialEntries(value), "linkedin"),
  );
}

export function updateLinkedInSocialLinks(
  value: unknown,
  linkedinUrl: string,
) {
  const next: Record<string, unknown> =
    value && !Array.isArray(value) && typeof value === "object"
      ? { ...(value as Record<string, unknown>) }
      : value
        ? { links: value }
        : {};

  LINKEDIN_KEYS.forEach((key) => delete next[key]);
  const normalized = normalizeLinkedInUrl(linkedinUrl);
  if (normalized) next.linkedinUrl = normalized;

  return Object.keys(next).length ? next : null;
}

function collectSocialEntries(
  value: unknown,
  key = "",
  entries: SocialEntry[] = [],
) {
  const directUrl = safePublicUrl(value);
  if (directUrl) {
    entries.push({ key: key.toLowerCase(), url: directUrl });
    return entries;
  }
  if (!value || typeof value !== "object") return entries;

  if (Array.isArray(value)) {
    value.forEach((candidate, index) =>
      collectSocialEntries(candidate, `${key}.${index}`, entries),
    );
    return entries;
  }

  const record = value as Record<string, unknown>;
  if (
    record.visible === false ||
    record.isVisible === false ||
    record.published === false ||
    record.enabled === false
  ) {
    return entries;
  }
  const label = ["platform", "service", "type", "name"].find(
    (field) => typeof record[field] === "string",
  );
  const link = ["url", "href", "value"].find(
    (field) => safePublicUrl(record[field]) !== undefined,
  );
  if (link) {
    entries.push({
      key: `${key}.${label ? record[label] : link}`.toLowerCase(),
      url: safePublicUrl(record[link])!,
    });
  }

  Object.entries(record).forEach(([field, candidate]) => {
    if (field !== link) {
      collectSocialEntries(candidate, `${key}.${field}`, entries);
    }
  });
  return entries;
}

function findSocial(entries: SocialEntry[], service: "github" | "linkedin") {
  return entries.find(({ key, url }) => {
    const hostname = new URL(url).hostname.toLowerCase();
    return key.includes(service) || hostname.includes(`${service}.com`);
  })?.url;
}

export function resolvePublicSocialLinks(input: {
  profileSocialLinks: unknown;
  siteSocialLinks: unknown;
  websiteUrl: unknown;
  projectSourceUrls: unknown[];
  email: string | null | undefined;
}) {
  const entries = [
    ...collectSocialEntries(input.profileSocialLinks, "profile"),
    ...collectSocialEntries(input.siteSocialLinks, "site"),
  ];
  const website = safePublicUrl(input.websiteUrl);
  if (website) entries.push({ key: "profile.website", url: website });

  return {
    githubUrl:
      normalizeGitHubUrl(findSocial(entries, "github")) ??
      DEFAULT_GITHUB_URL,
    linkedinUrl:
      readLinkedInUrl(input.profileSocialLinks) ??
      readLinkedInUrl(input.siteSocialLinks) ??
      DEFAULT_LINKEDIN_URL,
    websiteUrl: website,
    email: input.email?.trim() || undefined,
  };
}
