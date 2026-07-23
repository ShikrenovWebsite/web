import { Badge } from "@/components/ui/badge";

export function SectionHeading({
  title,
  description,
  count,
  action,
}: {
  title: string;
  description: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {typeof count === "number" ? <Badge>{count}</Badge> : null}
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
