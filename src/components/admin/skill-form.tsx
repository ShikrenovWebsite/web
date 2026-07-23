"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { saveSkill } from "@/app/admin/actions";
import {
  FormActions,
  FormField,
  PublicationSelect,
} from "@/components/admin/form-support";
import { handleActionResult } from "@/components/admin/use-action-result";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { skillSchema, type SkillInput } from "@/lib/validations/content";

const emptySkill: SkillInput = {
  name: "",
  category: "",
  proficiency: "",
  status: "DRAFT",
  displayOrder: 0,
};

export function SkillForm({
  value = emptySkill,
  compact = false,
}: {
  value?: SkillInput;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<SkillInput>({
    resolver: zodResolver(skillSchema),
    defaultValues: value,
  });

  async function onSubmit(data: SkillInput) {
    const result = await saveSkill(data);
    handleActionResult(result, form, () => {
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) form.reset(value);
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button
          aria-label={compact ? "Edit skill" : undefined}
          size={compact ? "icon" : "default"}
          type="button"
          variant={compact ? "ghost" : "default"}
        >
          {compact ? (
            <Pencil aria-hidden="true" className="size-4" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          {!compact ? "Add skill" : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{value.id ? "Edit skill" : "Add skill"}</DialogTitle>
          <DialogDescription>
            Categorize a skill and control its public visibility.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.name?.message}
              id={`skill-name-${value.id ?? "new"}`}
              label="Skill name"
            >
              <Input
                id={`skill-name-${value.id ?? "new"}`}
                {...form.register("name")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.category?.message}
              id={`skill-category-${value.id ?? "new"}`}
              label="Category"
            >
              <Input
                id={`skill-category-${value.id ?? "new"}`}
                placeholder="Frontend"
                {...form.register("category")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.proficiency?.message}
              id={`skill-proficiency-${value.id ?? "new"}`}
              label="Proficiency"
            >
              <Input
                id={`skill-proficiency-${value.id ?? "new"}`}
                placeholder="Advanced"
                {...form.register("proficiency")}
              />
            </FormField>
            <FormField id={`skill-status-${value.id ?? "new"}`} label="Status">
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <PublicationSelect
                    onChange={field.onChange}
                    value={field.value}
                  />
                )}
              />
            </FormField>
            <FormField
              error={form.formState.errors.displayOrder?.message}
              id={`skill-order-${value.id ?? "new"}`}
              label="Display order"
            >
              <Input
                id={`skill-order-${value.id ?? "new"}`}
                min={0}
                type="number"
                {...form.register("displayOrder", { valueAsNumber: true })}
              />
            </FormField>
          </div>
          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={() => setOpen(false)}
            submitLabel={value.id ? "Save changes" : "Create skill"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
