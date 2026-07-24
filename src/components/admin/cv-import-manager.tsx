"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  applyCvImport,
  deleteCvImportHistory,
  reviewCvImportAgain,
  updateCvImportItem,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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
  const [resolution, setResolution] = useState(item.resolution ?? "");
  const [confirmReplace, setConfirmReplace] = useState(false);

  function save() {
    startTransition(async () => {
      const result = await updateCvImportItem({
        itemId: item.id,
        resolution,
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
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {item.itemType.replaceAll("_", " ")}
            </CardTitle>
            <CardDescription>
              {item.existingRecordId
                ? `Possible existing match${
                    item.duplicateScore
                      ? ` · ${Math.round(item.duplicateScore * 100)}% confidence`
                      : ""
                  }`
                : "No existing match suggested"}
            </CardDescription>
          </div>
          <Badge>{item.status.toLowerCase()}</Badge>
          {item.classificationConfidence !== null &&
          item.classificationConfidence < 0.75 ? (
            <Badge className="bg-amber-100 text-amber-900">
              Low confidence
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.sourceSection ? (
          <div className="rounded-md border bg-muted/20 p-3 text-xs">
            <p className="font-medium">
              Source: page {item.sourcePage ?? "?"} · {item.sourceSection} ·
              paragraphs {item.sourceStartParagraph ?? "?"}–
              {item.sourceEndParagraph ?? "?"}
              {item.classificationConfidence !== null
                ? ` · ${Math.round(item.classificationConfidence * 100)}% classification confidence`
                : ""}
            </p>
            {item.classificationWarnings.map((warning) => (
              <p className="mt-1 text-amber-700" key={warning}>
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
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Current portfolio
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
              {item.existingJson ?? "No existing record"}
            </pre>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              CV proposal — editable before import
            </p>
            <Textarea
              className="min-h-64 font-mono text-xs"
              onChange={(event) => setEditedJson(event.target.value)}
              value={editedJson}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1.5 text-sm">
            Decision
            <Select onValueChange={setResolution} value={resolution}>
              <SelectTrigger disabled={readOnly}>
                <SelectValue placeholder="Choose an explicit decision" />
              </SelectTrigger>
              <SelectContent>
                {!item.existingRecordId ? (
                  <SelectItem value="CREATE_NEW">Import as new draft</SelectItem>
                ) : null}
                {item.existingRecordId ? (
                  <>
                    <SelectItem value="KEEP_EXISTING">
                      Keep current portfolio record
                    </SelectItem>
                    <SelectItem value="MERGE">
                      Merge missing fields and lists
                    </SelectItem>
                    <SelectItem value="REPLACE">
                      Replace fields explicitly
                    </SelectItem>
                  </>
                ) : null}
                <SelectItem value="SKIP">Skip</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <Button
            disabled={pending || readOnly || !resolution}
            onClick={() =>
              resolution === "REPLACE" ? setConfirmReplace(true) : save()
            }
          >
            {pending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            )}
            Save decision
          </Button>
        </div>
        <AlertDialog onOpenChange={setConfirmReplace} open={confirmReplace}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace portfolio fields?</AlertDialogTitle>
              <AlertDialogDescription>
                This explicitly authorizes the CV proposal to replace editable
                fields on the matched record. GitHub project relationships and
                publication state remain preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmReplace(false);
                  save();
                }}
              >
                Confirm replacement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
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

  if (!importRunId) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Upload and analyze a CV to create a review draft.
      </p>
    );
  }

  function apply() {
    startTransition(async () => {
      const result = await applyCvImport({ importRunId });
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
      <TechnologyReview suggestions={technologySuggestions} />
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Structured proposal review</p>
          <p className="text-sm text-muted-foreground">
            Unsaved and skipped items make no canonical changes. Apply runs in
            one database transaction.
          </p>
        </div>
        <Button
          disabled={pending || importRunStatus === "COMPLETED"}
          onClick={apply}
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          )}
          {importRunStatus === "COMPLETED"
            ? "Import already applied"
            : "Apply approved items"}
        </Button>
      </div>
      {items.map((item) => (
        <ReviewItemCard
          item={item}
          key={item.id}
          readOnly={importRunStatus === "COMPLETED"}
        />
      ))}
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
                className="mt-0.5 size-5 text-amber-700"
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
                <p className="mt-1 text-sm text-amber-700">
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
            <Trash2 aria-hidden="true" className="size-4 text-red-600" />
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
                className="bg-red-600 text-white hover:bg-red-700"
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
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-amber-50 p-3 text-xs text-amber-950">
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
