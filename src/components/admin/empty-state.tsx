import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-muted">
          <Inbox aria-hidden="true" className="size-5 text-muted-foreground" />
        </span>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
