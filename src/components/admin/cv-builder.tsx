"use client";

import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FilePlus2,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCvVersion,
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

type RecordOption = { id: string; label: string };
type Options = {
  experience: RecordOption[];
  projects: RecordOption[];
  education: RecordOption[];
  skills: RecordOption[];
  certifications: RecordOption[];
  languages: RecordOption[];
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
  overridesJson: string;
  updatedAtLabel: string;
  lastExportedAtLabel: string;
  exportCount: number;
  newerDataAvailable: boolean;
};

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
                {option.label}
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

function CvVersionForm({
  options,
  version,
}: {
  options: Options;
  version?: CvVersionView;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(version?.name ?? "");
  const [headline, setHeadline] = useState(version?.customHeadline ?? "");
  const [summary, setSummary] = useState(version?.customSummary ?? "");
  const [experience, setExperience] = useState(
    version?.selectedExperienceIds ?? options.experience.map((item) => item.id),
  );
  const [projects, setProjects] = useState(
    version?.selectedProjectIds ?? options.projects.map((item) => item.id),
  );
  const [education, setEducation] = useState(
    version?.selectedEducationIds ?? options.education.map((item) => item.id),
  );
  const [skills, setSkills] = useState(
    version?.selectedSkillIds ?? options.skills.map((item) => item.id),
  );
  const [certifications, setCertifications] = useState(
    version?.selectedCertificationIds ??
      options.certifications.map((item) => item.id),
  );
  const [languages, setLanguages] = useState(
    version?.selectedLanguageIds ?? options.languages.map((item) => item.id),
  );
  const [sectionOrder, setSectionOrder] = useState(
    (version?.sectionOrder ?? [
      "experience",
      "projects",
      "education",
      "skills",
      "certifications",
      "languages",
    ]).join(", "),
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
        sectionOrder: sectionOrder
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        overridesJson,
      });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{version ? "Edit CV version" : "Create CV version"}</DialogTitle>
          <DialogDescription>
            Selections reference canonical portfolio records. Overrides affect
            only this CV.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="grid gap-1.5">
              Version name
              <Input onChange={(event) => setName(event.target.value)} value={name} />
            </Label>
            <Label className="grid gap-1.5">
              Custom headline
              <Input
                onChange={(event) => setHeadline(event.target.value)}
                value={headline}
              />
            </Label>
          </div>
          <Label className="grid gap-1.5">
            CV-specific summary
            <Textarea
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              value={summary}
            />
          </Label>
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
          <Label className="grid gap-1.5">
            Section order
            <Input
              onChange={(event) => setSectionOrder(event.target.value)}
              value={sectionOrder}
            />
            <span className="text-xs text-muted-foreground">
              Comma-separated: experience, projects, education, skills,
              certifications, languages.
            </span>
          </Label>
          <Label className="grid gap-1.5">
            CV-specific bullet overrides
            <Textarea
              className="font-mono text-xs"
              onChange={(event) => setOverridesJson(event.target.value)}
              rows={5}
              value={overridesJson}
            />
            <span className="text-xs text-muted-foreground">
              Optional JSON, for example:
              <code className="ml-1">
                {`{"experience":{"record-id":{"highlights":["Tailored bullet"]}}}`}
              </code>
            </span>
          </Label>
          <Button disabled={pending} onClick={save}>
            {pending ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : null}
            Save CV version
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CvBuilder({
  options,
  versions,
}: {
  options: Options;
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CvVersionForm options={options} />
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
                  <CvVersionForm options={options} version={version} />
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
