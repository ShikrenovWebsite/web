type SocialEntry = {
  key: string;
  url: string;
};

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

function githubProfileFromPublishedProjects(sourceCodeUrls: unknown[]) {
  for (const candidate of sourceCodeUrls) {
    const sourceUrl = safePublicUrl(candidate);
    if (!sourceUrl) continue;
    const url = new URL(sourceUrl);
    if (!/(^|\.)github\.com$/i.test(url.hostname)) continue;
    const [owner, repository] = url.pathname.split("/").filter(Boolean);
    if (owner && repository) return `${url.origin}/${owner}`;
  }
  return undefined;
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
    github:
      findSocial(entries, "github") ??
      githubProfileFromPublishedProjects(input.projectSourceUrls),
    linkedin: findSocial(entries, "linkedin"),
    website,
    email: input.email?.trim() || undefined,
  };
}
