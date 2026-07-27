import {
  DEFAULT_GITHUB_URL,
  DEFAULT_LINKEDIN_URL,
  normalizeGitHubUrl,
  normalizeLinkedInUrl,
} from "@/lib/public-social-links";

export const publicSectionIds = [
  "intro",
  "about",
  "experience",
  "projects",
  "skills",
  "education",
] as const;

export type PublicSectionId = (typeof publicSectionIds)[number];

export function isDocumentAtBottom(input: {
  innerHeight: number;
  scrollY: number;
  scrollHeight: number;
  tolerance?: number;
}) {
  return (
    input.innerHeight + input.scrollY >=
    input.scrollHeight - (input.tolerance ?? 8)
  );
}

export function selectActivePublicSection(input: {
  ratios: ReadonlyMap<PublicSectionId, number>;
  atBottom: boolean;
  scrollingDown: boolean;
  current: PublicSectionId;
}) {
  if (input.atBottom) return "education" satisfies PublicSectionId;

  let selected = input.current;
  let selectedRatio = input.ratios.get(selected) ?? 0;

  publicSectionIds.forEach((id) => {
    const ratio = input.ratios.get(id) ?? 0;
    const closeToSelected = Math.abs(ratio - selectedRatio) <= 0.025;
    const isLater =
      publicSectionIds.indexOf(id) > publicSectionIds.indexOf(selected);

    if (
      ratio > selectedRatio + 0.025 ||
      (input.scrollingDown && ratio > 0 && closeToSelected && isLater)
    ) {
      selected = id;
      selectedRatio = ratio;
    }
  });

  return selectedRatio > 0 ? selected : input.current;
}

export type PublicSocialNavigationItem = {
  label: "GitHub" | "LinkedIn" | "Email";
  href: string;
  external: boolean;
};

export const publicSocialBrandIconAssets = {
  GitHub: "/icons/github-social.svg",
  LinkedIn: "/icons/linkedin-social.svg",
} as const;

export function buildPublicSocialNavigationItems(input: {
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
}) {
  const items: PublicSocialNavigationItem[] = [];
  const githubUrl = normalizeGitHubUrl(input.githubUrl) ?? DEFAULT_GITHUB_URL;
  const linkedinUrl =
    normalizeLinkedInUrl(input.linkedinUrl) ?? DEFAULT_LINKEDIN_URL;

  items.push({ label: "GitHub", href: githubUrl, external: true });
  items.push({ label: "LinkedIn", href: linkedinUrl, external: true });
  if (input.email) {
    items.push({
      label: "Email",
      href: `mailto:${input.email}`,
      external: false,
    });
  }

  return items;
}

export function getPublicSocialAnchorProps(item: PublicSocialNavigationItem) {
  return {
    "aria-label": item.label,
    href: item.href,
    rel: item.external ? "noreferrer" : undefined,
    target: item.external ? "_blank" : undefined,
  };
}
