import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const githubLogin = process.env.ADMIN_GITHUB_LOGIN;

if (!databaseUrl || !githubLogin) {
  throw new Error(
    "DATABASE_URL and ADMIN_GITHUB_LOGIN are required to seed the database.",
  );
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { githubLogin },
    update: { isAdmin: true },
    create: {
      githubLogin,
      isAdmin: true,
      name: "Portfolio Owner",
    },
  });

  await prisma.portfolioProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName: "Portfolio Owner",
      professionalTitle: "Product-minded software engineer",
      biography:
        "I build accessible, dependable web products with a focus on thoughtful systems and clear user experiences.",
      email: "hello@example.com",
      location: "Sofia, Bulgaria",
      websiteUrl: "https://example.com",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    create: {
      userId: user.id,
      fullName: "Portfolio Owner",
      professionalTitle: "Product-minded software engineer",
      biography:
        "I build accessible, dependable web products with a focus on thoughtful systems and clear user experiences.",
      email: "hello@example.com",
      location: "Sofia, Bulgaria",
      websiteUrl: "https://example.com",
      sourceType: "MANUAL",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  await prisma.siteSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      siteTitle: "Personal Portfolio",
      siteDescription: "A carefully curated personal portfolio.",
      isContactFormEnabled: false,
      isCvDownloadEnabled: false,
    },
  });

  await prisma.experience.upsert({
    where: { id: "seed-experience-product-engineer" },
    update: {},
    create: {
      id: "seed-experience-product-engineer",
      userId: user.id,
      company: "Example Studio",
      role: "Senior Product Engineer",
      location: "Remote",
      description:
        "Led delivery of customer-facing web products and internal platform capabilities.",
      highlights: [
        "Improved delivery reliability through typed service boundaries.",
        "Partnered with design to raise accessibility standards.",
      ],
      startDate: new Date("2023-01-01T00:00:00.000Z"),
      isCurrent: true,
      status: "PUBLISHED",
      sourceType: "MANUAL",
      displayOrder: 0,
      publishedAt: new Date(),
    },
  });

  await prisma.experience.upsert({
    where: { id: "seed-experience-draft" },
    update: {},
    create: {
      id: "seed-experience-draft",
      userId: user.id,
      company: "Previous Company",
      role: "Software Engineer",
      highlights: [],
      startDate: new Date("2020-01-01T00:00:00.000Z"),
      endDate: new Date("2022-12-01T00:00:00.000Z"),
      status: "DRAFT",
      sourceType: "MANUAL",
      displayOrder: 1,
    },
  });

  await prisma.education.upsert({
    where: { id: "seed-education-computer-science" },
    update: {},
    create: {
      id: "seed-education-computer-science",
      userId: user.id,
      institution: "Example University",
      qualification: "BSc",
      fieldOfStudy: "Computer Science",
      location: "Sofia, Bulgaria",
      startDate: new Date("2016-09-01T00:00:00.000Z"),
      endDate: new Date("2020-06-01T00:00:00.000Z"),
      status: "PUBLISHED",
      sourceType: "MANUAL",
      displayOrder: 0,
      publishedAt: new Date(),
    },
  });

  const skills = [
    {
      name: "TypeScript",
      category: "Engineering",
      proficiency: "Advanced",
      displayOrder: 0,
    },
    {
      name: "Next.js",
      category: "Engineering",
      proficiency: "Advanced",
      displayOrder: 1,
    },
    {
      name: "Product design",
      category: "Collaboration",
      proficiency: "Experienced",
      displayOrder: 2,
    },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: skill.name,
        },
      },
      update: {},
      create: {
        ...skill,
        userId: user.id,
        status: "PUBLISHED",
        sourceType: "MANUAL",
        publishedAt: new Date(),
      },
    });
  }

  await prisma.portfolioProject.upsert({
    where: {
      userId_slug: {
        userId: user.id,
        slug: "portfolio-platform",
      },
    },
    update: {},
    create: {
      userId: user.id,
      title: "Portfolio Platform",
      slug: "portfolio-platform",
      shortDescription:
        "A secure, source-aware portfolio content management system.",
      longDescription:
        "A responsive portfolio and private administration experience built around deliberate publishing and safe imports.",
      technologies: ["Next.js", "TypeScript", "PostgreSQL", "Prisma"],
      liveUrl: "https://example.com",
      sourceCodeUrl: "https://github.com/example/portfolio",
      featured: true,
      status: "PUBLISHED",
      sourceType: "MANUAL",
      displayOrder: 0,
      publishedAt: new Date(),
    },
  });

  await prisma.portfolioProject.upsert({
    where: {
      userId_slug: {
        userId: user.id,
        slug: "draft-project",
      },
    },
    update: {},
    create: {
      userId: user.id,
      title: "Draft Project",
      slug: "draft-project",
      shortDescription: "An unpublished project for testing the review workflow.",
      technologies: ["TypeScript"],
      status: "DRAFT",
      sourceType: "MANUAL",
      displayOrder: 1,
    },
  });

  console.info(`Seeded approved administrator @${githubLogin}.`);
  console.info("Seeded a mix of published and draft Phase 2 content.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
