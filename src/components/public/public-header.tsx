import Link from "next/link";
import { ExternalLink } from "@/components/ui/icons";
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
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link className="font-semibold tracking-tight" href="/">
          Portfolio
        </Link>
        <nav
          aria-label="Portfolio sections"
          className="hidden items-center gap-5 md:flex"
        >
          {links.map((link) => (
            <Link
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin">
            Admin
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>
        </Button>
      </div>
      <nav
        aria-label="Portfolio sections on mobile"
        className="flex gap-5 overflow-x-auto border-t px-4 py-2 md:hidden"
      >
        {links.map((link) => (
          <Link
            className="shrink-0 text-xs text-muted-foreground"
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
