import { PublicHeader } from "@/components/public/public-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-muted/25">
        <div className="page-shell flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Personal portfolio · Built with care</p>
          <p>Published deliberately from the private admin panel.</p>
        </div>
      </footer>
    </div>
  );
}
