"use client";

import {
  BriefcaseBusiness,
  FolderGit2,
  GraduationCap,
  Home,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FaLinkedin } from "react-icons/fa";
import { SiGithub } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const sections = [
  { id: "intro", label: "Intro", icon: Home },
  { id: "about", label: "About", icon: User },
  { id: "experience", label: "Experience", icon: BriefcaseBusiness },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "skills", label: "Skills", icon: Sparkles },
  { id: "education", label: "Education", icon: GraduationCap },
] as const;

function useActiveSection() {
  const [activeSection, setActiveSection] = useState("intro");

  useEffect(() => {
    const targets = sections.flatMap(({ id }) => {
      const element = document.getElementById(id);
      return element ? [element] : [];
    });
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(
            entry.target,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        });
        const mostVisible = targets
          .map((target) => ({ target, ratio: ratios.get(target) ?? 0 }))
          .sort((left, right) => right.ratio - left.ratio)[0];
        if (mostVisible?.ratio) setActiveSection(mostVisible.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return { activeSection, setActiveSection };
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
}

function ItemTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export type PortfolioFloatingNavProps = {
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
};

export function PortfolioFloatingNav({
  githubUrl,
  linkedinUrl,
  email,
}: PortfolioFloatingNavProps) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const { activeSection, setActiveSection } = useActiveSection();
  const hasSocials = Boolean(githubUrl || linkedinUrl || email);

  if (!mounted) return null;

  return createPortal(
    <div className="portfolio-floating-nav-root dark">
      <TooltipProvider delayDuration={150}>
        <nav
          aria-label="Primary portfolio navigation"
          className="portfolio-floating-nav-toolbar"
        >
          {sections.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <ItemTooltip key={id} label={label}>
                <Button
                  aria-current={active ? "location" : undefined}
                  aria-label={label}
                  className={cn(
                    "portfolio-floating-nav-item",
                    active && "is-active",
                  )}
                  onClick={() => {
                    setActiveSection(id);
                    scrollToSection(id);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Icon aria-hidden="true" />
                </Button>
              </ItemTooltip>
            );
          })}

          {hasSocials ? (
            <Separator
              className="portfolio-floating-nav-separator"
              orientation="vertical"
            />
          ) : null}

          {githubUrl ? (
            <ItemTooltip label="GitHub">
              <Button
                asChild
                className="portfolio-floating-nav-item"
                size="icon"
                variant="ghost"
              >
                <a
                  aria-label="GitHub"
                  href={githubUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <SiGithub aria-hidden="true" />
                </a>
              </Button>
            </ItemTooltip>
          ) : null}

          {linkedinUrl ? (
            <ItemTooltip label="LinkedIn">
              <Button
                asChild
                className="portfolio-floating-nav-item"
                size="icon"
                variant="ghost"
              >
                <a
                  aria-label="LinkedIn"
                  href={linkedinUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FaLinkedin aria-hidden="true" />
                </a>
              </Button>
            </ItemTooltip>
          ) : null}

          {email ? (
            <ItemTooltip label="Email">
              <Button
                asChild
                className="portfolio-floating-nav-item"
                size="icon"
                variant="ghost"
              >
                <a aria-label="Email" href={`mailto:${email}`}>
                  <Mail aria-hidden="true" />
                </a>
              </Button>
            </ItemTooltip>
          ) : null}
        </nav>
      </TooltipProvider>
    </div>,
    document.body,
  );
}
