"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { publishPortfolioChanges } from "@/app/admin/publish-actions";
import { Button } from "@/components/ui/button";

export function PublishButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await publishPortfolioChanges();
          if (result.success) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        })
      }
      size="sm"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <Send aria-hidden="true" className="size-4" />
      )}
      {pending ? "Publishing…" : "Publish changes"}
    </Button>
  );
}
