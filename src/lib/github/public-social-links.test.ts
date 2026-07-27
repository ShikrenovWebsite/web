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

  assert.equal(links.github, "https://github.com/example");
  assert.equal(links.linkedin, "https://linkedin.com/in/example");
  assert.equal(links.email, "hello@example.com");
});

test("derives a GitHub profile only from published project source URLs", () => {
  const links = resolvePublicSocialLinks({
    profileSocialLinks: null,
    siteSocialLinks: null,
    websiteUrl: null,
    projectSourceUrls: ["https://github.com/Calistheni/calistheni-app"],
    email: null,
  });

  assert.equal(links.github, "https://github.com/Calistheni");
  assert.equal(links.linkedin, undefined);
});
