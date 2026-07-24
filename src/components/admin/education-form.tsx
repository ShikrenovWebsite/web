"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { saveEducation } from "@/app/admin/actions";
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
import { Textarea } from "@/components/ui/textarea";
import {
  educationSchema,
  type EducationInput,
} from "@/lib/validations/content";

const emptyEducation: EducationInput = {
  institution: "",
  qualification: "",
  fieldOfStudy: "",
  location: "",
  description: "",
  achievementsText: "",
  startDate: "",
  endDate: "",
  status: "DRAFT",
  displayOrder: 0,
};

export function EducationForm({
  value = emptyEducation,
  compact = false,
}: {
  value?: EducationInput;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<EducationInput>({
    resolver: zodResolver(educationSchema),
    defaultValues: value,
  });

  async function onSubmit(data: EducationInput) {
    const result = await saveEducation(data);
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
          aria-label={compact ? "Edit education" : undefined}
          size={compact ? "icon" : "default"}
          type="button"
          variant={compact ? "ghost" : "default"}
        >
          {compact ? (
            <Pencil aria-hidden="true" className="size-4" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          {!compact ? "Add education" : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value.id ? "Edit education" : "Add education"}</DialogTitle>
          <DialogDescription>
            Manage qualifications, dates, publication, and ordering.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.institution?.message}
              id={`institution-${value.id ?? "new"}`}
              label="Institution"
            >
              <Input
                id={`institution-${value.id ?? "new"}`}
                {...form.register("institution")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.achievementsText?.message}
              hint="Enter one achievement per line."
              id={`education-achievements-${value.id ?? "new"}`}
              label="Achievements"
            >
              <Textarea
                id={`education-achievements-${value.id ?? "new"}`}
                rows={3}
                {...form.register("achievementsText")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.qualification?.message}
              id={`qualification-${value.id ?? "new"}`}
              label="Qualification"
            >
              <Input
                id={`qualification-${value.id ?? "new"}`}
                {...form.register("qualification")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.fieldOfStudy?.message}
              id={`field-${value.id ?? "new"}`}
              label="Field of study"
            >
              <Input
                id={`field-${value.id ?? "new"}`}
                {...form.register("fieldOfStudy")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.location?.message}
              id={`education-location-${value.id ?? "new"}`}
              label="Location"
            >
              <Input
                id={`education-location-${value.id ?? "new"}`}
                {...form.register("location")}
              />
            </FormField>
            <div />
            <FormField
              error={form.formState.errors.startDate?.message}
              id={`education-start-${value.id ?? "new"}`}
              label="Start date"
            >
              <Input
                id={`education-start-${value.id ?? "new"}`}
                type="date"
                {...form.register("startDate")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.endDate?.message}
              id={`education-end-${value.id ?? "new"}`}
              label="End date"
            >
              <Input
                id={`education-end-${value.id ?? "new"}`}
                type="date"
                {...form.register("endDate")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.description?.message}
              id={`education-description-${value.id ?? "new"}`}
              label="Description"
            >
              <Textarea
                id={`education-description-${value.id ?? "new"}`}
                rows={4}
                {...form.register("description")}
              />
            </FormField>
            <FormField id={`education-status-${value.id ?? "new"}`} label="Status">
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
              id={`education-order-${value.id ?? "new"}`}
              label="Display order"
            >
              <Input
                id={`education-order-${value.id ?? "new"}`}
                min={0}
                type="number"
                {...form.register("displayOrder", { valueAsNumber: true })}
              />
            </FormField>
          </div>
          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={() => setOpen(false)}
            submitLabel={value.id ? "Save changes" : "Create education"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
