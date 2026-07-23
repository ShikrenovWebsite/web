"use client";

import type {
  FieldValues,
  Path,
  UseFormReturn,
} from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "@/app/admin/actions";

export function handleActionResult<T extends FieldValues>(
  result: ActionResult,
  form: UseFormReturn<T>,
  onSuccess: () => void,
) {
  if (result.success) {
    toast.success(result.message);
    onSuccess();
    return;
  }

  if (result.fieldErrors) {
    for (const [field, messages] of Object.entries(result.fieldErrors)) {
      const message = messages?.[0];
      if (message) {
        form.setError(field as Path<T>, { type: "server", message });
      }
    }
  }

  toast.error(result.message);
}
