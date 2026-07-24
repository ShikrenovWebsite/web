import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Code2,
  GitFork,
  Mail,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicPortfolio } from "@/lib/public-portfolio";

export const dynamic = "force-dynamic";

function formatMonth(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(value)
    : null;
}

function period(
  start: Date | null,
  end: Date | null,
  current = false,
) {
  if (!start) return "";
  return `${formatMonth(start)} — ${current ? "Present" : formatMonth(end) ?? "Present"}`;
}

function EmptySection({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed bg-muted/35 p-5 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="section-kicker">{eyebrow}</p>
      <h2 className="section-heading mt-3">{title}</h2>
      {description ? (
        <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
  const portfolio = await getPublicPortfolio();
  const profile = portfolio?.profile;
  const contactEmail = portfolio?.siteSettings?.contactEmail ?? profile?.email;
  const featuredProjects =
    portfolio?.projects.filter((project) => project.featured) ?? [];
  const projects = [
    ...featuredProjects,
    ...(portfolio?.projects.filter((project) => !project.featured) ?? []),
  ];
  const skillGroups = (portfolio?.skills ?? []).reduce<
    Record<
      string,
      Array<{
        id: string;
        name: string;
        category: string | null;
        proficiency: string | null;
      }>
    >
  >((groups, skill) => {
    const category = skill.category || "Core skills";
    groups[category] = [...(groups[category] ?? []), skill];
    return groups;
  }, {});

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,var(--accent),transparent_34%)] opacity-70"
        />
        <div className="page-shell section-shell relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,.6fr)]">
          <div className="max-w-3xl">
            <Badge className="border-success/30 bg-success-muted text-success-foreground">
              Available for thoughtful work
            </Badge>
            <h1 className="mt-5 text-[clamp(2.9rem,8vw,5.8rem)] font-semibold leading-[0.94] tracking-[-0.06em]">
              {profile?.fullName ?? "Your name"}
            </h1>
            <p className="mt-5 max-w-2xl text-xl leading-tight text-muted-foreground sm:text-2xl">
              {profile?.professionalTitle ??
                "Your professional title will appear here when published."}
            </p>
            {profile?.biography ? (
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                {profile.biography}
              </p>
            ) : null}
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <a href="#projects">
                  Selected work
                  <ArrowDown aria-hidden="true" className="size-4" />
                </a>
              </Button>
              {contactEmail ? (
                <Button asChild variant="outline">
                  <a href={`mailto:${contactEmail}`}>
                    Get in touch
                    <Mail aria-hidden="true" className="size-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <aside className="surface-card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="section-kicker">Focus</p>
              <p className="mt-2 font-medium">
                {profile?.professionalTitle ?? "Software development"}
              </p>
            </div>
            {profile?.location ? (
              <div>
                <p className="section-kicker">Based in</p>
                <p className="mt-2 flex items-center gap-2 font-medium">
                  <MapPin aria-hidden="true" className="size-4 text-muted-foreground" />
                  {profile.location}
                </p>
              </div>
            ) : null}
            <div>
              <p className="section-kicker">Portfolio</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {portfolio?.projects.length ?? 0} published project
                {portfolio?.projects.length === 1 ? "" : "s"} and{" "}
                {portfolio?.experiences.length ?? 0} experience entr
                {portfolio?.experiences.length === 1 ? "y" : "ies"}.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="section-shell" id="projects">
        <div className="page-shell">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <SectionIntro
              description="A focused selection of production work, open-source projects, and product experiments."
              eyebrow="Selected work"
              title="Projects built to be used."
            />
            <Code2 aria-hidden="true" className="hidden size-10 text-muted-foreground/50 sm:block" />
          </div>
          {projects.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {projects.map((project, index) => (
                <article
                  className={`surface-card group flex min-h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 ${
                    index === 0 && projects.length > 2 ? "md:col-span-2" : ""
                  }`}
                  key={project.id}
                >
                  {project.coverImageUrl ? (
                    <div
                      aria-label={`${project.title} cover`}
                      className={`border-b bg-muted bg-cover bg-center ${
                        index === 0 && projects.length > 2
                          ? "aspect-[2.4/1]"
                          : "aspect-[16/8.5]"
                      }`}
                      role="img"
                      style={{ backgroundImage: `url("${project.coverImageUrl}")` }}
                    />
                  ) : (
                    <div className="flex aspect-[16/6] items-center justify-between border-b bg-muted/60 px-6">
                      <Code2 aria-hidden="true" className="size-8 text-muted-foreground/50" />
                      <span className="font-mono text-xs text-muted-foreground">
                        {project.technologies.slice(0, 3).join(" / ")}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold tracking-tight">
                            {project.title}
                          </h3>
                          {project.featured ? (
                            <Badge className="border-success/30 bg-success-muted text-success-foreground">
                              Featured
                            </Badge>
                          ) : null}
                        </div>
                        {project.shortDescription ? (
                          <p className="mt-2 leading-6 text-muted-foreground">
                            {project.shortDescription}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {project.longDescription ? (
                      <p className="mt-4 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {project.longDescription}
                      </p>
                    ) : null}
                    <div className="mt-auto pt-5">
                      {project.technologies.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {project.technologies.slice(0, 8).map((technology) => (
                            <Badge className="font-normal" key={technology}>
                              {technology}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
                        {project.liveUrl ? (
                          <a
                            className="inline-flex items-center gap-1.5 hover:text-muted-foreground"
                            href={project.liveUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Live project
                            <ArrowUpRight aria-hidden="true" className="size-4" />
                          </a>
                        ) : null}
                        {project.sourceCodeUrl ? (
                          <a
                            className="inline-flex items-center gap-1.5 hover:text-muted-foreground"
                            href={project.sourceCodeUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Source
                            <GitFork aria-hidden="true" className="size-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptySection message="No projects have been published yet." />
            </div>
          )}
        </div>
      </section>

      <section className="border-y bg-muted/30" id="experience">
        <div className="page-shell section-shell grid gap-10 lg:grid-cols-[.65fr_1.35fr]">
          <SectionIntro
            description="Roles, teams, and responsibilities presented in reverse chronological order."
            eyebrow="Career"
            title="Experience"
          />
          <div className="relative">
            {portfolio?.experiences.length ? (
              <div className="grid gap-3">
                {portfolio.experiences.map((item) => (
                  <article className="surface-card relative p-5" key={item.id}>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <h3 className="font-semibold">{item.role}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.company}
                          {item.location ? ` · ${item.location}` : ""}
                        </p>
                      </div>
                      {item.startDate ? (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <CalendarDays aria-hidden="true" className="size-3.5" />
                          {period(item.startDate, item.endDate, item.isCurrent)}
                        </p>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    {item.highlights.length ? (
                      <ul className="mt-3 grid gap-1.5 pl-4 text-sm leading-6 text-muted-foreground marker:text-foreground">
                        {item.highlights.map((highlight) => (
                          <li className="list-disc" key={highlight}>
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection message="No experience has been published yet." />
            )}
          </div>
        </div>
      </section>

      <section className="section-shell" id="skills">
        <div className="page-shell grid gap-10 lg:grid-cols-[.65fr_1.35fr]">
          <SectionIntro
            description="Tools and technologies grouped by how they contribute to the work."
            eyebrow="Capabilities"
            title="Technical toolkit"
          />
          {Object.keys(skillGroups).length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(skillGroups).map(([category, skills]) => (
                <div className="surface-card p-5" key={category}>
                  <h3 className="text-sm font-semibold">{category}</h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Badge className="font-normal" key={skill.id}>
                        {skill.name}
                        {skill.proficiency ? ` · ${skill.proficiency}` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptySection message="No skills have been published yet." />
          )}
        </div>
      </section>

      <section className="border-y bg-muted/30" id="education">
        <div className="page-shell section-shell">
          <SectionIntro eyebrow="Background" title="Education" />
          {portfolio?.education.length ? (
            <div className="mt-7 grid gap-3 md:grid-cols-2">
              {portfolio.education.map((item) => (
                <article className="surface-card p-5" key={item.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{item.institution}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[item.qualification, item.fieldOfStudy]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {item.startDate ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {period(item.startDate, item.endDate)}
                      </span>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-7">
              <EmptySection message="No education has been published yet." />
            </div>
          )}
        </div>
      </section>

      <section className="section-shell" id="about">
        <div className="page-shell grid gap-8 lg:grid-cols-[.65fr_1.35fr]">
          <SectionIntro eyebrow="Profile" title="About" />
          {profile?.biography ? (
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              {profile.biography}
            </p>
          ) : (
            <EmptySection message="No about information has been published yet." />
          )}
        </div>
      </section>

      <section className="border-t" id="contact">
        <div className="page-shell section-shell">
          <div className="surface-card overflow-hidden bg-foreground px-6 py-8 text-background sm:px-10 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-65">
              Contact
            </p>
            <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                  Have a project or role worth discussing?
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 opacity-70">
                  Get in touch using the published contact details.
                </p>
              </div>
              {contactEmail ? (
                <Button asChild className="w-fit bg-background text-foreground hover:bg-background/90">
                  <a href={`mailto:${contactEmail}`}>
                    Start a conversation
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </a>
                </Button>
              ) : (
                <p className="text-sm opacity-70">
                  Contact details have not been published yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
