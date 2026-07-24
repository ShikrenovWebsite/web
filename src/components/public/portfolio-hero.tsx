import {
  ArrowDownRight,
  ArrowUpRight,
  GitFork,
  Link2,
  Mail,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

export function PortfolioHero({
  fullName,
  headline,
  introduction,
  location,
  email,
  github,
  linkedin,
}: {
  fullName: string;
  headline: string;
  introduction: string;
  location: string;
  email?: string;
  github?: string;
  linkedin?: string;
}) {
  return (
    <section
      className="public-section relative overflow-hidden border-b"
      data-portfolio-section
      id="home"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/35 to-transparent"
      />
      <div className="grid gap-7 sm:grid-cols-[7.5rem_1fr] sm:items-center">
        <div
          aria-label={`${fullName} initials avatar`}
          className="public-heading grid size-24 place-items-center rounded-full border bg-muted text-2xl font-semibold tracking-[-0.05em] sm:size-28"
          role="img"
        >
          {initials(fullName)}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[0.68rem] tracking-[0.16em] text-muted-foreground">
              00 / INTRO
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
          </div>
          <h1 className="public-heading mt-4 text-[clamp(2.4rem,8vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.065em]">
            {fullName}
          </h1>
          <p className="mt-3 text-lg font-medium tracking-[-0.02em] text-muted-foreground sm:text-xl">
            {headline}
          </p>
          {introduction ? (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              {introduction}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button asChild size="sm">
              <a href="#projects">
                Explore projects
                <ArrowDownRight aria-hidden="true" className="size-4" />
              </a>
            </Button>
            {email ? (
              <Button asChild size="sm" variant="outline">
                <a href={`mailto:${email}`}>
                  <Mail aria-hidden="true" className="size-4" />
                  Email
                </a>
              </Button>
            ) : null}
            {github ? (
              <Button asChild size="sm" variant="ghost">
                <a href={github} rel="noopener noreferrer" target="_blank">
                  <GitFork aria-hidden="true" className="size-4" />
                  GitHub
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </a>
              </Button>
            ) : null}
            {linkedin ? (
              <Button asChild size="sm" variant="ghost">
                <a href={linkedin} rel="noopener noreferrer" target="_blank">
                  <Link2 aria-hidden="true" className="size-4" />
                  LinkedIn
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </a>
              </Button>
            ) : null}
            {location ? (
              <span className="inline-flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                <MapPin aria-hidden="true" className="size-3.5" />
                {location}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
