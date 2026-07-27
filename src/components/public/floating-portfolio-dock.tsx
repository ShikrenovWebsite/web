"use client";

import {
  BriefcaseBusiness,
  FolderGit2,
  House,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";
import Dock, { type DockItemData } from "@/components/Dock";
import type { PublicSocialLinks } from "./portfolio-types";

const sections = [
  { id: "intro", label: "Intro", icon: House },
  { id: "about", label: "About", icon: UserRound, mobileHidden: true },
  {
    id: "experience",
    label: "Experience",
    icon: BriefcaseBusiness,
    mobileHidden: true,
  },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "skills", label: "Skills", icon: Sparkles },
] as const;

function useActiveSection() {
  const [active, setActive] = useState("intro");

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
      { rootMargin: "-22% 0px -62% 0px", threshold: [0, 0.15, 0.35] },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return active;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
}

export function FloatingPortfolioDock({
  socials,
}: {
  socials: PublicSocialLinks;
}) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const active = useActiveSection();
  const dockItems = useMemo<DockItemData[]>(() => {
    const navigation: DockItemData[] = sections.map(
      ({ id, label, icon: Icon, ...section }) => ({
        kind: "action",
        label,
        active: active === id,
        mobileHidden: "mobileHidden" in section && section.mobileHidden,
        icon: <Icon />,
        onClick: () => scrollToSection(id),
      }),
    );
    const socialItems: DockItemData[] = [];
    if (socials.github) {
      socialItems.push({
        kind: "link",
        dividerBefore: socialItems.length === 0,
        label: "GitHub",
        href: socials.github,
        external: true,
        icon: <FaGithub />,
      });
    }
    if (socials.linkedin) {
      socialItems.push({
        kind: "link",
        dividerBefore: socialItems.length === 0,
        label: "LinkedIn",
        href: socials.linkedin,
        external: true,
        icon: <FaLinkedinIn />,
      });
    }
    if (socials.email) {
      socialItems.push({
        kind: "link",
        dividerBefore: socialItems.length === 0,
        label: "Email",
        href: `mailto:${socials.email}`,
        icon: <Mail />,
      });
    }
    return [...navigation, ...socialItems];
  }, [active, socials.email, socials.github, socials.linkedin]);

  if (!mounted) return null;

  return createPortal(
    <div className="public-dock-root dark">
      <nav aria-label="Primary portfolio navigation">
        <Dock
          baseItemSize={42}
          distance={160}
          items={dockItems}
          magnification={58}
          panelHeight={64}
        />
      </nav>
    </div>,
    document.body,
  );
}
