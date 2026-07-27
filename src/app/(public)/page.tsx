import { EducationList } from "@/components/public/education-list";
import { ExperienceList } from "@/components/public/experience-list";
import { FloatingPortfolioDock } from "@/components/public/floating-portfolio-dock";
import { PortfolioHero } from "@/components/public/portfolio-hero";
import type {
  PublicEducation,
  PublicExperience,
  PublicProject,
  PublicSkill,
  PublicSocialLinks,
} from "@/components/public/portfolio-types";
import { ProjectList } from "@/components/public/project-list";
import { PublicSectionHeading } from "@/components/public/section-heading";
import { SkillGroups } from "@/components/public/skill-groups";
import ScrambledText from "@/components/ScrambledText";
import { getPublicPortfolio } from "@/lib/public-portfolio";

export const dynamic = "force-dynamic";

function formatMonth(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(value)
    : "";
}

function period(start: Date | null, end: Date | null, current = false) {
  if (!start) return "";
  return [formatMonth(start), current ? "Present" : formatMonth(end)]
    .filter(Boolean)
    .join(" — ");
}

function safeUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function socialEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, candidate]) => {
    const url = safeUrl(candidate);
    return url ? [{ key: key.toLowerCase(), url }] : [];
  });
}

function findSocial(
  entries: Array<{ key: string; url: string }>,
  service: "github" | "linkedin",
) {
  return entries.find(
    ({ key, url }) =>
      key.includes(service) ||
      new URL(url).hostname.toLowerCase().includes(service),
  )?.url;
}

function firstSentence(value: string) {
  const match = value.trim().match(/^(.{1,180}?[.!?])(?:\s|$)/);
  return match?.[1] ?? value.trim().slice(0, 180);
}

function CompactEmpty({ children }: { children: string }) {
  return <p className="public-empty">{children}</p>;
}

export default async function HomePage() {
  const portfolio = await getPublicPortfolio();
  const profile = portfolio?.profile;
  const fullName = profile?.fullName?.trim() || "Portfolio";
  const headline = profile?.professionalTitle?.trim() || "";
  const biography = profile?.biography?.trim() || "";
  const entries = [
    ...socialEntries(profile?.socialLinks),
    ...socialEntries(portfolio?.siteSettings?.socialLinks),
  ];
  const socials: PublicSocialLinks = {
    github: findSocial(entries, "github"),
    linkedin: findSocial(entries, "linkedin"),
    website: safeUrl(profile?.websiteUrl),
    email: portfolio?.siteSettings?.contactEmail ?? profile?.email ?? undefined,
  };

  const experiences: PublicExperience[] = (portfolio?.experiences ?? []).map(
    (item) => ({
      id: item.id,
      company: item.company,
      role: item.role,
      meta: period(item.startDate, item.endDate, item.isCurrent),
      current: item.isCurrent,
      description: item.description ?? "",
      highlights: item.highlights,
    }),
  );
  const projects: PublicProject[] = (portfolio?.projects ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    shortDescription: item.shortDescription ?? "",
    longDescription: item.longDescription ?? "",
    highlights: item.highlights,
    technologies: item.technologies,
    liveUrl: item.liveUrl ?? "",
    sourceCodeUrl: item.sourceCodeUrl ?? "",
    coverImageUrl: item.coverImageUrl ?? "",
    featured: item.featured,
  }));
  const education: PublicEducation[] = (portfolio?.education ?? []).map(
    (item) => ({
      id: item.id,
      institution: item.institution,
      qualification: item.qualification ?? "",
      fieldOfStudy: item.fieldOfStudy ?? "",
      meta: period(item.startDate, item.endDate),
      description: item.description ?? "",
      achievements: item.achievements,
    }),
  );
  const skills: PublicSkill[] = (portfolio?.skills ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category ?? "",
  }));
  const categories = Array.from(
    new Set(skills.map((skill) => skill.category).filter(Boolean)),
  );

  return (
    <>
      <div className="public-page">
        <PortfolioHero
          email={socials.email}
          fullName={fullName}
          github={socials.github}
          headline={headline}
          introduction={biography ? firstSentence(biography) : ""}
          linkedin={socials.linkedin}
          location={profile?.location ?? ""}
          stack={skills.map((skill) => skill.name)}
        />

        <section className="public-about public-section" data-portfolio-section id="about">
          <div className="public-about-statement">
            <PublicSectionHeading index="01" title="About" />
            {biography ? (
              <p className="public-about-copy">{biography}</p>
            ) : (
              <CompactEmpty>No about information is published.</CompactEmpty>
            )}
          </div>
          <div className="public-facts">
            {profile?.location ? (
              <article>
                <span>Based in</span>
                <strong className="public-display">{profile.location}</strong>
              </article>
            ) : null}
            {headline ? (
              <article>
                <span>Role</span>
                <strong className="public-display">{headline}</strong>
              </article>
            ) : null}
            {skills.length ? (
              <article>
                <span>Published toolkit</span>
                <strong className="public-display">
                  {skills.length} skills
                  {categories.length ? ` / ${categories.length} areas` : ""}
                </strong>
              </article>
            ) : null}
          </div>
        </section>

        <section
          className="public-experience public-section"
          data-portfolio-section
          id="experience"
        >
          <div className="public-section-intro">
            <PublicSectionHeading index="02" title="Experience" />
            <p>Selected chapters from the work behind the products.</p>
          </div>
          <div>
            {experiences.length ? (
              <ExperienceList items={experiences} />
            ) : (
              <CompactEmpty>No experience is published.</CompactEmpty>
            )}
          </div>
        </section>

        <section
          className="public-projects public-section"
          data-portfolio-section
          id="projects"
        >
          <PublicSectionHeading
            index="03"
            title="Selected work"
            description="Products, platforms, and technical systems brought from idea to execution."
          />
          <div className="public-projects-body">
            {projects.length ? (
              <ProjectList projects={projects} />
            ) : (
              <CompactEmpty>No projects are published.</CompactEmpty>
            )}
          </div>
        </section>

        <section className="public-skills public-section" data-portfolio-section id="skills">
          <PublicSectionHeading
            index="04"
            title="Skills"
            description="A categorized view of the published toolkit."
          />
          <div className="public-skills-body">
            {skills.length ? (
              <SkillGroups skills={skills} />
            ) : (
              <CompactEmpty>No skills are published.</CompactEmpty>
            )}
          </div>
        </section>

        <section
          className="public-education public-section"
          data-portfolio-section
          id="education"
        >
          <PublicSectionHeading index="05" title="Education" />
          <div className="public-education-body">
            {education.length ? (
              <EducationList items={education} />
            ) : (
              <CompactEmpty>No education is published.</CompactEmpty>
            )}
          </div>
        </section>

        <section className="public-contact public-section" data-portfolio-section id="contact">
          <PublicSectionHeading
            index="06"
            title="Contact"
          />
          <ScrambledText
            className="public-contact-line public-display"
            duration={0.8}
            radius={90}
            speed={0.35}
          >
            Have a project, role, or technical challenge in mind? Let’s talk.
          </ScrambledText>
          <div className="public-contact-actions">
            {socials.email ? (
              <a className="public-contact-email public-display" href={`mailto:${socials.email}`}>
                {socials.email}
              </a>
            ) : null}
            {socials.github ? (
              <a
                className="public-contact-link"
                href={socials.github}
                rel="noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            ) : null}
            {socials.linkedin ? (
              <a
                className="public-contact-link"
                href={socials.linkedin}
                rel="noreferrer"
                target="_blank"
              >
                LinkedIn
              </a>
            ) : null}
          </div>
        </section>
      </div>
      <FloatingPortfolioDock socials={socials} />
    </>
  );
}
