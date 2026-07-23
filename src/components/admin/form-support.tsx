"use client";

import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function FormField({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function PublicationSelect({
  value,
  onChange,
}: {
  value: "DRAFT" | "PUBLISHED" | "HIDDEN";
  onChange: (value: "DRAFT" | "PUBLISHED" | "HIDDEN") => void;
}) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger aria-label="Publication status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="DRAFT">Draft</SelectItem>
        <SelectItem value="PUBLISHED">Published</SelectItem>
        <SelectItem value="HIDDEN">Hidden</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function SourceTypeSelect({
  value,
  onChange,
}: {
  value: "MANUAL" | "CV_IMPORT" | "GITHUB";
  onChange: (value: "MANUAL" | "CV_IMPORT" | "GITHUB") => void;
}) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger aria-label="Source type">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="MANUAL">Manual</SelectItem>
        <SelectItem value="CV_IMPORT">CV import</SelectItem>
        <SelectItem value="GITHUB">GitHub</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function FormActions({
  isSubmitting,
  onCancel,
  submitLabel,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button onClick={onCancel} type="button" variant="outline">
        Cancel
      </Button>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}
