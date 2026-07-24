import Link from "next/link";
import { ExternalLink } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#education", label: "Education" },
  { href: "#skills", label: "Skills" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
      <div className="page-shell flex h-15 items-center justify-between gap-3">
        <Link className="font-semibold tracking-[-0.02em]" href="/">
          PS<span className="text-muted-foreground">/portfolio</span>
        </Link>
        <nav
          aria-label="Portfolio sections"
          className="hidden items-center gap-1 lg:flex"
        >
          {links.map((link) => (
            <Link
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Button asChild className="hidden sm:inline-flex" size="sm" variant="outline">
            <Link href="/admin">
              Admin
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
      <nav
        aria-label="Portfolio sections on mobile"
        className="page-shell flex gap-1 overflow-x-auto border-t py-2 lg:hidden"
      >
        {links.map((link) => (
          <Link
            className="shrink-0 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
