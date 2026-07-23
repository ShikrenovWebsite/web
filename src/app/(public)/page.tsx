import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ExternalLink, GitFork } from "@/components/ui/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function EmptySection({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

export default async function HomePage() {
  const portfolio = await getPublicPortfolio();
  const profile = portfolio?.profile;

  return (
    <>
      <section className="border-b">
        <div className="mx-auto grid min-h-[70vh] max-w-6xl content-center gap-8 px-4 py-20 sm:px-6">
          <div className="max-w-3xl">
            <Badge>Available for thoughtful work</Badge>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              {profile?.fullName ?? "Your name"}
            </h1>
            <p className="mt-4 text-xl text-muted-foreground sm:text-2xl">
              {profile?.professionalTitle ??
                "Your professional title will appear here when published."}
            </p>
            {profile?.biography ? (
              <p className="mt-6 max-w-2xl leading-7 text-muted-foreground">
                {profile.biography}
              </p>
            ) : null}
          </div>
          <Button asChild className="w-fit" variant="outline">
            <a href="#projects">
              Explore portfolio
              <ArrowDown aria-hidden="true" className="size-4" />
            </a>
          </Button>
        </div>
      </section>

      <div className="mx-auto max-w-6xl divide-y px-4 sm:px-6">
        <section className="py-20" id="about">
          <h2 className="text-2xl font-semibold tracking-tight">About</h2>
          <div className="mt-8 max-w-3xl">
            {profile?.biography ? (
              <p className="leading-7 text-muted-foreground">{profile.biography}</p>
            ) : (
              <EmptySection message="No about information has been published yet." />
            )}
          </div>
        </section>

        <section className="py-20" id="experience">
          <h2 className="text-2xl font-semibold tracking-tight">Experience</h2>
          <div className="mt-8 grid gap-4">
            {portfolio?.experiences.length ? (
              portfolio.experiences.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>{item.role}</CardTitle>
                    <CardDescription>
                      {item.company}
                      {item.location ? ` · ${item.location}` : ""}
                      {item.startDate
                        ? ` · ${formatMonth(item.startDate)} – ${
                            item.isCurrent
                              ? "Present"
                              : formatMonth(item.endDate) ?? "Present"
                          }`
                        : ""}
                    </CardDescription>
                  </CardHeader>
                  {item.description || item.highlights.length ? (
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      {item.description ? (
                        <p className="whitespace-pre-line leading-6">
                          {item.description}
                        </p>
                      ) : null}
                      {item.highlights.length ? (
                        <ul className="list-disc space-y-1 pl-5">
                          {item.highlights.map((highlight) => (
                            <li key={highlight}>{highlight}</li>
                          ))}
                        </ul>
                      ) : null}
                    </CardContent>
                  ) : null}
                </Card>
              ))
            ) : (
              <EmptySection message="No experience has been published yet." />
            )}
          </div>
        </section>

        <section className="py-20" id="education">
          <h2 className="text-2xl font-semibold tracking-tight">Education</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {portfolio?.education.length ? (
              portfolio.education.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>{item.institution}</CardTitle>
                    <CardDescription>
                      {[item.qualification, item.fieldOfStudy]
                        .filter(Boolean)
                        .join(" · ")}
                    </CardDescription>
                  </CardHeader>
                  {item.description || item.startDate || item.location ? (
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      {item.startDate ? (
                        <p>
                          {formatMonth(item.startDate)} –{" "}
                          {formatMonth(item.endDate) ?? "Present"}
                        </p>
                      ) : null}
                      {item.location ? <p>{item.location}</p> : null}
                      {item.description ? (
                        <p className="whitespace-pre-line leading-6">
                          {item.description}
                        </p>
                      ) : null}
                    </CardContent>
                  ) : null}
                </Card>
              ))
            ) : (
              <EmptySection message="No education has been published yet." />
            )}
          </div>
        </section>

        <section className="py-20" id="skills">
          <h2 className="text-2xl font-semibold tracking-tight">Skills</h2>
          <div className="mt-8 flex flex-wrap gap-2">
            {portfolio?.skills.length ? (
              portfolio.skills.map((skill) => (
                <Badge className="px-3 py-1 text-sm" key={skill.id}>
                  {skill.name}
                  {skill.proficiency ? ` · ${skill.proficiency}` : ""}
                </Badge>
              ))
            ) : (
              <EmptySection message="No skills have been published yet." />
            )}
          </div>
        </section>

        <section className="py-20" id="projects">
          <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {portfolio?.projects.length ? (
              portfolio.projects.map((project) => (
                <Card className="overflow-hidden" key={project.id}>
                  {project.coverImageUrl ? (
                    <div
                      aria-label={`${project.title} cover`}
                      className="aspect-video w-full border-b bg-muted bg-cover bg-center"
                      role="img"
                      style={{
                        backgroundImage: `url("${project.coverImageUrl}")`,
                      }}
                    />
                  ) : null}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle>{project.title}</CardTitle>
                      {project.featured ? <Badge>Featured</Badge> : null}
                    </div>
                    <CardDescription>{project.shortDescription}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {project.longDescription ? (
                      <p className="mb-3 w-full whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {project.longDescription}
                      </p>
                    ) : null}
                    {project.technologies.length ? (
                      <div className="mb-3 flex w-full flex-wrap gap-2">
                        {project.technologies.map((technology) => (
                          <Badge key={technology}>{technology}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {project.liveUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={project.liveUrl} rel="noreferrer" target="_blank">
                          Visit
                          <ExternalLink aria-hidden="true" className="size-3.5" />
                        </a>
                      </Button>
                    ) : null}
                    {project.sourceCodeUrl ? (
                      <Button asChild size="sm" variant="ghost">
                        <a
                          href={project.sourceCodeUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Source
                          <GitFork aria-hidden="true" className="size-3.5" />
                        </a>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptySection message="No projects have been published yet." />
            )}
          </div>
        </section>

        <section className="py-20" id="contact">
          <h2 className="text-2xl font-semibold tracking-tight">Contact</h2>
          <div className="mt-8">
            {portfolio?.siteSettings?.contactEmail || profile?.email ? (
              <Button asChild>
                <a
                  href={`mailto:${
                    portfolio?.siteSettings?.contactEmail ?? profile?.email
                  }`}
                >
                  Start a conversation
                </a>
              </Button>
            ) : (
              <EmptySection message="Contact details have not been published yet." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
