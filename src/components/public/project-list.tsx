"use client";

import { ArrowUpRight, Code2, ExternalLink, GitFork } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PublicProject } from "./portfolio-types";

function ProjectMark({ project }: { project: PublicProject }) {
  if (project.coverImageUrl) {
    return (
      <span
        aria-label={`${project.title} cover image`}
        className="block size-11 shrink-0 rounded-lg border bg-muted bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${project.coverImageUrl}")` }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid size-11 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground"
    >
      <Code2 className="size-5" />
    </span>
  );
}

function ProjectSummary({ project }: { project: PublicProject }) {
  return (
    <span className="grid min-w-0 flex-1 gap-3 text-left sm:grid-cols-[1fr_auto] sm:items-center">
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="public-heading font-semibold tracking-[-0.025em]">
            {project.title}
          </span>
          {project.featured ? (
            <Badge className="border-success/30 bg-success-muted text-success-foreground">
              Featured
            </Badge>
          ) : null}
        </span>
        {project.shortDescription ? (
          <span className="mt-1 block line-clamp-2 text-sm leading-5 text-muted-foreground">
            {project.shortDescription}
          </span>
        ) : null}
      </span>
      {project.technologies.length ? (
        <span className="flex flex-wrap gap-1 sm:max-w-56 sm:justify-end">
          {project.technologies.slice(0, 3).map((technology) => (
            <Badge className="font-normal" key={technology}>
              {technology}
            </Badge>
          ))}
          {project.technologies.length > 3 ? (
            <Badge className="font-normal">
              +{project.technologies.length - 3}
            </Badge>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

function ProjectDetailsBody({ project }: { project: PublicProject }) {
  return (
    <div className="grid gap-4 px-2 sm:grid-cols-[minmax(0,1fr)_13rem] sm:px-3">
      <div className="min-w-0">
        {project.longDescription ? (
          <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {project.longDescription}
          </p>
        ) : project.shortDescription ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {project.shortDescription}
          </p>
        ) : null}

        {project.highlights.length ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Highlights</h3>
            <ul className="mt-1.5 grid gap-1 pl-4 text-sm leading-5 text-muted-foreground marker:text-foreground">
              {project.highlights.map((highlight) => (
                <li className="list-disc" key={highlight}>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {project.technologies.length ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Technology</h3>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {project.technologies.map((technology) => (
                <Badge className="font-normal" key={technology}>
                  {technology}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {project.liveUrl || project.sourceCodeUrl ? (
          <div className="mt-4">
            <Separator className="mb-3" />
            <div className="flex flex-wrap gap-2">
              {project.liveUrl ? (
                <Button asChild size="sm">
                  <a
                    href={project.liveUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" className="size-4" />
                    View live
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </a>
                </Button>
              ) : null}
              {project.sourceCodeUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={project.sourceCodeUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <GitFork aria-hidden="true" className="size-4" />
                    View source
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {project.coverImageUrl ? (
        <div
          aria-label={`${project.title} cover image`}
          className="order-first aspect-video w-full rounded-lg border bg-muted bg-cover bg-center sm:order-last"
          role="img"
          style={{ backgroundImage: `url("${project.coverImageUrl}")` }}
        />
      ) : null}
    </div>
  );
}

function ProjectRow({ project }: { project: PublicProject }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <ProjectMark project={project} />
      <ProjectSummary project={project} />
    </span>
  );
}

export function ProjectList({ projects }: { projects: PublicProject[] }) {
  return (
    <Accordion className="border-t" collapsible type="single">
      {projects.map((project) => (
        <AccordionItem key={project.id} value={project.id}>
          <AccordionTrigger className="px-2 py-3 hover:bg-accent/60 hover:text-foreground focus-visible:bg-accent/60 sm:px-3">
            <ProjectRow project={project} />
          </AccordionTrigger>
          <AccordionContent className="border-t border-border/60 pt-4">
            <ProjectDetailsBody project={project} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
