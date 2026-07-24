"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveExperience } from "@/app/admin/actions";
import {
  FormActions,
  FormField,
  PublicationSelect,
} from "@/components/admin/form-support";
import { handleActionResult } from "@/components/admin/use-action-result";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  experienceSchema,
  type ExperienceInput,
} from "@/lib/validations/content";

const emptyExperience: ExperienceInput = {
  company: "",
  role: "",
  employmentType: "",
  location: "",
  description: "",
  highlightsText: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  status: "DRAFT",
  displayOrder: 0,
};

export function ExperienceForm({
  value = emptyExperience,
  compact = false,
}: {
  value?: ExperienceInput;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<ExperienceInput>({
    resolver: zodResolver(experienceSchema),
    defaultValues: value,
  });
  const isCurrent = useWatch({
    control: form.control,
    name: "isCurrent",
  });

  async function onSubmit(data: ExperienceInput) {
    const result = await saveExperience(data);
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
          aria-label={compact ? "Edit experience" : undefined}
          size={compact ? "icon" : "default"}
          type="button"
          variant={compact ? "ghost" : "default"}
        >
          {compact ? (
            <Pencil aria-hidden="true" className="size-4" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          {!compact ? "Add experience" : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value.id ? "Edit experience" : "Add experience"}</DialogTitle>
          <DialogDescription>
            Add employment details, highlights, visibility, and ordering.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              error={form.formState.errors.role?.message}
              id={`role-${value.id ?? "new"}`}
              label="Role"
            >
              <Input
                id={`role-${value.id ?? "new"}`}
                {...form.register("role")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.company?.message}
              id={`company-${value.id ?? "new"}`}
              label="Company"
            >
              <Input
                id={`company-${value.id ?? "new"}`}
                {...form.register("company")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.employmentType?.message}
              id={`experience-type-${value.id ?? "new"}`}
              label="Employment type"
            >
              <Input
                id={`experience-type-${value.id ?? "new"}`}
                placeholder="Full-time, contract, freelance"
                {...form.register("employmentType")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.location?.message}
              id={`experience-location-${value.id ?? "new"}`}
              label="Location"
            >
              <Input
                id={`experience-location-${value.id ?? "new"}`}
                {...form.register("location")}
              />
            </FormField>
            <div className="flex items-end pb-3">
              <div className="flex items-center gap-2">
                <Controller
                  control={form.control}
                  name="isCurrent"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      id={`current-${value.id ?? "new"}`}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <Label htmlFor={`current-${value.id ?? "new"}`}>Current role</Label>
              </div>
            </div>
            <FormField
              error={form.formState.errors.startDate?.message}
              id={`experience-start-${value.id ?? "new"}`}
              label="Start date"
            >
              <Input
                id={`experience-start-${value.id ?? "new"}`}
                type="date"
                {...form.register("startDate")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.endDate?.message}
              id={`experience-end-${value.id ?? "new"}`}
              label="End date"
            >
              <Input
                disabled={isCurrent}
                id={`experience-end-${value.id ?? "new"}`}
                type="date"
                {...form.register("endDate")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.description?.message}
              id={`experience-description-${value.id ?? "new"}`}
              label="Description"
            >
              <Textarea
                id={`experience-description-${value.id ?? "new"}`}
                rows={4}
                {...form.register("description")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.highlightsText?.message}
              hint="Enter one highlight per line."
              id={`highlights-${value.id ?? "new"}`}
              label="Highlights"
            >
              <Textarea
                id={`highlights-${value.id ?? "new"}`}
                rows={4}
                {...form.register("highlightsText")}
              />
            </FormField>
            <FormField id={`experience-status-${value.id ?? "new"}`} label="Status">
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
              id={`experience-order-${value.id ?? "new"}`}
              label="Display order"
            >
              <Input
                id={`experience-order-${value.id ?? "new"}`}
                min={0}
                type="number"
                {...form.register("displayOrder", { valueAsNumber: true })}
              />
            </FormField>
          </div>
          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={() => setOpen(false)}
            submitLabel={value.id ? "Save changes" : "Create experience"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
