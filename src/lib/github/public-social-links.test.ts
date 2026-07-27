import assert from "node:assert/strict";
import test from "node:test";
import { resolvePublicSocialLinks } from "../public-social-links";

test("resolves flat and nested published social-link formats", () => {
  const links = resolvePublicSocialLinks({
    profileSocialLinks: {
      links: [
        { platform: "GitHub", url: "https://github.com/example" },
        { service: "LinkedIn", href: "https://linkedin.com/in/example" },
      ],
    },
    siteSocialLinks: null,
    websiteUrl: null,
    projectSourceUrls: [],
    email: "hello@example.com",
  });

  assert.equal(links.githubUrl, "https://github.com/example");
  assert.equal(links.linkedinUrl, "https://linkedin.com/in/example");
  assert.equal(links.email, "hello@example.com");
});

test("uses canonical owner fallbacks instead of repository organization URLs", () => {
  const links = resolvePublicSocialLinks({
    profileSocialLinks: null,
    siteSocialLinks: null,
    websiteUrl: null,
    projectSourceUrls: ["https://github.com/Calistheni/calistheni-app"],
    email: null,
  });

  assert.equal(links.githubUrl, "https://github.com/Shikrenov");
  assert.equal(
    links.linkedinUrl,
    "https://www.linkedin.com/in/peter-shikrenov-b283a7271/",
  );
});
