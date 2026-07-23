import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div aria-label="Loading admin content" className="space-y-6" role="status">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
