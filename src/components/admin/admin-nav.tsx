"use client";

import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  Contact,
  FilePlus2,
  FileText,
  FolderKanban,
  GitFork,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/profile", label: "Profile", icon: UserRound },
  { href: "/admin/cv-import", label: "CV import", icon: FileText },
  { href: "/admin/cv", label: "Create CV", icon: FilePlus2 },
  { href: "/admin/github", label: "GitHub", icon: GitFork },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/experience", label: "Experience", icon: BriefcaseBusiness },
  { href: "/admin/education", label: "Education", icon: GraduationCap },
  { href: "/admin/skills", label: "Skills", icon: Sparkles },
  { href: "/admin/contact", label: "Contact", icon: Contact },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function DesktopAdminNav() {
  return (
    <nav aria-label="Admin navigation" className="grid gap-1">
      <NavLinks />
    </nav>
  );
}

export function MobileAdminNav() {
  return (
    <details className="relative lg:hidden">
      <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md hover:bg-accent">
        <Menu aria-hidden="true" className="size-5" />
        <span className="sr-only">Open admin navigation</span>
      </summary>
      <nav
        aria-label="Admin navigation"
        className="absolute left-0 top-12 z-40 grid w-64 gap-1 rounded-lg border bg-card p-2 shadow-lg"
      >
        <NavLinks />
      </nav>
    </details>
  );
}
