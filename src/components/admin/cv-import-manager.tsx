"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  applyCvImport,
  updateCvImportItem,
} from "@/app/admin/cv-import/actions";
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
};

type UploadHistory = {
  id: string;
  originalName: string;
  sizeLabel: string;
  status: string;
  createdAtLabel: string;
  error: string | null;
  scannedLikely: boolean;
  itemCount: number;
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

function ReviewItemCard({ item }: { item: ReviewItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editedJson, setEditedJson] = useState(item.importedJson);
  const [resolution, setResolution] = useState(item.resolution ?? "SKIP");
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <SelectTrigger>
                <SelectValue />
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
            disabled={pending}
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
  items,
}: {
  importRunId: string | null;
  items: ReviewItem[];
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
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Structured proposal review</p>
          <p className="text-sm text-muted-foreground">
            Unsaved and skipped items make no canonical changes. Apply runs in
            one database transaction.
          </p>
        </div>
        <Button disabled={pending} onClick={apply}>
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          )}
          Apply approved items
        </Button>
      </div>
      {items.map((item) => (
        <ReviewItemCard item={item} key={item.id} />
      ))}
    </div>
  );
}

export function CvImportManager({
  history,
  importRunId,
  reviewItems,
}: {
  history: UploadHistory[];
  importRunId: string | null;
  reviewItems: ReviewItem[];
}) {
  return (
    <Tabs defaultValue={importRunId ? "review" : "upload"}>
      <TabsList>
        <TabsTrigger value="upload">Import existing CV</TabsTrigger>
        <TabsTrigger value="review">Review proposal</TabsTrigger>
        <TabsTrigger value="history">Import history</TabsTrigger>
      </TabsList>
      <TabsContent value="upload">
        <UploadPanel />
      </TabsContent>
      <TabsContent value="review">
        <ReviewPanel importRunId={importRunId} items={reviewItems} />
      </TabsContent>
      <TabsContent value="history">
        <div className="space-y-3">
          {history.length ? (
            history.map((upload) => (
              <Card key={upload.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                        {upload.createdAtLabel} · {upload.sizeLabel} ·{" "}
                        {upload.itemCount} review items
                      </p>
                      {upload.error ? (
                        <p className="mt-1 text-sm text-amber-700">
                          {upload.scannedLikely
                            ? "This PDF appears scanned. Upload a text-based PDF or DOCX."
                            : "Extraction failed. Try a valid text-based PDF or DOCX."}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Badge>{upload.status.replaceAll("_", " ").toLowerCase()}</Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No CV uploads yet.
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
