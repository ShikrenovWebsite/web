"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Eye,
  FilePlus2,
  History,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCvVersion,
  refreshCvVersionFromPortfolio,
  saveCvVersion,
} from "@/app/admin/cv/actions";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type RecordOption = { id: string; label: string; issues: string[] };
type Options = {
  experience: RecordOption[];
  projects: RecordOption[];
  education: RecordOption[];
  skills: RecordOption[];
  certifications: RecordOption[];
  languages: RecordOption[];
};
type ProfileView = {
  fullName: string;
  headline: string;
  summary: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  hasLinks: boolean;
  issues: string[];
};
type ExportSnapshotView = {
  id: string;
  filename: string;
  exportedAtLabel: string;
  pageCount: number | null;
  checksumLabel: string;
  sizeBytes: number;
  newerDataAvailable: boolean;
};
type CvVersionView = {
  id: string;
  name: string;
  customHeadline: string;
  customSummary: string;
  selectedExperienceIds: string[];
  selectedProjectIds: string[];
  selectedEducationIds: string[];
  selectedSkillIds: string[];
  selectedCertificationIds: string[];
  selectedLanguageIds: string[];
  sectionOrder: string[];
  contactFields: string[];
  overridesJson: string;
  updatedAtLabel: string;
  lastExportedAtLabel: string;
  exportCount: number;
  newerDataAvailable: boolean;
  snapshots: ExportSnapshotView[];
};

const SECTION_LABELS: Record<string, string> = {
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
};

const DEFAULT_SECTION_ORDER = Object.keys(SECTION_LABELS);

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function SelectionGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: RecordOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const selectedOptions = selected.flatMap((id) => {
    const option = options.find((candidate) => candidate.id === id);
    return option ? [option] : [];
  });
  const unselectedOptions = options.filter(
    (option) => !selected.includes(option.id),
  );
  const orderedOptions = [...selectedOptions, ...unselectedOptions];

  function move(id: string, direction: -1 | 1) {
    const index = selected.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selected.length) return;
    const next = [...selected];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  return (
    <fieldset className="rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="grid max-h-52 gap-2 overflow-auto">
        {orderedOptions.map((option) => {
          const selectedIndex = selected.indexOf(option.id);
          const isSelected = selectedIndex >= 0;
          const inputId = `cv-${label}-${option.id}`;
          return (
            <div
              className="flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5"
              key={option.id}
            >
            <Checkbox
              checked={isSelected}
              id={inputId}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                )
              }
            />
              <Label className="min-w-0 flex-1 truncate font-normal" htmlFor={inputId}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{option.label}</span>
                  {option.issues.length ? (
                    <Badge className="shrink-0 bg-amber-100 text-amber-900">
                      Needs details
                    </Badge>
                  ) : (
                    <Badge className="shrink-0 bg-emerald-100 text-emerald-800">
                      Ready
                    </Badge>
                  )}
                </span>
                {option.issues.length ? (
                  <span className="mt-0.5 block whitespace-normal text-xs text-amber-800">
                    {option.issues.join(" · ")}
                  </span>
                ) : null}
              </Label>
              {isSelected ? (
                <div className="flex gap-1">
                  <Button
                    aria-label={`Move ${option.label} up`}
                    disabled={selectedIndex === 0}
                    onClick={() => move(option.id, -1)}
                    className="size-8"
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowUp aria-hidden="true" className="size-3.5" />
                  </Button>
                  <Button
                    aria-label={`Move ${option.label} down`}
                    disabled={selectedIndex === selected.length - 1}
                    onClick={() => move(option.id, 1)}
                    className="size-8"
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowDown aria-hidden="true" className="size-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
        {!options.length ? (
          <p className="text-xs text-muted-foreground">No records available.</p>
        ) : null}
      </div>
    </fieldset>
  );
}

function SectionOrderEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (sections: string[]) => void;
}) {
  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  return (
    <fieldset className="rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Section order</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {value.map((section, index) => (
          <div
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            key={section}
          >
            <span className="flex-1 font-medium">
              {SECTION_LABELS[section] ?? section}
            </span>
            <Button
              aria-label={`Move ${SECTION_LABELS[section] ?? section} up`}
              className="size-8"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowUp aria-hidden="true" className="size-3.5" />
            </Button>
            <Button
              aria-label={`Move ${SECTION_LABELS[section] ?? section} down`}
              className="size-8"
              disabled={index === value.length - 1}
              onClick={() => move(index, 1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowDown aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function CvVersionForm({
  options,
  profile,
  version,
}: {
  options: Options;
  profile: ProfileView;
  version?: CvVersionView;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(
    version?.name ?? (profile.headline || "General"),
  );
  const [headline, setHeadline] = useState(version?.customHeadline ?? "");
  const [summary, setSummary] = useState(version?.customSummary ?? "");
  const [experience, setExperience] = useState(
    version?.selectedExperienceIds ??
      options.experience
        .filter((item) => item.issues.length === 0)
        .map((item) => item.id),
  );
  const [projects, setProjects] = useState(
    version?.selectedProjectIds ??
      options.projects
        .filter((item) => item.issues.length === 0)
        .map((item) => item.id),
  );
  const [education, setEducation] = useState(
    version?.selectedEducationIds ??
      options.education
        .filter((item) => item.issues.length === 0)
        .map((item) => item.id),
  );
  const [skills, setSkills] = useState(
    version?.selectedSkillIds ??
      options.skills
        .filter((item) => item.issues.length === 0)
        .map((item) => item.id),
  );
  const [certifications, setCertifications] = useState(
    version?.selectedCertificationIds ??
      options.certifications
        .filter((item) => item.issues.length === 0)
        .map((item) => item.id),
  );
  const [languages, setLanguages] = useState(
    version?.selectedLanguageIds ??
      options.languages
        .filter((item) => item.issues.length === 0)
        .map((item) => item.id),
  );
  const [sectionOrder, setSectionOrder] = useState(
    version?.sectionOrder ?? DEFAULT_SECTION_ORDER,
  );
  const [contactFields, setContactFields] = useState(
    version?.contactFields ?? [
      ...(profile.email ? ["email"] : []),
      ...(profile.phone ? ["phone"] : []),
      ...(profile.location ? ["location"] : []),
      ...(profile.website ? ["website"] : []),
      ...(profile.hasLinks ? ["links"] : []),
    ],
  );
  const [overridesJson, setOverridesJson] = useState(
    version?.overridesJson ?? "{}",
  );

  function save() {
    startTransition(async () => {
      const result = await saveCvVersion({
        id: version?.id,
        name,
        customHeadline: headline,
        customSummary: summary,
        selectedExperienceIds: experience,
        selectedProjectIds: projects,
        selectedEducationIds: education,
        selectedSkillIds: skills,
        selectedCertificationIds: certifications,
        selectedLanguageIds: languages,
        contactFields,
        sectionOrder,
        overridesJson,
      });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        if (!version && result.previewPath) {
          router.push(result.previewPath);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size={version ? "sm" : "default"} variant={version ? "outline" : "default"}>
          {version ? (
            <Pencil aria-hidden="true" className="size-4" />
          ) : (
            <FilePlus2 aria-hidden="true" className="size-4" />
          )}
          {version ? "Edit" : "Create CV"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{version ? "Edit CV version" : "Create CV version"}</DialogTitle>
          <DialogDescription>
            Selections reference canonical portfolio records. Overrides affect
            only this CV.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1">
          <div
            className={`rounded-lg border p-3 ${
              profile.issues.length
                ? "border-amber-300 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-start gap-2">
              {profile.issues.length ? (
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-4 text-amber-800"
                />
              ) : (
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 text-emerald-700"
                />
              )}
              <div>
                <p className="text-sm font-medium">
                  {profile.fullName || "Portfolio profile"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile.issues.length
                    ? profile.issues.join(" · ")
                    : "Profile and contact details are ready for the CV."}
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="grid gap-1.5">
              Version name
              <Input onChange={(event) => setName(event.target.value)} value={name} />
            </Label>
            <Label className="grid gap-1.5">
              Custom headline
              <Input
                onChange={(event) => setHeadline(event.target.value)}
                placeholder={profile.headline || "Use portfolio headline"}
                value={headline}
              />
            </Label>
          </div>
          <Label className="grid gap-1.5">
            CV-specific summary
            <Textarea
              onChange={(event) => setSummary(event.target.value)}
              placeholder={
                profile.summary || "Use the current portfolio summary"
              }
              rows={4}
              value={summary}
            />
            <span className="text-xs text-muted-foreground">
              Leave blank to follow the current portfolio value. Entering text
              creates a CV-specific override.
            </span>
          </Label>
          <fieldset className="rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Contact details</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["email", "Email", profile.email],
                ["phone", "Phone", profile.phone],
                ["location", "Location", profile.location],
                ["website", "Website", profile.website],
                [
                  "links",
                  "Social links",
                  profile.hasLinks ? "Available" : "",
                ],
              ].map(([field, label, value]) => {
                const inputId = `cv-contact-${field}`;
                return (
                  <div
                    className="flex items-start gap-2 rounded-md border p-2"
                    key={field}
                  >
                    <Checkbox
                      checked={contactFields.includes(field)}
                      disabled={!value}
                      id={inputId}
                      onCheckedChange={(checked) =>
                        setContactFields(
                          checked
                            ? [...contactFields, field]
                            : contactFields.filter((item) => item !== field),
                        )
                      }
                    />
                    <Label className="min-w-0 font-normal" htmlFor={inputId}>
                      <span className="block font-medium">{label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {value || "Not available"}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </div>
          </fieldset>
          <SelectionGroup
            label="Experience"
            onChange={setExperience}
            options={options.experience}
            selected={experience}
          />
          <SelectionGroup
            label="Projects"
            onChange={setProjects}
            options={options.projects}
            selected={projects}
          />
          <SelectionGroup
            label="Education"
            onChange={setEducation}
            options={options.education}
            selected={education}
          />
          <SelectionGroup
            label="Skills"
            onChange={setSkills}
            options={options.skills}
            selected={skills}
          />
          <SelectionGroup
            label="Certifications"
            onChange={setCertifications}
            options={options.certifications}
            selected={certifications}
          />
          <SelectionGroup
            label="Languages"
            onChange={setLanguages}
            options={options.languages}
            selected={languages}
          />
          <SectionOrderEditor onChange={setSectionOrder} value={sectionOrder} />
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Advanced CV-specific bullet overrides
            </summary>
            <Label className="mt-3 grid gap-1.5">
              Override JSON
              <Textarea
                className="font-mono text-xs"
                onChange={(event) => setOverridesJson(event.target.value)}
                rows={5}
                value={overridesJson}
              />
              <span className="text-xs text-muted-foreground">
                Overrides affect this CV only and never modify portfolio
                records.
              </span>
            </Label>
          </details>
          <Button disabled={pending} onClick={save}>
            {pending ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : null}
            {version ? "Save changes" : "Save and preview"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CvBuilder({
  options,
  profile,
  versions,
}: {
  options: Options;
  profile: ProfileView;
  versions: CvVersionView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteCvVersion({ id });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function refresh(id: string) {
    startTransition(async () => {
      const result = await refreshCvVersionFromPortfolio({ id });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CvVersionForm options={options} profile={profile} />
      </div>
      {versions.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {versions.map((version) => (
            <Card key={version.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{version.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Updated {version.updatedAtLabel} · {version.exportCount} export
                      {version.exportCount === 1 ? "" : "s"}
                    </CardDescription>
                  </div>
                  {version.newerDataAvailable ? (
                    <Badge>Newer portfolio data</Badge>
                  ) : (
                    <Badge>Current</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {version.newerDataAvailable ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="font-medium">
                      Newer portfolio data is available for this CV.
                    </p>
                    <p className="mt-1 text-xs">
                      Refreshing keeps this version&apos;s selections, summary,
                      and bullet overrides.
                    </p>
                    <Button
                      className="mt-2"
                      disabled={pending}
                      onClick={() => refresh(version.id)}
                      size="sm"
                      variant="outline"
                    >
                      <RefreshCw
                        aria-hidden="true"
                        className={`size-4 ${pending ? "animate-spin" : ""}`}
                      />
                      Refresh from portfolio
                    </Button>
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Last exported: {version.lastExportedAtLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/cv/${version.id}/preview`}>
                      <Eye aria-hidden="true" className="size-4" />
                      Preview
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <a href={`/api/admin/cv/${version.id}/pdf`}>
                      <Download aria-hidden="true" className="size-4" />
                      Download PDF
                    </a>
                  </Button>
                  <CvVersionForm
                    options={options}
                    profile={profile}
                    version={version}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={pending} size="sm" variant="outline">
                        <Trash2 aria-hidden="true" className="size-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this CV version?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Its private export snapshots will also be deleted.
                          Canonical portfolio content is unaffected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(version.id)}>
                          Delete CV version
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <details className="rounded-md border">
                  <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-medium">
                    <History aria-hidden="true" className="size-4" />
                    Export history
                    <Badge className="ml-auto">{version.exportCount}</Badge>
                  </summary>
                  <div className="space-y-2 border-t p-3">
                    {version.snapshots.length ? (
                      version.snapshots.map((snapshot) => (
                        <div
                          className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                          key={snapshot.id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {snapshot.filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {snapshot.exportedAtLabel} ·{" "}
                              {snapshot.pageCount ?? "?"} page
                              {snapshot.pageCount === 1 ? "" : "s"} ·{" "}
                              {formatSize(snapshot.sizeBytes)} · snapshot{" "}
                              {snapshot.checksumLabel}
                            </p>
                            {snapshot.newerDataAvailable ? (
                              <p className="mt-1 text-xs text-amber-800">
                                Newer portfolio data is available.
                              </p>
                            ) : null}
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={`/api/admin/cv/exports/${snapshot.id}/pdf`}
                            >
                              <Download aria-hidden="true" className="size-4" />
                              Re-download
                            </a>
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No PDF exports yet.
                      </p>
                    )}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Create your first CV version from canonical portfolio content.
        </p>
      )}
    </div>
  );
}
