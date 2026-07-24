"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FilePenLine,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  changeContentStatus,
  deleteContent,
  reorderContent,
} from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ContentType = "profile" | "experience" | "education" | "skill" | "project";

export function ContentActions({
  id,
  type,
  status,
  canMoveUp = false,
  canMoveDown = false,
  editTrigger,
  label,
}: {
  id: string;
  type: ContentType;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  editTrigger: React.ReactNode;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function run(task: () => Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await task();
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {editTrigger}
      {type !== "profile" ? (
        <>
          <Button
            aria-label={`Move ${label} up`}
            disabled={!canMoveUp || isPending}
            onClick={() =>
              run(() => reorderContent({ type, id, direction: "up" }))
            }
            size="icon"
            title="Move up"
            type="button"
            variant="ghost"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label={`Move ${label} down`}
            disabled={!canMoveDown || isPending}
            onClick={() =>
              run(() => reorderContent({ type, id, direction: "down" }))
            }
            size="icon"
            title="Move down"
            type="button"
            variant="ghost"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </Button>
        </>
      ) : null}
      {status !== "PUBLISHED" ? (
        <Button
          aria-label={`Approve ${label} for publication`}
          disabled={isPending}
          onClick={() =>
            run(() => changeContentStatus({ type, id, status: "PUBLISHED" }))
          }
          size="icon"
          title="Include in next publication"
          type="button"
          variant="ghost"
        >
          <Eye aria-hidden="true" className="size-4" />
        </Button>
      ) : (
        <Button
          aria-label={`Hide ${label} in next publication`}
          disabled={isPending}
          onClick={() =>
            run(() => changeContentStatus({ type, id, status: "HIDDEN" }))
          }
          size="icon"
          title="Hide in next publication"
          type="button"
          variant="ghost"
        >
          <EyeOff aria-hidden="true" className="size-4" />
        </Button>
      )}
      {status !== "DRAFT" ? (
        <Button
          aria-label={`Move ${label} to drafts`}
          disabled={isPending}
          onClick={() =>
            run(() => changeContentStatus({ type, id, status: "DRAFT" }))
          }
          size="icon"
          title="Move to drafts"
          type="button"
          variant="ghost"
        >
          <FilePenLine aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            aria-label={`Delete ${label}`}
            disabled={isPending}
            size="icon"
            title="Delete"
            type="button"
            variant="ghost"
          >
            {isPending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <Trash2 aria-hidden="true" className="size-4 text-destructive" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                run(async () => {
                  const result = await deleteContent({ type, id });
                  if (result.success) setConfirmOpen(false);
                  return result;
                });
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
