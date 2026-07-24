"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Pencil, Plus, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { saveProject } from "@/app/admin/actions";
import {
  FormActions,
  FormField,
  PublicationSelect,
  SourceTypeSelect,
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
  projectSchema,
  type ProjectInput,
} from "@/lib/validations/content";

const emptyProject: ProjectInput = {
  title: "",
  shortDescription: "",
  longDescription: "",
  highlightsText: "",
  technologiesText: "",
  liveUrl: "",
  sourceCodeUrl: "",
  coverImageUrl: "",
  startDate: "",
  endDate: "",
  featured: false,
  status: "DRAFT",
  sourceType: "MANUAL",
  displayOrder: 0,
};

export function ProjectForm({
  value = emptyProject,
  compact = false,
  githubRepositoryName,
  coverImageName,
}: {
  value?: ProjectInput;
  compact?: boolean;
  githubRepositoryName?: string | null;
  coverImageName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: value,
  });

  async function onSubmit(data: ProjectInput) {
    const result = await saveProject(data);
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
          aria-label={compact ? "Edit project" : undefined}
          size={compact ? "icon" : "default"}
          type="button"
          variant={compact ? "ghost" : "default"}
        >
          {compact ? (
            <Pencil aria-hidden="true" className="size-4" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          {!compact ? "Add project" : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{value.id ? "Edit project" : "Add project"}</DialogTitle>
          <DialogDescription>
            Portfolio presentation remains editable independently of its source.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.title?.message}
              id={`project-title-${value.id ?? "new"}`}
              label="Title"
            >
              <Input
                id={`project-title-${value.id ?? "new"}`}
                {...form.register("title")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.highlightsText?.message}
              hint="Enter one project achievement per line."
              id={`project-highlights-${value.id ?? "new"}`}
              label="Project achievements"
            >
              <Textarea
                id={`project-highlights-${value.id ?? "new"}`}
                rows={4}
                {...form.register("highlightsText")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.coverImageUrl?.message}
              hint="Use an HTTPS image URL, or select a README suggestion from GitHub review."
              id={`project-cover-url-${value.id ?? "new"}`}
              label="Cover image URL"
            >
              <Input
                id={`project-cover-url-${value.id ?? "new"}`}
                placeholder="https://..."
                type="url"
                {...form.register("coverImageUrl")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.shortDescription?.message}
              id={`project-short-${value.id ?? "new"}`}
              label="Short description"
            >
              <Input
                id={`project-short-${value.id ?? "new"}`}
                {...form.register("shortDescription")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.longDescription?.message}
              id={`project-long-${value.id ?? "new"}`}
              label="Long description"
            >
              <Textarea
                id={`project-long-${value.id ?? "new"}`}
                rows={6}
                {...form.register("longDescription")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.technologiesText?.message}
              hint="Separate technologies with commas."
              id={`project-technologies-${value.id ?? "new"}`}
              label="Technology tags"
            >
              <Input
                id={`project-technologies-${value.id ?? "new"}`}
                placeholder="Next.js, TypeScript, PostgreSQL"
                {...form.register("technologiesText")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.liveUrl?.message}
              id={`project-live-${value.id ?? "new"}`}
              label="Live URL"
            >
              <Input
                id={`project-live-${value.id ?? "new"}`}
                placeholder="https://example.com"
                type="url"
                {...form.register("liveUrl")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.sourceCodeUrl?.message}
              id={`project-source-${value.id ?? "new"}`}
              label="Source URL"
            >
              <Input
                id={`project-source-${value.id ?? "new"}`}
                placeholder="https://github.com/..."
                type="url"
                {...form.register("sourceCodeUrl")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.startDate?.message}
              id={`project-start-${value.id ?? "new"}`}
              label="Start date"
            >
              <Input
                id={`project-start-${value.id ?? "new"}`}
                type="date"
                {...form.register("startDate")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.endDate?.message}
              id={`project-end-${value.id ?? "new"}`}
              label="End date"
            >
              <Input
                id={`project-end-${value.id ?? "new"}`}
                type="date"
                {...form.register("endDate")}
              />
            </FormField>
            <FormField id={`project-status-${value.id ?? "new"}`} label="Status">
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
            <FormField id={`project-source-type-${value.id ?? "new"}`} label="Source type">
              <Controller
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <SourceTypeSelect
                    onChange={field.onChange}
                    value={field.value}
                  />
                )}
              />
            </FormField>
            <FormField
              error={form.formState.errors.displayOrder?.message}
              id={`project-order-${value.id ?? "new"}`}
              label="Display order"
            >
              <Input
                id={`project-order-${value.id ?? "new"}`}
                min={0}
                type="number"
                {...form.register("displayOrder", { valueAsNumber: true })}
              />
            </FormField>
            <div className="flex items-end pb-3">
              <div className="flex items-center gap-2">
                <Controller
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      id={`project-featured-${value.id ?? "new"}`}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <Label htmlFor={`project-featured-${value.id ?? "new"}`}>
                  Featured project
                </Label>
              </div>
            </div>
            <div className="rounded-lg border border-dashed p-4 sm:col-span-2">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex gap-3">
                  <Unplug
                    aria-hidden="true"
                    className="mt-0.5 size-4 text-muted-foreground"
                  />
                  <div>
                    <p className="font-medium">GitHub connection</p>
                    <p className="text-muted-foreground">
                      {githubRepositoryName ?? "Not connected to a GitHub source."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ImageIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 text-muted-foreground"
                  />
                  <div>
                    <p className="font-medium">Cover image metadata</p>
                    <p className="text-muted-foreground">
                      {coverImageName ?? "No cover metadata — uploads arrive later."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={() => setOpen(false)}
            submitLabel={value.id ? "Save changes" : "Create project"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
