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
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildPublicSocialNavigationItems,
  getPublicSocialAnchorProps,
  isDocumentAtBottom,
  type PublicSectionId,
  type PublicSocialNavigationItem,
  publicSectionIds,
  publicSocialBrandIconAssets,
  selectActivePublicSection,
} from "@/lib/public-navigation";
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
  const [activeSection, setActiveSection] =
    useState<PublicSectionId>("intro");
  const activeSectionRef = useRef<PublicSectionId>("intro");
  const requestedSectionRef = useRef<PublicSectionId | null>(null);

  useEffect(() => {
    const targets = publicSectionIds.flatMap((id) => {
      const element = document.getElementById(id);
      return element ? [{ id, element }] : [];
    });
    const ratios = new Map<PublicSectionId, number>();
    let frame = 0;
    let lastScrollY = window.scrollY;
    let scrollingDown = true;

    const commitActiveSection = (id: PublicSectionId) => {
      activeSectionRef.current = id;
      setActiveSection((current) => (current === id ? current : id));
    };

    const updateActiveSection = () => {
      const nextScrollY = window.scrollY;
      scrollingDown = nextScrollY >= lastScrollY;
      lastScrollY = nextScrollY;

      const atBottom = isDocumentAtBottom({
        innerHeight: window.innerHeight,
        scrollY: nextScrollY,
        scrollHeight: document.documentElement.scrollHeight,
      });
      if (atBottom) {
        requestedSectionRef.current = null;
        commitActiveSection("education");
        return;
      }

      const requested = requestedSectionRef.current;
      if (requested) {
        commitActiveSection(requested);
        if ((ratios.get(requested) ?? 0) > 0) {
          requestedSectionRef.current = null;
        }
        return;
      }

      commitActiveSection(
        selectActivePublicSection({
          ratios,
          atBottom,
          scrollingDown,
          current: activeSectionRef.current,
        }),
      );
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveSection();
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(
            entry.target.id as PublicSectionId,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        });
        scheduleUpdate();
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5] },
    );

    targets.forEach(({ element }) => observer.observe(element));
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const activateSection = (id: PublicSectionId) => {
    requestedSectionRef.current = id;
    activeSectionRef.current = id;
    setActiveSection(id);
  };

  return { activeSection, activateSection };
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

export function PortfolioSocialAction({
  item,
}: {
  item: PublicSocialNavigationItem;
}) {
  const brandIcon =
    item.label === "Email"
      ? undefined
      : publicSocialBrandIconAssets[item.label];

  return (
    <Button
      asChild
      className="portfolio-floating-nav-item"
      size="icon"
      variant="ghost"
    >
      <a {...getPublicSocialAnchorProps(item)}>
        {brandIcon ? (
          <Image
            alt=""
            aria-hidden="true"
            className={cn(
              "portfolio-floating-nav-brand-icon",
              item.label === "GitHub" && "is-github",
            )}
            height={20}
            src={brandIcon}
            width={20}
          />
        ) : (
          <Mail aria-hidden="true" />
        )}
      </a>
    </Button>
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
  const { activeSection, activateSection } = useActiveSection();
  const socialItems = buildPublicSocialNavigationItems({
    githubUrl,
    linkedinUrl,
    email,
  });

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
                    activateSection(id);
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

          {socialItems.length ? (
            <Separator
              className="portfolio-floating-nav-separator"
              orientation="vertical"
            />
          ) : null}

          {socialItems.map((item) => (
            <ItemTooltip key={item.label} label={item.label}>
              <PortfolioSocialAction item={item} />
            </ItemTooltip>
          ))}
        </nav>
      </TooltipProvider>
    </div>,
    document.body,
  );
}
