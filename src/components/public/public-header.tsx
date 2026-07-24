import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="border-b">
      <div className="public-shell flex h-14 items-center justify-between">
        <Link
          className="public-heading text-sm font-semibold tracking-[-0.03em]"
          href="#home"
        >
          Portfolio<span className="text-muted-foreground"> / index</span>
        </Link>
        <Button asChild className="h-8 px-2.5 text-xs" variant="ghost">
          <Link href="/admin">
            Admin
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
