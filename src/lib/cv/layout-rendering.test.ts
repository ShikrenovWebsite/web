import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CvPreview } from "@/components/admin/cv-preview";
import type { CvDocumentData } from "./document";

const data: CvDocumentData = {
  version: {
    id: "version-layout",
    name: "Petar Shikrenov",
    headline: "Product-minded software engineer",
    summary: "Building dependable products with clear interfaces.",
    sectionOrder: ["experience", "projects", "education", "skills"],
    updatedAt: new Date(0).toISOString(),
    sourceUpdatedAt: new Date(0).toISOString(),
    newerDataAvailable: false,
    layoutMode: "STANDARD_TWO_PAGE",
    fit: { pressure: 0, likelyPages: 2, fitsOnePage: false },
  },
  profile: {
    fullName: "Petar Shikrenov",
    email: "petar@example.com",
    phone: "",
    location: "Sofia, Bulgaria",
    website: "",
    links: [],
  },
  experience: [
    {
      id: "experience-1",
      company: "PatePlay",
      role: "Software Developer",
      location: "Sofia",
      startDate: "Mar 2023",
      endDate: "Jun 2025",
      description: "A deliberately long description that should remain in the full-width primary flow.",
      highlights: ["A full-width achievement."],
    },
  ],
  projects: [
    {
      id: "project-1",
      title: "Calistheni App",
      shortDescription: "A full-width project summary.",
      longDescription: "A longer project description in the primary document flow.",
      technologies: ["TypeScript", "Next.js", "PostgreSQL"],
      highlights: ["A full-width project achievement."],
      liveUrl: "https://calistheni.app",
      sourceCodeUrl: "",
    },
  ],
  education: [
    {
      id: "education-1",
      institution: "New Bulgarian University",
      qualification: "Law",
      fieldOfStudy: "",
      startDate: "Sep 2022",
      endDate: "Jul 2026",
      description: "",
    },
  ],
  skills: [
    { id: "skill-1", name: "TypeScript" },
    { id: "skill-2", name: "Next.js" },
  ],
  certifications: [],
  languages: [],
  canonicalUpdatedAt: new Date(0).toISOString(),
};

test("preview keeps primary CV content full width before the supporting block", () => {
  const markup = renderToStaticMarkup(createElement(CvPreview, { data }));
  const projects = markup.indexOf("Selected projects");
  const education = markup.indexOf("Education");
  const skills = markup.indexOf("Skills");

  assert.ok(projects < education);
  assert.ok(education < skills);
  assert.match(
    markup,
    /sm:grid-cols-\[minmax\(0,0\.35fr\)_minmax\(0,0\.65fr\)\]/,
  );
  assert.doesNotMatch(markup, /<aside/);
  assert.doesNotMatch(markup, /grid-cols-\[minmax\(0,1fr\)_55mm\]/);
});
