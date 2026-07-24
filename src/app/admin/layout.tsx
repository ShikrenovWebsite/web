import Link from "next/link";
import {
  DesktopAdminNav,
  MobileAdminNav,
} from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PublishButton } from "@/components/admin/publish-button";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShieldCheck } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin } = await requireAdminPage();

  return (
    <div className="min-h-screen bg-muted/35">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <MobileAdminNav />
          <Link className="flex items-center gap-2 font-semibold" href="/admin">
            <ShieldCheck aria-hidden="true" className="size-5" />
            Portfolio admin
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {admin.githubLogin ? `@${admin.githubLogin}` : admin.name}
            </span>
            <PublishButton />
            <ThemeToggle compact />
            <Button asChild size="icon" variant="ghost">
              <Link aria-label="View public portfolio" href="/" target="_blank">
                <ExternalLink aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_1fr]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] border-r bg-background p-4 lg:block">
          <DesktopAdminNav />
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
