import { ArrowUpRight, Code2, ExternalLink, GitFork } from "lucide-react";
import type { PublicProject } from "./portfolio-types";

function initials(title: string) {
  return (
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "PX"
  );
}

function ProjectVisual({
  project,
  featured = false,
}: {
  project: PublicProject;
  featured?: boolean;
}) {
  if (project.coverImageUrl) {
    return (
      <div
        aria-label={`${project.title} project image`}
        className="project-visual project-visual--image"
        role="img"
        style={{ backgroundImage: `url("${project.coverImageUrl}")` }}
      />
    );
  }
  return (
    <div className="project-visual project-visual--fallback">
      <div className="project-code-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <span className="project-initials public-display" aria-hidden="true">
        {initials(project.title)}
      </span>
      {featured ? (
        <span className="project-build-label">
          <Code2 aria-hidden="true" />
          build / ship / iterate
        </span>
      ) : null}
    </div>
  );
}

function ProjectLinks({ project }: { project: PublicProject }) {
  if (!project.liveUrl && !project.sourceCodeUrl) return null;
  return (
    <div className="project-links">
      {project.liveUrl ? (
        <a href={project.liveUrl} rel="noreferrer" target="_blank">
          <ExternalLink aria-hidden="true" />
          Live
          <ArrowUpRight aria-hidden="true" />
        </a>
      ) : null}
      {project.sourceCodeUrl ? (
        <a href={project.sourceCodeUrl} rel="noreferrer" target="_blank">
          <GitFork aria-hidden="true" />
          Source
          <ArrowUpRight aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

function TechnologyList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="project-technologies">
      {items.map((technology) => (
        <span key={technology}>{technology}</span>
      ))}
    </div>
  );
}

export function ProjectList({ projects }: { projects: PublicProject[] }) {
  const featured =
    projects.find((project) => project.featured) ?? projects.at(0);
  const remaining = projects.filter((project) => project.id !== featured?.id);

  return (
    <div className="project-showcase">
      {featured ? (
        <article className="featured-project">
          <div className="featured-project-copy">
            <span className="project-kicker">Featured build</span>
            <h3 className="public-display">{featured.title}</h3>
            {featured.shortDescription ? (
              <p className="featured-project-summary">
                {featured.shortDescription}
              </p>
            ) : null}
            {featured.longDescription ? (
              <p className="featured-project-detail">
                {featured.longDescription}
              </p>
            ) : null}
            <TechnologyList items={featured.technologies} />
            <ProjectLinks project={featured} />
          </div>
          <ProjectVisual featured project={featured} />
        </article>
      ) : null}

      {remaining.length ? (
        <div className="project-grid">
          {remaining.map((project, index) => (
            <article className="project-card" key={project.id}>
              <ProjectVisual project={project} />
              <div className="project-card-copy">
                <span className="project-kicker">
                  Project {String(index + 2).padStart(2, "0")}
                </span>
                <h3 className="public-display">{project.title}</h3>
                {project.shortDescription ? (
                  <p>{project.shortDescription}</p>
                ) : null}
                <TechnologyList items={project.technologies.slice(0, 5)} />
                <ProjectLinks project={project} />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
