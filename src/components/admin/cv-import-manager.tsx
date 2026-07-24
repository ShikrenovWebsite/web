"use client";

import {
  AlertTriangle,
  ArrowUpToLine,
  CheckCircle2,
  Circle,
  CircleDot,
  FileText,
  LoaderCircle,
  Merge,
  PlusCircle,
  RotateCcw,
  SkipForward,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCvImportHistory,
  publishAcceptedCvImport,
  reviewCvImportAgain,
  updateCvImportItem,
  updateCvImportItemsBulk,
} from "@/app/admin/cv-import/actions";
import { updateSkillSuggestionsBulk } from "@/app/admin/skills/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CV_REVIEW_SECTIONS,
  type CvReviewResolution,
  type CvReviewSection,
  cvItemSection,
  cvReviewChangeKind,
  cvReviewSectionLabel,
  requiredContactFields,
  requiredCvFields,
  reviewDataForResolution,
} from "@/lib/cv/review";

type ReviewItem = {
  id: string;
  itemType: string;
  status: string;
  resolution: string | null;
  importedJson: string;
  existingJson: string | null;
  existingRecordId: string | null;
  duplicateScore: number | null;
  classificationConfidence: number | null;
  sourcePage: number | null;
  sourceSection: string | null;
  sourceStartParagraph: number | null;
  sourceEndParagraph: number | null;
  sourceText: string | null;
  classificationWarnings: string[];
};

type DebugData = {
  pages: Array<{ pageNumber: number; text: string }>;
  diagnostics: Record<string, unknown> | null;
  unclassified: unknown[];
};

type UploadHistory = {
  id: string;
  importRunId: string | null;
  originalName: string;
  sizeLabel: string;
  status: string;
  createdAtLabel: string;
  error: string | null;
  scannedLikely: boolean;
  itemCount: number;
  parserVersion: string;
  importedCount: number;
  skippedCount: number;
  mergedCount: number;
};

type TechnologySuggestion = {
  id: string;
  displayName: string;
  category: string | null;
  status: "PENDING" | "ACCEPTED" | "IGNORED";
};

function UploadPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a PDF or DOCX file.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/cv/upload", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        toast.error(result.error ?? "The CV could not be uploaded.");
        return;
      }
      toast.success(result.message ?? "CV staged for review.");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("The upload could not be completed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload an existing CV</CardTitle>
        <CardDescription>
          PDF and DOCX, up to 8 MB. Files remain private and nothing is imported
          before review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={uploading}
          ref={inputRef}
          type="file"
        />
        <Button disabled={uploading} onClick={upload}>
          {uploading ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Upload aria-hidden="true" className="size-4" />
          )}
          {uploading ? "Extracting and parsing…" : "Upload and analyze"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Scanned/image-only PDFs are not OCR-processed. Upload a text-based PDF
          or DOCX when selectable text is unavailable.
        </p>
      </CardContent>
    </Card>
  );
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function itemRequiredFields(
  item: ReviewItem,
  editedJson = item.importedJson,
  resolution = item.resolution as CvReviewResolution | null,
) {
  return requiredCvFields(
    item.itemType,
    reviewDataForResolution(
      {
        itemType: item.itemType,
        existingRecordId: item.existingRecordId,
        existingData: parseJson(item.existingJson),
        editedData: parseJson(editedJson),
      },
      resolution,
    ),
  );
}

function ChangeBadge({ item }: { item: ReviewItem }) {
  const missing = itemRequiredFields(item);
  if (missing.length) {
    return (
      <Badge className="border-destructive/30 bg-destructive-muted text-destructive-foreground">
        <AlertTriangle aria-hidden="true" className="size-3" />
        Missing information
      </Badge>
    );
  }
  const kind = cvReviewChangeKind({
    existingRecordId: item.existingRecordId,
    importedData: parseJson(item.importedJson),
    existingData: parseJson(item.existingJson),
  });
  if (kind === "NEW") {
    return (
      <Badge className="border-success/30 bg-success-muted text-success-foreground">
        <PlusCircle aria-hidden="true" className="size-3" />
        New
      </Badge>
    );
  }
  if (kind === "MODIFIED") {
    return (
      <Badge className="border-warning/30 bg-warning-muted text-warning-foreground">
        <CircleDot aria-hidden="true" className="size-3" />
        Modified
      </Badge>
    );
  }
  return (
    <Badge>
      <Circle aria-hidden="true" className="size-3" />
      Unchanged
    </Badge>
  );
}

function ReviewItemCard({
  item,
  readOnly = false,
}: {
  item: ReviewItem;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editedJson, setEditedJson] = useState(item.importedJson);
  const [resolution, setResolution] = useState<CvReviewResolution | null>(
    (item.resolution as CvReviewResolution | null) ?? null,
  );
  const [confirmReplace, setConfirmReplace] = useState(false);
  const missing = itemRequiredFields(item, editedJson, resolution);

  function saveDecision(nextResolution: CvReviewResolution) {
    setResolution(nextResolution);
    startTransition(async () => {
      const result = await updateCvImportItem({
        itemId: item.id,
        resolution: nextResolution,
        editedJson,
      });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card className={missing.length ? "border-destructive/45" : undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {item.itemType.replaceAll("_", " ")}
            </CardTitle>
            <CardDescription>
              {item.existingRecordId
                ? `Matched to an existing item${
                    item.duplicateScore
                      ? ` · ${Math.round(item.duplicateScore * 100)}% confidence`
                      : ""
                  }`
                : "Proposed as a new portfolio item"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <ChangeBadge item={item} />
            {resolution ? (
              <Badge className="bg-background text-foreground">
                {resolution.replaceAll("_", " ").toLowerCase()}
              </Badge>
            ) : null}
            {item.classificationConfidence !== null &&
            item.classificationConfidence < 0.75 ? (
              <Badge className="border-warning/30 bg-warning-muted text-warning-foreground">
                Low confidence
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {missing.length ? (
          <div className="rounded-md border border-destructive/35 bg-destructive-muted p-3 text-sm text-destructive-foreground">
            <p className="font-medium">
              This item contains missing required information.
            </p>
            <p className="mt-1">Missing: {missing.join(", ")}.</p>
          </div>
        ) : null}
        {item.sourceSection ? (
          <div className="rounded-md border bg-muted/20 p-3 text-xs">
            <p className="font-medium">
              Source: page {item.sourcePage ?? "?"} · {item.sourceSection} ·
              paragraphs {item.sourceStartParagraph ?? "?"}–
              {item.sourceEndParagraph ?? "?"}
              {item.classificationConfidence !== null
                ? ` · ${Math.round(item.classificationConfidence * 100)}% confidence`
                : ""}
            </p>
            {item.classificationWarnings.map((warning) => (
              <p className="mt-1 text-warning-foreground" key={warning}>
                {warning}
              </p>
            ))}
            {item.sourceText ? (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">
                  Show source paragraphs
                </summary>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3">
                  {item.sourceText}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Current value
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
              {item.existingJson ?? "No existing record"}
            </pre>
          </div>
          <div className="hidden items-center text-muted-foreground lg:flex">
            <Merge aria-hidden="true" className="size-5" />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Imported value — editable
            </p>
            <Textarea
              className="min-h-64 font-mono text-xs"
              disabled={readOnly}
              onChange={(event) => setEditedJson(event.target.value)}
              value={editedJson}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.existingRecordId ? (
            <>
              <Button
                disabled={pending || readOnly}
                onClick={() => saveDecision("KEEP_EXISTING")}
                variant={resolution === "KEEP_EXISTING" ? "default" : "outline"}
              >
                Keep current
              </Button>
              <Button
                disabled={pending || readOnly || missing.length > 0}
                onClick={() => setConfirmReplace(true)}
                variant={resolution === "REPLACE" ? "default" : "outline"}
              >
                Use imported
              </Button>
              <Button
                disabled={pending || readOnly || missing.length > 0}
                onClick={() => saveDecision("MERGE")}
                variant={resolution === "MERGE" ? "default" : "outline"}
              >
                Merge
              </Button>
            </>
          ) : (
            <Button
              disabled={pending || readOnly || missing.length > 0}
              onClick={() => saveDecision("CREATE_NEW")}
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Accept item
            </Button>
          )}
          <Button
            disabled={pending || readOnly}
            onClick={() => saveDecision("SKIP")}
            variant={resolution === "SKIP" ? "default" : "outline"}
          >
            <SkipForward aria-hidden="true" className="size-4" />
            Ignore
          </Button>
          {pending ? (
            <LoaderCircle
              aria-label="Saving decision"
              className="size-4 animate-spin self-center"
            />
          ) : null}
        </div>
        <AlertDialog onOpenChange={setConfirmReplace} open={confirmReplace}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Use the imported values?</AlertDialogTitle>
              <AlertDialogDescription>
                This explicitly replaces editable fields on the matched record.
                GitHub relationships and publication state remain preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmReplace(false);
                  saveDecision("REPLACE");
                }}
              >
                Confirm imported values
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function ContactReview({ item }: { item: ReviewItem | undefined }) {
  if (!item) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No contact changes were detected.
      </p>
    );
  }
  const current = (parseJson(item.existingJson) ?? {}) as Record<
    string,
    unknown
  >;
  const imported = (parseJson(item.importedJson) ?? {}) as Record<
    string,
    unknown
  >;
  const fields = ["email", "phone", "location", "website", "github", "linkedin"];
  const missing = requiredContactFields(imported);
  return (
    <div
      className={`grid gap-3 rounded-md border p-4 md:grid-cols-2 ${
        missing.length ? "border-destructive/45 bg-destructive-muted/40" : ""
      }`}
    >
      <div>
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
          Current contact
        </p>
        {fields.map((field) => (
          <p className="text-sm" key={field}>
            <span className="capitalize text-muted-foreground">{field}:</span>{" "}
            {String(current[field] || "Not set")}
          </p>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
          Imported contact
        </p>
        {fields.map((field) => (
          <p className="text-sm" key={field}>
            <span className="capitalize text-muted-foreground">{field}:</span>{" "}
            {String(imported[field] || "Not detected")}
          </p>
        ))}
        {missing.length ? (
          <p className="mt-2 text-sm font-medium text-destructive-foreground">
            Missing required information: {missing.join(", ")}.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ReviewPanel({
  importRunId,
  importRunStatus,
  items,
  technologySuggestions,
}: {
  importRunId: string | null;
  importRunStatus: string | null;
  items: ReviewItem[];
  technologySuggestions: TechnologySuggestion[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [publishOpen, setPublishOpen] = useState(false);
  const readOnly = importRunStatus === "COMPLETED";
  const pendingTechnologies = technologySuggestions.filter(
    (suggestion) => suggestion.status === "PENDING",
  );

  const sectionState = useMemo(
    () =>
      CV_REVIEW_SECTIONS.map((section) => {
        const sectionItems =
          section === "CONTACT"
            ? items.filter((item) => item.itemType === "PROFILE")
            : items.filter((item) => cvItemSection(item.itemType) === section);
        const unresolved = sectionItems.filter((item) => !item.resolution);
        const missing = sectionItems.filter(
          (item) =>
            !["SKIP", "KEEP_EXISTING"].includes(item.resolution ?? "") &&
            itemRequiredFields(item).length > 0,
        );
        const technologyPending =
          section === "SKILLS" ? pendingTechnologies.length : 0;
        const counts = sectionItems.reduce(
          (total, item) => {
            const kind = cvReviewChangeKind({
              existingRecordId: item.existingRecordId,
              importedData: parseJson(item.importedJson),
              existingData: parseJson(item.existingJson),
            });
            total[kind] += 1;
            return total;
          },
          { NEW: 0, MODIFIED: 0, UNCHANGED: 0 },
        );
        return {
          section,
          items: sectionItems,
          counts,
          missing,
          complete:
            unresolved.length === 0 &&
            missing.length === 0 &&
            technologyPending === 0,
        };
      }),
    [items, pendingTechnologies.length],
  );
  const progress = Math.round(
    (sectionState.filter((section) => section.complete).length /
      CV_REVIEW_SECTIONS.length) *
      100,
  );
  const allResolved =
    items.every((item) => Boolean(item.resolution)) &&
    pendingTechnologies.length === 0;
  const missingSections = sectionState.filter(
    (section) => section.missing.length > 0,
  );

  if (!importRunId) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Upload and analyze a CV to create a review draft.
      </p>
    );
  }

  function bulk(
    section: CvReviewSection | "ALL",
    action: "ACCEPT" | "IGNORE",
  ) {
    const selectedItems =
      section === "ALL"
        ? items
        : section === "CONTACT"
          ? items.filter((item) => item.itemType === "PROFILE")
          : items.filter((item) => cvItemSection(item.itemType) === section);
    const selectedTechnologyIds =
      section === "ALL" || section === "SKILLS"
        ? pendingTechnologies.map((suggestion) => suggestion.id)
        : [];
    if (!selectedItems.length && !selectedTechnologyIds.length) return;

    startTransition(async () => {
      if (selectedTechnologyIds.length) {
        const technologyResult = await updateSkillSuggestionsBulk({
          suggestionIds: selectedTechnologyIds,
          action,
        });
        if (!technologyResult.success) {
          toast.error(technologyResult.message);
          return;
        }
      }
      if (selectedItems.length) {
        const result = await updateCvImportItemsBulk({
          importRunId,
          itemIds: selectedItems.map((item) => item.id),
          action,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        if (result.blockedItemIds?.length) toast.warning(result.message);
        else toast.success(result.message);
      } else {
        toast.success(
          action === "ACCEPT"
            ? "Detected technologies accepted."
            : "Detected technologies ignored.",
        );
      }
      router.refresh();
    });
  }

  function publish() {
    startTransition(async () => {
      const result = await publishAcceptedCvImport({ importRunId });
      if (result.success) {
        toast.success(result.message);
        setPublishOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  const summary = sectionState.map((state) => {
    const accepted = state.items.filter(
      (item) =>
        item.resolution &&
        !["SKIP", "KEEP_EXISTING"].includes(item.resolution),
    );
    const added = accepted.filter((item) => !item.existingRecordId).length;
    const changed = accepted.length - added;
    const acceptedTechnologies =
      state.section === "SKILLS"
        ? technologySuggestions.filter(
            (suggestion) => suggestion.status === "ACCEPTED",
          ).length
        : 0;
    return { ...state, added: added + acceptedTechnologies, changed };
  });

  return (
    <div className="space-y-6">
      <Card className="sticky top-3 z-20 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Review progress · {progress}% complete</CardTitle>
              <CardDescription className="mt-1">
                Safe, unique suggestions can be accepted together. Only
                uncertain or conflicting items need individual review.
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                {sectionState.map((state) => (
                  <a
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      state.complete
                        ? "border-success/35 bg-success-muted text-success-foreground"
                        : state.missing.length
                          ? "border-destructive/35 bg-destructive-muted text-destructive-foreground"
                          : "border-warning/35 bg-warning-muted text-warning-foreground"
                    }`}
                    href={`#review-${state.section.toLowerCase()}`}
                    key={state.section}
                  >
                    {state.complete ? (
                      <CheckCircle2 aria-hidden="true" className="size-3" />
                    ) : (
                      <AlertTriangle aria-hidden="true" className="size-3" />
                    )}
                    {cvReviewSectionLabel(state.section)}
                  </a>
                ))}
              </div>
              <div
                aria-label={`${progress}% of review sections complete`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={progress}
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-success transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending || readOnly}
                onClick={() => bulk("ALL", "ACCEPT")}
              >
                Accept all changes
              </Button>
              <Button
                disabled={pending || readOnly}
                onClick={() => bulk("ALL", "IGNORE")}
                variant="outline"
              >
                Ignore all changes
              </Button>
              <Button
                disabled={pending || !allResolved || missingSections.length > 0}
                onClick={() => setPublishOpen(true)}
              >
                <ArrowUpToLine aria-hidden="true" className="size-4" />
                Publish accepted changes
              </Button>
            </div>
          </div>
          {!allResolved ? (
            <p className="text-sm text-warning-foreground">
              Review or ignore the remaining items before publishing.
            </p>
          ) : null}
          {missingSections.length ? (
            <div className="rounded-md border border-destructive/35 bg-destructive-muted p-3 text-sm text-destructive-foreground">
              <p className="font-medium">
                This review contains missing required information.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingSections.map((state) => (
                  <Button asChild key={state.section} size="sm" variant="outline">
                    <a href={`#review-${state.section.toLowerCase()}`}>
                      Review {cvReviewSectionLabel(state.section)}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardHeader>
      </Card>

      {sectionState.map((state) => (
        <section
          className="scroll-mt-32 space-y-3"
          id={`review-${state.section.toLowerCase()}`}
          key={state.section}
        >
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                {cvReviewSectionLabel(state.section)}
              </h2>
              <p className="text-sm text-muted-foreground">
                <span className="text-success">
                  {state.counts.NEW} new
                </span>{" "}
                ·{" "}
                <span className="text-warning">
                  {state.counts.MODIFIED} changed
                </span>{" "}
                · {state.counts.UNCHANGED} existing
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  pending ||
                  readOnly ||
                  (!state.items.length &&
                    !(
                      state.section === "SKILLS" &&
                      pendingTechnologies.length
                    ))
                }
                onClick={() => bulk(state.section, "ACCEPT")}
                size="sm"
              >
                Accept all
              </Button>
              <Button
                disabled={
                  pending ||
                  readOnly ||
                  (!state.items.length &&
                    !(
                      state.section === "SKILLS" &&
                      pendingTechnologies.length
                    ))
                }
                onClick={() => bulk(state.section, "IGNORE")}
                size="sm"
                variant="outline"
              >
                Ignore all
              </Button>
            </div>
          </div>
          {state.missing.length ? (
            <p className="rounded-md border border-destructive/35 bg-destructive-muted p-3 text-sm text-destructive-foreground">
              This section contains missing required information.
            </p>
          ) : null}
          {state.section === "CONTACT" ? (
            <>
              <p className="text-xs text-muted-foreground">
                Contact fields belong to the profile proposal, so Profile and
                Contact share one safe import decision.
              </p>
              <ContactReview
                item={items.find((item) => item.itemType === "PROFILE")}
              />
            </>
          ) : (
            state.items.map((item) => (
              <ReviewItemCard item={item} key={item.id} readOnly={readOnly} />
            ))
          )}
          {state.section === "SKILLS" ? (
            <TechnologyReview suggestions={technologySuggestions} />
          ) : null}
          {!state.items.length &&
          state.section !== "CONTACT" &&
          !(
            state.section === "SKILLS" && technologySuggestions.length
          ) ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No changes were detected in this section.
            </p>
          ) : null}
        </section>
      ))}

      <AlertDialog onOpenChange={setPublishOpen} open={publishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish accepted changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This applies the selected import transactionally, then creates a
              new public portfolio revision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-md border p-3">
            {summary.some(
              (section) =>
                section.section !== "CONTACT" &&
                (section.added > 0 || section.changed > 0),
            ) ? (
              summary
              .filter(
                (section) =>
                  section.section !== "CONTACT" &&
                  (section.added > 0 || section.changed > 0),
              )
              .map((section) => (
                <div
                  className="flex items-center justify-between gap-3 text-sm"
                  key={section.section}
                >
                  <span className="font-medium">
                    {cvReviewSectionLabel(section.section)}
                  </span>
                  <span className="text-muted-foreground">
                    {section.added ? `+${section.added} added` : ""}
                    {section.added && section.changed ? " · " : ""}
                    {section.changed ? `${section.changed} merged/updated` : ""}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No canonical changes are selected. Publishing will only refresh
                the current public snapshot.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue reviewing</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={publish}>
              {pending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <ArrowUpToLine aria-hidden="true" className="size-4" />
              )}
              Publish changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TechnologyReview({
  suggestions,
}: {
  suggestions: TechnologySuggestion[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pendingSuggestions = suggestions.filter(
    (suggestion) => suggestion.status === "PENDING",
  );
  function update(ids: string[], action: "ACCEPT" | "IGNORE") {
    if (!ids.length) return;
    startTransition(async () => {
      const result = await updateSkillSuggestionsBulk({
        suggestionIds: ids,
        action,
      });
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      if (result.success) router.refresh();
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detected technologies</CardTitle>
        <CardDescription>
          Detected across the complete CV. Original sentences remain unchanged;
          accepted items are queued for the next portfolio publication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {suggestions.length ? (
            suggestions.map((suggestion) => (
              <div
                className="flex items-center gap-2 rounded-md border px-3 py-2"
                key={suggestion.id}
              >
                <div>
                  <p className="text-sm font-medium">{suggestion.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.category ?? "Technology"} ·{" "}
                    {suggestion.status.toLowerCase()}
                  </p>
                </div>
                {suggestion.status === "PENDING" ? (
                  <>
                    <Button
                      disabled={pending}
                      onClick={() => update([suggestion.id], "ACCEPT")}
                      size="sm"
                    >
                      Accept
                    </Button>
                    <Button
                      disabled={pending}
                      onClick={() => update([suggestion.id], "IGNORE")}
                      size="sm"
                      variant="outline"
                    >
                      Ignore
                    </Button>
                  </>
                ) : (
                  <Badge>{suggestion.status.toLowerCase()}</Badge>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No dictionary technologies were detected in this CV.
            </p>
          )}
        </div>
        {pendingSuggestions.length ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                update(
                  pendingSuggestions.map((suggestion) => suggestion.id),
                  "ACCEPT",
                )
              }
              size="sm"
            >
              Accept all
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                update(
                  pendingSuggestions.map((suggestion) => suggestion.id),
                  "IGNORE",
                )
              }
              size="sm"
              variant="outline"
            >
              Ignore all
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HistoryCard({ upload }: { upload: UploadHistory }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  function reviewAgain() {
    startTransition(async () => {
      const result = await reviewCvImportAgain({ cvUploadId: upload.id });
      if (result.success) {
        toast.success(result.message);
        router.push(
          result.importRunId
            ? `/admin/cv-import?run=${result.importRunId}`
            : "/admin/cv-import",
        );
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {upload.status === "FAILED" ? (
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-5 text-warning"
              />
            ) : (
              <FileText
                aria-hidden="true"
                className="mt-0.5 size-5 text-muted-foreground"
              />
            )}
            <div>
              <p className="font-medium">{upload.originalName}</p>
              <p className="text-sm text-muted-foreground">
                {upload.createdAtLabel} · {upload.sizeLabel} · parser{" "}
                {upload.parserVersion}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {upload.itemCount} parsed · {upload.importedCount} imported ·{" "}
                {upload.skippedCount} skipped · {upload.mergedCount} merged
              </p>
              {upload.error ? (
                <p className="mt-1 text-sm text-warning-foreground">
                  {upload.scannedLikely
                    ? "This PDF appears scanned. Upload a text-based PDF or DOCX."
                    : upload.error}
                </p>
              ) : null}
            </div>
          </div>
          <Badge>{upload.status.replaceAll("_", " ").toLowerCase()}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {upload.importRunId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/cv-import?run=${upload.importRunId}`}>
                View parsed data
              </Link>
            </Button>
          ) : null}
          <Button
            disabled={pending}
            onClick={reviewAgain}
            size="sm"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Review again / re-import
          </Button>
          <Button
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            size="sm"
            variant="outline"
          >
            <Trash2 aria-hidden="true" className="size-4 text-destructive" />
            Delete history
          </Button>
        </div>
        <AlertDialog onOpenChange={setConfirmDelete} open={confirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this CV history?</AlertDialogTitle>
              <AlertDialogDescription>
                The private source file, parsed drafts, and audit history will be
                removed. Portfolio records already created from this import will
                not be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteCvImportHistory({
                      cvUploadId: upload.id,
                    });
                    if (result.success) toast.success(result.message);
                    else toast.error(result.message);
                    if (result.success) {
                      setConfirmDelete(false);
                      router.push("/admin/cv-import");
                      router.refresh();
                    }
                  })
                }
              >
                Delete import history
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export function CvImportManager({
  debug,
  history,
  importRunId,
  importRunStatus,
  reviewItems,
  technologySuggestions,
}: {
  debug: DebugData | null;
  history: UploadHistory[];
  importRunId: string | null;
  importRunStatus: string | null;
  reviewItems: ReviewItem[];
  technologySuggestions: TechnologySuggestion[];
}) {
  return (
    <Tabs defaultValue={importRunId ? "review" : "upload"}>
      <TabsList>
        <TabsTrigger value="upload">Import existing CV</TabsTrigger>
        <TabsTrigger value="review">Review proposal</TabsTrigger>
        <TabsTrigger value="history">Import history</TabsTrigger>
        <TabsTrigger value="debug">Raw extraction</TabsTrigger>
      </TabsList>
      <TabsContent value="upload">
        <UploadPanel />
      </TabsContent>
      <TabsContent value="review">
        <ReviewPanel
          importRunId={importRunId}
          importRunStatus={importRunStatus}
          items={reviewItems}
          technologySuggestions={technologySuggestions}
        />
      </TabsContent>
      <TabsContent value="history">
        <div className="space-y-3">
          {history.length ? (
            history.map((upload) => (
              <HistoryCard key={upload.id} upload={upload} />
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No CV uploads yet.
            </p>
          )}
        </div>
      </TabsContent>
      <TabsContent value="debug">
        {debug ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Parser diagnostics</CardTitle>
                <CardDescription>
                  Admin-only extraction statistics, detected boundaries, and
                  unclassified source ranges.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
                  {JSON.stringify(debug.diagnostics, null, 2)}
                </pre>
                {debug.unclassified.length ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      Unclassified source ranges
                    </p>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-warning-muted p-3 text-xs text-warning-foreground">
                      {JSON.stringify(debug.unclassified, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            {debug.pages.map((page) => (
              <Card key={page.pageNumber}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Extracted page {page.pageNumber}
                  </CardTitle>
                  <CardDescription>
                    {page.text.length.toLocaleString("en-GB")} characters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/20 p-4 text-xs">
                    {page.text}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No extracted document is selected for review.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
