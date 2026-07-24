"use client";

import {
  BriefcaseBusiness,
  GitFork,
  Home,
  Link2,
  Sparkles,
  UserRound,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeIconToggle } from "@/components/theme/theme-icon-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PublicSocialLinks } from "./portfolio-types";

const sections = [
  { id: "home", label: "Introduction", icon: Home },
  { id: "about", label: "About", icon: UserRound },
  { id: "experience", label: "Experience", icon: BriefcaseBusiness },
  { id: "projects", label: "Projects", icon: Workflow },
  { id: "skills", label: "Skills", icon: Sparkles },
];

function DockAction({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function FloatingPortfolioDock({
  socials,
}: {
  socials: PublicSocialLinks;
}) {
  const [active, setActive] = useState("home");

  useEffect(() => {
    const targets = sections.flatMap(({ id }) => {
      const element = document.getElementById(id);
      return element ? [element] : [];
    });
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0.05, 0.25, 0.5] },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <TooltipProvider delayDuration={180}>
      <nav
        aria-label="Portfolio navigation"
        className="fixed bottom-3 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-0.5 rounded-xl border bg-background/95 p-1.5 shadow-lg backdrop-blur sm:bottom-5"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <DockAction key={section.id} label={section.label}>
              <Button
                aria-current={active === section.id ? "location" : undefined}
                aria-label={section.label}
                asChild
                className={cn(
                  "size-9 rounded-lg",
                  active === section.id &&
                    "bg-foreground text-background hover:bg-foreground/90 hover:text-background",
                )}
                size="icon"
                variant="ghost"
              >
                <a href={`#${section.id}`}>
                  <Icon aria-hidden="true" className="size-4" />
                </a>
              </Button>
            </DockAction>
          );
        })}

        {socials.github || socials.linkedin ? (
          <>
            <Separator
              className="mx-1 hidden h-5 sm:block"
              orientation="vertical"
            />
            <div className="hidden items-center gap-0.5 sm:flex">
              {socials.github ? (
                <DockAction label="GitHub">
                  <Button
                    aria-label="GitHub"
                    asChild
                    className="size-9 rounded-lg"
                    size="icon"
                    variant="ghost"
                  >
                    <a
                      href={socials.github}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <GitFork aria-hidden="true" className="size-4" />
                    </a>
                  </Button>
                </DockAction>
              ) : null}
              {socials.linkedin ? (
                <DockAction label="LinkedIn">
                  <Button
                    aria-label="LinkedIn"
                    asChild
                    className="size-9 rounded-lg"
                    size="icon"
                    variant="ghost"
                  >
                    <a
                      href={socials.linkedin}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Link2 aria-hidden="true" className="size-4" />
                    </a>
                  </Button>
                </DockAction>
              ) : null}
            </div>
          </>
        ) : null}

        <Separator className="mx-1 h-5" orientation="vertical" />
        <ThemeIconToggle />
      </nav>
    </TooltipProvider>
  );
}
