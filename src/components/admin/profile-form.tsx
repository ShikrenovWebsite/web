"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { saveProfile } from "@/app/admin/actions";
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
  profileSchema,
  type ProfileInput,
} from "@/lib/validations/content";

export function ProfileForm({
  value,
  compact = false,
}: {
  value: ProfileInput;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: value,
  });

  async function onSubmit(data: ProfileInput) {
    const result = await saveProfile(data);
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
          aria-label={compact ? "Edit profile" : undefined}
          size={compact ? "icon" : "default"}
          type="button"
          variant={compact ? "ghost" : "default"}
        >
          {compact ? (
            <Pencil aria-hidden="true" className="size-4" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          {!compact ? "Create profile" : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{compact ? "Edit profile" : "Create profile"}</DialogTitle>
          <DialogDescription>
            Public visitors see these details only when the profile is published.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              error={form.formState.errors.fullName?.message}
              id="fullName"
              label="Full name"
            >
              <Input id="fullName" {...form.register("fullName")} />
            </FormField>
            <FormField
              error={form.formState.errors.professionalTitle?.message}
              id="professionalTitle"
              label="Professional title"
            >
              <Input
                id="professionalTitle"
                {...form.register("professionalTitle")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.biography?.message}
              id="biography"
              label="Biography"
            >
              <Textarea id="biography" rows={6} {...form.register("biography")} />
            </FormField>
            <FormField
              error={form.formState.errors.email?.message}
              id="profileEmail"
              label="Email"
            >
              <Input id="profileEmail" type="email" {...form.register("email")} />
            </FormField>
            <FormField
              error={form.formState.errors.phone?.message}
              id="phone"
              label="Phone"
            >
              <Input id="phone" {...form.register("phone")} />
            </FormField>
            <FormField
              error={form.formState.errors.location?.message}
              id="location"
              label="Location"
            >
              <Input id="location" {...form.register("location")} />
            </FormField>
            <FormField
              error={form.formState.errors.websiteUrl?.message}
              id="websiteUrl"
              label="Website"
            >
              <Input
                id="websiteUrl"
                placeholder="https://example.com"
                type="url"
                {...form.register("websiteUrl")}
              />
            </FormField>
            <FormField
              className="sm:col-span-2"
              error={form.formState.errors.linkedinUrl?.message}
              hint="Leave blank to omit LinkedIn from the public navigation."
              id="linkedinUrl"
              label="LinkedIn URL"
            >
              <Input
                id="linkedinUrl"
                placeholder="https://www.linkedin.com/in/username"
                type="url"
                {...form.register("linkedinUrl")}
              />
            </FormField>
            <FormField id="profileStatus" label="Publication status">
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
              hint="Reserved for future multi-profile layouts."
              id="profileDisplayOrder"
              label="Display order"
            >
              <Input
                id="profileDisplayOrder"
                min={0}
                type="number"
                {...form.register("displayOrder", { valueAsNumber: true })}
              />
            </FormField>
          </div>
          <FormActions
            isSubmitting={form.formState.isSubmitting}
            onCancel={() => setOpen(false)}
            submitLabel="Save profile"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
