import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortfolioSocialAction } from "../../components/public/portfolio-floating-nav";
import { ExperienceList } from "../../components/public/experience-list";
import { PortfolioHero } from "../../components/public/portfolio-hero";
import { PublicHeader } from "../../components/public/public-header";
import {
  buildPublicSocialNavigationItems,
  getPublicSocialAnchorProps,
  isDocumentAtBottom,
  type PublicSectionId,
  publicSectionIds,
  publicSocialBrandIconAssets,
  selectActivePublicSection,
} from "../public-navigation";
import {
  readLinkedInUrl,
  resolvePublicSocialLinks,
  updateLinkedInSocialLinks,
} from "../public-social-links";
import { profileSchema } from "../validations/content";

const validProfile = {
  fullName: "",
  professionalTitle: "",
  biography: "",
  email: "",
  phone: "",
  location: "",
  websiteUrl: "",
  linkedinUrl: "",
  status: "PUBLISHED" as const,
  displayOrder: 0,
};

test("public UI shows Download CV in the terminal without an admin link", () => {
  const hero = renderToStaticMarkup(
    createElement(PortfolioHero, {
      fullName: "Petar Shikrenov",
      headline: "Engineer",
      introduction: "",
      location: "Sofia",
      email: "petar@example.com",
      cvAvailable: true,
    }),
  );
  const header = renderToStaticMarkup(createElement(PublicHeader));
  assert.match(hero, /Download CV/);
  assert.match(hero, /href="\/api\/cv\/download"/);
  assert.doesNotMatch(hero, /href="\/admin"/);
  assert.doesNotMatch(header, /href="\/admin"/);
});

test("experience layout promotes one entry and keeps multiple entries in the grid", () => {
  const item = {
    id: "experience-1",
    company: "Example Studio",
    role: "Software Engineer",
    meta: "2024 — Present",
    current: true,
    description: "Built dependable product experiences.",
    highlights: [],
  };

  const single = renderToStaticMarkup(
    createElement(ExperienceList, { items: [item] }),
  );
  const multiple = renderToStaticMarkup(
    createElement(ExperienceList, { items: [item, { ...item, id: "experience-2" }] }),
  );

  assert.match(single, /experience-editorial--single/);
  assert.doesNotMatch(single, /experience-editorial--multiple/);
  assert.match(multiple, /experience-editorial--multiple/);
  assert.doesNotMatch(multiple, /experience-editorial--single/);
});

test("profile validation accepts empty and valid LinkedIn URLs", () => {
  assert.equal(profileSchema.safeParse(validProfile).success, true);
  assert.equal(
    profileSchema.safeParse({
      ...validProfile,
      linkedinUrl: "  https://www.linkedin.com/in/example  ",
    }).success,
    true,
  );
});

test("profile validation rejects malformed or non-LinkedIn URLs", () => {
  for (const linkedinUrl of [
    "linkedin.com/in/example",
    "http://linkedin.com/in/example",
    "https://example.com/in/example",
  ]) {
    assert.equal(
      profileSchema.safeParse({ ...validProfile, linkedinUrl }).success,
      false,
    );
  }
});

test("admin LinkedIn updates use one canonical social-links key", () => {
  const socialLinks = updateLinkedInSocialLinks(
    {
      github: "https://github.com/example",
      linkedInUrl: "https://linkedin.com/in/old",
    },
    " https://www.linkedin.com/in/new ",
  );

  assert.deepEqual(socialLinks, {
    github: "https://github.com/example",
    linkedinUrl: "https://www.linkedin.com/in/new",
  });
  assert.equal(readLinkedInUrl(socialLinks), "https://www.linkedin.com/in/new");
  assert.deepEqual(updateLinkedInSocialLinks(socialLinks, ""), {
    github: "https://github.com/example",
  });
});

test("published profile data resolves a visible canonical LinkedIn URL", () => {
  const links = resolvePublicSocialLinks({
    profileSocialLinks: {
      githubUrl: "https://github.com/example",
      linkedinUrl: "https://www.linkedin.com/in/example",
    },
    siteSocialLinks: null,
    websiteUrl: null,
    projectSourceUrls: [],
    email: "hello@example.com",
  });

  assert.equal(links.linkedinUrl, "https://www.linkedin.com/in/example");
});

test("hidden LinkedIn entries fall back to the canonical owner URL", () => {
  const links = resolvePublicSocialLinks({
    profileSocialLinks: {
      links: [
        {
          platform: "LinkedIn",
          url: "https://www.linkedin.com/in/example",
          visible: false,
        },
      ],
    },
    siteSocialLinks: null,
    websiteUrl: null,
    projectSourceUrls: [],
    email: null,
  });

  assert.equal(
    links.linkedinUrl,
    "https://www.linkedin.com/in/peter-shikrenov-b283a7271/",
  );
});

test("social navigation keeps canonical GitHub, LinkedIn, and Email in order", () => {
  const items = buildPublicSocialNavigationItems({
    githubUrl: null,
    linkedinUrl: null,
    email: "shikrenov@proton.me",
  });

  assert.deepEqual(
    items.map(({ label }) => label),
    ["GitHub", "LinkedIn", "Email"],
  );
  assert.deepEqual(items[1], {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/peter-shikrenov-b283a7271/",
    external: true,
  });
  assert.deepEqual(items[2], {
    label: "Email",
    href: "mailto:shikrenov@proton.me",
    external: false,
  });
  assert.equal(items[0].href, "https://github.com/Shikrenov");
  assert.deepEqual(getPublicSocialAnchorProps(items[1]), {
    "aria-label": "LinkedIn",
    href: "https://www.linkedin.com/in/peter-shikrenov-b283a7271/",
    rel: "noreferrer",
    target: "_blank",
  });
  assert.deepEqual(publicSocialBrandIconAssets, {
    GitHub: "/icons/github-social.svg",
    LinkedIn: "/icons/linkedin-social.svg",
  });
});

test("missing social inputs still create one canonical LinkedIn and one Email", () => {
  const items = buildPublicSocialNavigationItems({
    githubUrl: "https://github.com/example",
    linkedinUrl: null,
    email: "hello@example.com",
  });

  assert.deepEqual(
    items.map(({ label }) => label),
    ["GitHub", "LinkedIn", "Email"],
  );
  assert.equal(
    items.filter(({ label }) => label === "LinkedIn").length,
    1,
  );
  assert.equal(items.filter(({ label }) => label === "Email").length, 1);
});

test("rendered LinkedIn action contains the canonical anchor and local asset", () => {
  const linkedin = buildPublicSocialNavigationItems({
    githubUrl: null,
    linkedinUrl: null,
    email: "shikrenov@proton.me",
  }).find(({ label }) => label === "LinkedIn");

  assert.ok(linkedin);
  const markup = renderToStaticMarkup(
    createElement(PortfolioSocialAction, { item: linkedin }),
  );

  assert.match(markup, /aria-label="LinkedIn"/);
  assert.match(
    markup,
    /href="https:\/\/www\.linkedin\.com\/in\/peter-shikrenov-b283a7271\/"/,
  );
  assert.match(markup, /target="_blank"/);
  assert.match(markup, /rel="noreferrer"/);
  assert.match(markup, /src="\/icons\/linkedin-social\.svg"/);
});

test("public observer targets contain only the six live sections", () => {
  assert.deepEqual(publicSectionIds, [
    "intro",
    "about",
    "experience",
    "projects",
    "skills",
    "education",
  ]);
});

test("visibility selection moves from Skills to Education", () => {
  const skillsDominant = new Map<PublicSectionId, number>([
    ["skills", 0.4],
    ["education", 0.1],
  ]);
  const educationDominant = new Map<PublicSectionId, number>([
    ["skills", 0.1],
    ["education", 0.45],
  ]);

  assert.equal(
    selectActivePublicSection({
      ratios: skillsDominant,
      atBottom: false,
      scrollingDown: true,
      current: "skills",
    }),
    "skills",
  );
  assert.equal(
    selectActivePublicSection({
      ratios: educationDominant,
      atBottom: false,
      scrollingDown: true,
      current: "skills",
    }),
    "education",
  );
});

test("Education always wins within the document-bottom tolerance", () => {
  assert.equal(
    isDocumentAtBottom({
      innerHeight: 800,
      scrollY: 1192.5,
      scrollHeight: 2000,
    }),
    true,
  );
  assert.equal(
    selectActivePublicSection({
      ratios: new Map([
        ["skills", 0.5],
        ["education", 0],
      ]),
      atBottom: true,
      scrollingDown: true,
      current: "skills",
    }),
    "education",
  );
});
