"use client";

import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  GitBranch,
  GitFork,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Star,
  Unplug,
} from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addRepositoryToPortfolio,
  applyGitHubCoverImage,
  applyAllGitHubProjectFields,
  applyGitHubProjectField,
  connectGitHubAccount,
  finishRepositoryChangeReview,
  handleUnavailableRepository,
  setOrganizationSyncPreference,
  setRepositoryReviewStatus,
  syncGitHub,
  testGitHubOrganizationAccess,
  type GitHubActionResult,
} from "@/app/admin/github/actions";
import { EmptyState } from "@/components/admin/empty-state";
import { SafeReadme } from "@/components/admin/safe-readme";
import { SectionHeading } from "@/components/admin/section-heading";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  githubAccessBadgeClass,
  githubAccessLabel,
  githubOwnerPreferenceBadgeClass,
  githubOwnerPreferenceLabel,
  githubReviewBadgeClass,
  githubReviewLabel,
  statusBadgeClass,
  statusLabel,
} from "@/lib/status";
import { hasRequiredGitHubScopes } from "@/lib/github/scopes";

type Project = {
  id: string;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  technologies: string[];
  liveUrl: string | null;
  sourceCodeUrl: string | null;
  coverImageUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  featured: boolean;
  displayOrder: number;
};

type Repository = {
  id: string;
  name: string;
  fullName: string;
  ownerLogin: string;
  ownerType: "USER" | "ORGANIZATION";
  ownerAvatarUrl: string | null;
  description: string | null;
  githubUrl: string;
  homepageUrl: string | null;
  primaryLanguage: string | null;
  topics: string[];
  starCount: number;
  forkCount: number;
  visibility: string;
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  defaultBranch: string | null;
  readmePreview: string | null;
  readmeMarkdown: string | null;
  readmeImages: Array<{ url: string; alt: string; source: string }>;
  sourceFiles: string[];
  enrichmentCategories: Array<{ label: string; technologies: string[] }>;
  enrichmentVersion: number;
  enrichmentError: string | null;
  detectedTechnologies: string[];
  suggestedTitle: string | null;
  suggestedShortDescription: string | null;
  suggestedLongDescription: string | null;
  suggestedCoverImageUrl: string | null;
  enrichedAt: string | null;
  enrichedAtLabel: string;
  githubUpdatedAt: string | null;
  githubUpdatedAtLabel: string;
  githubPushedAt: string | null;
  githubPushedAtLabel: string;
  lastSuccessfulSyncAt: string | null;
  lastSuccessfulSyncAtLabel: string;
  unavailableAt: string | null;
  unavailableReason: string | null;
  status: "PENDING" | "ACCEPTED" | "IGNORED" | "REMOVED";
  project: Project | null;
  pendingChanges: string[];
  projectDifferences: string[];
  hasUnavailableReview: boolean;
};

type LatestRun = {
  status: "RUNNING" | "COMPLETED" | "FAILED";
  repositoriesSeen: number;
  personalRepositoriesFound: number;
  organizationsDiscovered: number;
  organizationRepositoriesFound: number;
  organizationsSynchronized: number;
  organizationsSkipped: number;
  organizationsRequiringApproval: number;
  partialFailureCount: number;
  newCount: number;
  changedCount: number;
  unchangedCount: number;
  unavailableCount: number;
  warningCount: number;
  rateLimitRemaining: number | null;
  rateLimitResetAt: string | null;
  errorMessage: string | null;
  startedAt: string;
  startedAtLabel: string;
  completedAt: string | null;
  completedAtLabel: string;
  rateLimitResetAtLabel: string;
};

type GitHubOwner = {
  id: string;
  login: string;
  type: "USER" | "ORGANIZATION";
  avatarUrl: string | null;
  preference: "PENDING" | "ENABLED" | "IGNORED";
  syncEnabled: boolean;
  accessStatus:
    | "ACCESSIBLE"
    | "REAUTHORIZATION_REQUIRED"
    | "APPROVAL_REQUIRED"
    | "RESTRICTED"
    | "PARTIAL"
    | "UNAVAILABLE";
  accessMessage: string | null;
  lastApiStatus: number | null;
  rawRepositoryCount: number;
  eligibleRepositoryCount: number;
  diagnosticData: unknown;
  lastDiscoveredAt: string | null;
  lastDiscoveredAtLabel: string;
  lastSuccessfulSyncAt: string | null;
  lastSuccessfulSyncAtLabel: string;
};

type Connection = {
  githubLogin: string;
  scopes: string[];
  oauthScopes: string[];
  includeForks: boolean;
  includeArchived: boolean;
  includeTemplates: boolean;
  lastSyncedAt: string | null;
  lastSyncedAtLabel: string;
  latestRun: LatestRun | null;
  owners: GitHubOwner[];
  repositories: Repository[];
};

function useGitHubAction() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<GitHubActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message, {
          description: result.summary
            ? `${result.summary.discovered} new · ${result.summary.changed} changed · ${result.summary.unchanged} unchanged`
            : undefined,
        });
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return { isPending, run };
}

function PendingIcon({ pending }: { pending: boolean }) {
  return pending ? (
    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
  ) : null;
}

function RepositoryMetadata({ repository }: { repository: Repository }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {repository.primaryLanguage ? (
        <span>{repository.primaryLanguage}</span>
      ) : null}
      <span className="inline-flex items-center gap-1">
        <Star aria-hidden="true" className="size-3.5" />
        {repository.starCount}
      </span>
      <span className="inline-flex items-center gap-1">
        <GitFork aria-hidden="true" className="size-3.5" />
        {repository.forkCount}
      </span>
      {repository.defaultBranch ? (
        <span className="inline-flex items-center gap-1">
          <GitBranch aria-hidden="true" className="size-3.5" />
          {repository.defaultBranch}
        </span>
      ) : null}
      <span>Updated {repository.githubUpdatedAtLabel}</span>
    </div>
  );
}

function SourceBadges({ repository }: { repository: Repository }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge className={githubReviewBadgeClass(repository.status)}>
        {githubReviewLabel(repository.status)}
      </Badge>
      <Badge>{repository.visibility}</Badge>
      <Badge>
        {repository.ownerType === "ORGANIZATION" ? "Organization" : "User"}
      </Badge>
      {repository.isFork ? <Badge>Fork</Badge> : null}
      {repository.isArchived ? <Badge>Archived</Badge> : null}
      {repository.isTemplate ? <Badge>Template</Badge> : null}
      {repository.project ? (
        <Badge className={statusBadgeClass(repository.project.status)}>
          Project: {statusLabel(repository.project.status)}
        </Badge>
      ) : null}
    </div>
  );
}

function RepositoryBody({ repository }: { repository: Repository }) {
  const { isPending, run } = useGitHubAction();

  return (
    <CardContent className="space-y-4">
      <RepositoryMetadata repository={repository} />
      {repository.topics.length ? (
        <div className="flex flex-wrap gap-1.5">
          {repository.topics.map((topic) => (
            <Badge key={topic}>{topic}</Badge>
          ))}
        </div>
      ) : null}
      {repository.enrichmentVersion > 0 ? (
        <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-4">
          <div className="flex items-start gap-2">
            <Sparkles
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-violet-700"
            />
            <div>
              <p className="text-sm font-medium">Portfolio suggestions</p>
              <p className="text-xs text-muted-foreground">
                Generated from immutable GitHub source files. Applying a
                suggestion is explicit; future syncs do not overwrite editable
                project fields.
              </p>
            </div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Suggested title</dt>
              <dd className="mt-1 font-medium">
                {repository.suggestedTitle || "No suggestion"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Enriched</dt>
              <dd className="mt-1 font-medium">{repository.enrichedAtLabel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">
                Suggested summary
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {repository.suggestedShortDescription || "No suggestion"}
              </dd>
            </div>
          </dl>
          {repository.detectedTechnologies.length ? (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                Detected technologies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {repository.detectedTechnologies.map((technology) => (
                  <Badge key={technology}>{technology}</Badge>
                ))}
              </div>
            </div>
          ) : null}
          {repository.enrichmentCategories.length ? (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Detection details
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {repository.enrichmentCategories.map((category) => (
                  <div key={category.label}>
                    <p className="text-xs capitalize text-muted-foreground">
                      {category.label.replace(/([A-Z])/g, " $1")}
                    </p>
                    <p className="mt-1">{category.technologies.join(", ")}</p>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          {repository.sourceFiles.length ? (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Source evidence ({repository.sourceFiles.length} files)
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
                {repository.sourceFiles.map((path) => (
                  <li className="break-all" key={path}>
                    {path}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
      {repository.enrichmentError ? (
        <div
          className="rounded-lg border border-warning/35 bg-warning-muted p-3 text-sm text-warning-foreground"
          role="alert"
        >
          Repository content could not be fully analyzed:{" "}
          {repository.enrichmentError}
        </div>
      ) : null}
      {repository.readmeImages.length ? (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Suggested README covers ({repository.readmeImages.length})
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {repository.readmeImages.map((image) => (
              <div
                className="overflow-hidden rounded-lg border"
                key={image.url}
              >
                <span
                  aria-label={image.alt}
                  className="block aspect-video bg-muted bg-contain bg-center bg-no-repeat"
                  role="img"
                  style={{ backgroundImage: `url("${image.url}")` }}
                />
                <div className="space-y-2 p-3">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {image.alt}
                  </p>
                  {repository.project ? (
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        run(() =>
                          applyGitHubCoverImage({
                            repositoryId: repository.id,
                            imageUrl: image.url,
                          }),
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      <ImageIcon aria-hidden="true" className="size-4" />
                      Use as cover
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}
      {repository.readmeMarkdown ? (
        <details className="rounded-lg border bg-muted/30 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            README preview
          </summary>
          <div className="mt-3 max-h-96 overflow-auto">
            <SafeReadme
              markdown={repository.readmeMarkdown}
              repositoryUrl={repository.githubUrl}
            />
          </div>
        </details>
      ) : null}
    </CardContent>
  );
}

function RepositoryHeader({ repository }: { repository: Repository }) {
  return (
    <CardHeader className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {repository.ownerAvatarUrl ? (
              <span
                aria-label={`${repository.ownerLogin} avatar`}
                className="size-9 shrink-0 rounded-full border bg-cover bg-center"
                role="img"
                style={{
                  backgroundImage: `url("${repository.ownerAvatarUrl}")`,
                }}
              />
            ) : null}
            <CardTitle className="break-words">{repository.fullName}</CardTitle>
          </div>
          <CardDescription className="mt-2 whitespace-pre-line">
            {repository.description || "No GitHub description"}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={repository.githubUrl} rel="noreferrer" target="_blank">
              GitHub
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </Button>
          {repository.homepageUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={repository.homepageUrl} rel="noreferrer" target="_blank">
                Live
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <SourceBadges repository={repository} />
    </CardHeader>
  );
}

function OwnerCard({ owner }: { owner: GitHubOwner }) {
  const { isPending, run } = useGitHubAction();

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {owner.avatarUrl ? (
            <span
              aria-label={`${owner.login} avatar`}
              className="size-10 shrink-0 rounded-full border bg-cover bg-center"
              role="img"
              style={{ backgroundImage: `url("${owner.avatarUrl}")` }}
            />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
              {owner.login.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{owner.login}</p>
              <Badge>
                {owner.type === "ORGANIZATION" ? "Organization" : "Personal"}
              </Badge>
              <Badge className={githubAccessBadgeClass(owner.accessStatus)}>
                {githubAccessLabel(owner.accessStatus)}
              </Badge>
              <Badge
                className={githubOwnerPreferenceBadgeClass(owner.preference)}
              >
                {githubOwnerPreferenceLabel(owner.preference)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sync: {owner.syncEnabled ? "Enabled" : "Disabled"} · Repositories
              returned: {owner.rawRepositoryCount} · Eligible:{" "}
              {owner.eligibleRepositoryCount} · Last API status:{" "}
              {owner.lastApiStatus ?? "Unknown"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Discovered {owner.lastDiscoveredAtLabel} · Last successful
              inspection {owner.lastSuccessfulSyncAtLabel}
            </p>
            {owner.accessMessage ? (
              <p className="mt-2 text-xs text-warning-foreground">
                {owner.accessMessage}
              </p>
            ) : null}
          </div>
        </div>
        {owner.type === "ORGANIZATION" ? (
          <div className="flex flex-wrap gap-2">
            {owner.preference !== "ENABLED" ? (
              <Button
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    setOrganizationSyncPreference({
                      ownerId: owner.id,
                      preference: "ENABLED",
                    }),
                  )
                }
                size="sm"
              >
                <PendingIcon pending={isPending} />
                Enable synchronization
              </Button>
            ) : (
              <Button
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    setOrganizationSyncPreference({
                      ownerId: owner.id,
                      preference: "PENDING",
                    }),
                  )
                }
                size="sm"
                variant="outline"
              >
                <PendingIcon pending={isPending} />
                Disable sync
              </Button>
            )}
            {owner.preference === "IGNORED" ? (
              <Button
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    setOrganizationSyncPreference({
                      ownerId: owner.id,
                      preference: "PENDING",
                    }),
                  )
                }
                size="sm"
                variant="outline"
              >
                <PendingIcon pending={isPending} />
                Restore
              </Button>
            ) : (
              <Button
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    setOrganizationSyncPreference({
                      ownerId: owner.id,
                      preference: "IGNORED",
                    }),
                  )
                }
                size="sm"
                variant="outline"
              >
                <PendingIcon pending={isPending} />
                Ignore
              </Button>
            )}
          </div>
        ) : (
          <Badge>Always enabled</Badge>
        )}
      </CardContent>
    </Card>
  );
}

function TestAccessCard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [diagnostics, setDiagnostics] =
    useState<GitHubActionResult["diagnostics"]>(undefined);

  function testAccess() {
    startTransition(async () => {
      const result = await testGitHubOrganizationAccess({
        organizationLogin: "Calistheni",
        repositoryName: "calistheni-app",
      });
      setDiagnostics(result.diagnostics);
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
        <CardTitle>Development access diagnostics</CardTitle>
        <CardDescription>
          Tests organization discovery, the direct organization listing, and
          Calistheni/calistheni-app without exposing credentials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button disabled={isPending} onClick={testAccess} variant="outline">
          <PendingIcon pending={isPending} />
          {isPending ? "Testing access…" : "Test access"}
        </Button>
        {diagnostics ? (
          <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Authenticated login</dt>
              <dd className="font-medium">
                {diagnostics.authenticatedGitHubLogin}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Granted scopes</dt>
              <dd className="font-medium">
                {diagnostics.grantedScopes.join(", ") || "None reported"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Organizations returned</dt>
              <dd className="font-medium">
                {diagnostics.organizationsReturned.join(", ") || "None"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Organization repositories
              </dt>
              <dd className="font-medium">
                HTTP {diagnostics.organizationRepositoryStatus} ·{" "}
                {diagnostics.organizationRepositoryCount} returned
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Direct repository</dt>
              <dd className="font-medium">
                HTTP {diagnostics.targetRepositoryStatus} ·{" "}
                {diagnostics.targetRepositoryEligible
                  ? "Eligible"
                  : diagnostics.targetRepositoryExclusionReasons.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Organization approval</dt>
              <dd className="font-medium">
                {diagnostics.organizationApprovalState}
              </dd>
            </div>
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReviewActions({
  repository,
  mode,
}: {
  repository: Repository;
  mode: "pending" | "ignored";
}) {
  const { isPending, run } = useGitHubAction();

  return (
    <div className="flex flex-wrap gap-2 border-t p-4">
      <Button
        disabled={isPending}
        onClick={() =>
          run(() => addRepositoryToPortfolio({ repositoryId: repository.id }))
        }
        size="sm"
      >
        <PendingIcon pending={isPending} />
        Add to portfolio
      </Button>
      {mode === "pending" ? (
        <Button
          disabled={isPending}
          onClick={() =>
            run(() =>
              setRepositoryReviewStatus({
                repositoryId: repository.id,
                status: "IGNORED",
              }),
            )
          }
          size="sm"
          variant="outline"
        >
          Ignore
        </Button>
      ) : (
        <Button
          disabled={isPending}
          onClick={() =>
            run(() =>
              setRepositoryReviewStatus({
                repositoryId: repository.id,
                status: "PENDING",
              }),
            )
          }
          size="sm"
          variant="outline"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Reconsider
        </Button>
      )}
      {mode === "pending" ? (
        <span className="self-center text-xs text-muted-foreground">
          Decide later by leaving this repository pending.
        </span>
      ) : null}
    </div>
  );
}

const comparisonFields = [
  {
    key: "title" as const,
    label: "Title",
    sourceFields: ["name", "suggestedTitle"],
    current: (project: Project) => project.title,
    incoming: (repository: Repository) =>
      repository.suggestedTitle ?? repository.name,
  },
  {
    key: "shortDescription" as const,
    label: "Short description",
    sourceFields: ["description", "suggestedShortDescription"],
    current: (project: Project) => project.shortDescription,
    incoming: (repository: Repository) =>
      repository.suggestedShortDescription ?? repository.description,
  },
  {
    key: "longDescription" as const,
    label: "Long description",
    sourceFields: ["readmeMarkdown", "suggestedLongDescription"],
    current: (project: Project) => project.longDescription,
    incoming: (repository: Repository) =>
      repository.suggestedLongDescription ?? repository.readmePreview,
  },
  {
    key: "technologies" as const,
    label: "Technologies",
    sourceFields: ["detectedTechnologies", "topics", "primaryLanguage"],
    current: (project: Project) => project.technologies.join(", "),
    incoming: (repository: Repository) =>
      repository.detectedTechnologies.length
        ? repository.detectedTechnologies.join(", ")
        : [repository.primaryLanguage, ...repository.topics]
            .filter(Boolean)
            .join(", "),
  },
  {
    key: "liveUrl" as const,
    label: "Live URL",
    sourceFields: ["homepageUrl"],
    current: (project: Project) => project.liveUrl,
    incoming: (repository: Repository) => repository.homepageUrl,
  },
  {
    key: "sourceCodeUrl" as const,
    label: "Source URL",
    sourceFields: ["githubUrl"],
    current: (project: Project) => project.sourceCodeUrl,
    incoming: (repository: Repository) => repository.githubUrl,
  },
  {
    key: "coverImageUrl" as const,
    label: "Cover image",
    sourceFields: ["suggestedCoverImageUrl"],
    current: (project: Project) => project.coverImageUrl,
    incoming: (repository: Repository) => repository.suggestedCoverImageUrl,
  },
];

function ChangeReview({ repository }: { repository: Repository }) {
  const { isPending, run } = useGitHubAction();
  if (!repository.project) return null;

  const visibleFields = comparisonFields.filter(
    (field) =>
      repository.projectDifferences.includes(field.key) ||
      field.sourceFields.some((sourceField) =>
        repository.pendingChanges.includes(sourceField),
      ),
  );

  return (
    <div className="space-y-4 border-t p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <RefreshCw aria-hidden="true" className="size-4" />
        GitHub updates available
        <Badge className="bg-transparent">
          Synced {repository.lastSuccessfulSyncAtLabel}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[...new Set(repository.pendingChanges)].map((field) => (
          <Badge key={field}>
            {field
              .replace(/([a-z])([A-Z])/g, "$1 $2")
              .replace(/^./, (character) => character.toUpperCase())}{" "}
            changed
          </Badge>
        ))}
      </div>
      {(visibleFields.length
        ? visibleFields
        : comparisonFields.slice(0, 2)
      ).map((field) => (
        <div
          className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1fr_auto_1fr]"
          key={field.key}
        >
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Portfolio {field.label}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {field.current(repository.project!) || "Not set"}
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="hidden size-4 self-center text-muted-foreground lg:block"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              GitHub {field.label}
            </p>
            <p className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-words text-sm">
              {field.incoming(repository) || "Not set"}
            </p>
            <Button
              className="mt-2"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  applyGitHubProjectField({
                    repositoryId: repository.id,
                    field: field.key,
                  }),
                )
              }
              size="sm"
              variant="outline"
            >
              Use GitHub value
            </Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isPending}
          onClick={() =>
            run(() =>
              applyAllGitHubProjectFields({ repositoryId: repository.id }),
            )
          }
          size="sm"
        >
          <PendingIcon pending={isPending} />
          Update everything
        </Button>
        <Button
          disabled={isPending}
          onClick={() =>
            run(() =>
              finishRepositoryChangeReview({ repositoryId: repository.id }),
            )
          }
          size="sm"
          variant="outline"
        >
          <PendingIcon pending={isPending} />
          Finish review; keep remaining
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/projects`}>
            Edit project manually
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ConfirmUnavailableAction({
  repository,
  action,
  label,
  description,
}: {
  repository: Repository;
  action: "UNPUBLISH" | "DISCONNECT" | "REMOVE_PROJECT";
  label: string;
  description: string;
}) {
  const { isPending, run } = useGitHubAction();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={isPending} size="sm" variant="outline">
          {action === "DISCONNECT" ? (
            <Unplug aria-hidden="true" className="size-4" />
          ) : null}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              run(() =>
                handleUnavailableRepository({
                  repositoryId: repository.id,
                  action,
                }),
              )
            }
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UnavailableActions({ repository }: { repository: Repository }) {
  const { isPending, run } = useGitHubAction();

  return (
    <div className="space-y-3 border-t p-4">
      <div className="flex gap-2 rounded-lg border border-warning/35 bg-warning-muted p-3 text-sm text-warning-foreground">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          GitHub source unavailable:{" "}
          {repository.unavailableReason?.replaceAll("_", " ").toLowerCase() ||
            "unknown reason"}
          . The portfolio project was not deleted or overwritten.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isPending}
          onClick={() =>
            run(() =>
              handleUnavailableRepository({
                repositoryId: repository.id,
                action: "KEEP",
              }),
            )
          }
          size="sm"
        >
          Keep project
        </Button>
        {repository.project ? (
          <>
            <ConfirmUnavailableAction
              action="UNPUBLISH"
              description="The project will become a draft. Its content and GitHub link remain intact."
              label="Unpublish"
              repository={repository}
            />
            <ConfirmUnavailableAction
              action="DISCONNECT"
              description="The editable portfolio project remains, but its GitHub source link will be removed."
              label="Disconnect"
              repository={repository}
            />
            <ConfirmUnavailableAction
              action="REMOVE_PROJECT"
              description="The portfolio project will be deleted. The unavailable GitHub source record remains for audit and review."
              label="Remove project"
              repository={repository}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function RepositoryCard({
  repository,
  mode,
}: {
  repository: Repository;
  mode: "pending" | "added" | "ignored" | "changed" | "unavailable";
}) {
  return (
    <Card>
      <RepositoryHeader repository={repository} />
      <RepositoryBody repository={repository} />
      {mode === "pending" || mode === "ignored" ? (
        <ReviewActions mode={mode} repository={repository} />
      ) : null}
      {mode === "added" && repository.project ? (
        <div className="flex border-t p-4">
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/projects">Edit draft project</Link>
          </Button>
        </div>
      ) : null}
      {mode === "changed" ? <ChangeReview repository={repository} /> : null}
      {mode === "unavailable" ? (
        <UnavailableActions repository={repository} />
      ) : null}
    </Card>
  );
}

function RepositoryGrid({
  repositories,
  mode,
  emptyTitle,
  emptyDescription,
}: {
  repositories: Repository[];
  mode: "pending" | "added" | "ignored" | "changed" | "unavailable";
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!repositories.length) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {repositories.map((repository) => (
        <RepositoryCard
          key={repository.id}
          mode={mode}
          repository={repository}
        />
      ))}
    </div>
  );
}

export function GitHubManager({
  connection,
}: {
  connection: Connection | null;
}) {
  const { isPending, run } = useGitHubAction();
  const repositories = connection?.repositories ?? [];
  const groups = {
    pending: repositories.filter(
      (repository) =>
        repository.status === "PENDING" && !repository.unavailableAt,
    ),
    added: repositories.filter(
      (repository) =>
        repository.status === "ACCEPTED" && !repository.unavailableAt,
    ),
    ignored: repositories.filter(
      (repository) => repository.status === "IGNORED",
    ),
    changed: repositories.filter(
      (repository) =>
        repository.status === "ACCEPTED" &&
        !repository.unavailableAt &&
        repository.pendingChanges.length > 0,
    ),
    unavailable: repositories.filter((repository) =>
      Boolean(repository.unavailableAt),
    ),
  };
  const storedScopeReady = hasRequiredGitHubScopes(connection?.scopes ?? []);
  const oauthScopeReady = hasRequiredGitHubScopes(
    connection?.oauthScopes ?? [],
  );
  const personalOwner = connection?.owners.find(
    (owner) => owner.type === "USER",
  );
  const organizations =
    connection?.owners.filter((owner) => owner.type === "ORGANIZATION") ?? [];

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Synchronize public repositories as source data, then decide what becomes editable portfolio content."
        title="GitHub synchronization"
      />

      {!connection ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect the approved GitHub account</CardTitle>
            <CardDescription>
              Reuse the server-side OAuth token from the owner sign-in. Tokens
              are encrypted at rest and never sent to this browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              disabled={isPending}
              onClick={() => run(() => connectGitHubAccount())}
            >
              <PendingIcon pending={isPending} />
              Connect GitHub
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {!storedScopeReady ? (
            <div
              className="flex flex-col gap-4 rounded-lg border border-warning/35 bg-warning-muted p-4 text-sm text-warning-foreground sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <div>
                <p className="font-medium">GitHub reconnection required</p>
                <p className="mt-1">
                  The stored token does not include read:org, so organization
                  membership discovery is incomplete. Existing repository
                  decisions and projects will be preserved.
                </p>
              </div>
              {oauthScopeReady ? (
                <Button
                  disabled={isPending}
                  onClick={() => run(() => connectGitHubAccount())}
                  size="sm"
                >
                  <PendingIcon pending={isPending} />
                  Complete reconnect
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    signIn("github", { callbackUrl: "/admin/github" })
                  }
                  size="sm"
                >
                  Reconnect GitHub
                </Button>
              )}
            </div>
          ) : null}

          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Connected as @{connection.githubLogin}</CardTitle>
                <CardDescription className="mt-2">
                  Last successful sync: {connection.lastSyncedAtLabel}
                </CardDescription>
              </div>
              <Button
                disabled={isPending}
                onClick={() => run(() => syncGitHub())}
              >
                {isPending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : (
                  <RefreshCw aria-hidden="true" className="size-4" />
                )}
                {isPending ? "Syncing…" : "Sync GitHub"}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-muted-foreground">OAuth scopes</p>
                <p className="mt-1 font-medium">
                  {connection.scopes.join(", ") || "Public information only"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Default filters</p>
                <p className="mt-1 font-medium">
                  Forks, archives, templates excluded
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Latest result</p>
                <p className="mt-1 font-medium">
                  {connection.latestRun
                    ? `${connection.latestRun.status.toLowerCase()} · ${connection.latestRun.repositoriesSeen} seen`
                    : "No sync runs"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Rate limit remaining</p>
                <p className="mt-1 font-medium">
                  {connection.latestRun?.rateLimitRemaining ?? "Unknown"}
                </p>
              </div>
            </CardContent>
          </Card>

          <section aria-labelledby="github-owners" className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold" id="github-owners">
                Accounts and organizations
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Organizations are connected sources under @
                {connection.githubLogin}. They do not create separate users,
                portfolio accounts, or GitHub connections.
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {personalOwner ? <OwnerCard owner={personalOwner} /> : null}
              {organizations.map((owner) => (
                <OwnerCard key={owner.id} owner={owner} />
              ))}
            </div>
            {!organizations.length ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {storedScopeReady
                  ? "No organizations were returned by GitHub."
                  : "Organizations cannot be reported as empty until GitHub is reconnected with read:org."}
              </div>
            ) : null}
          </section>

          {process.env.NODE_ENV === "development" ? <TestAccessCard /> : null}

          {connection.latestRun ? (
            <section
              aria-labelledby="github-sync-summary"
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              <h2 className="sr-only" id="github-sync-summary">
                Latest synchronization summary
              </h2>
              {[
                {
                  label: "Personal repositories",
                  value: connection.latestRun.personalRepositoriesFound,
                },
                {
                  label: "Organizations discovered",
                  value: connection.latestRun.organizationsDiscovered,
                },
                {
                  label: "Organization repositories",
                  value: connection.latestRun.organizationRepositoriesFound,
                },
                {
                  label: "Partial failures",
                  value: connection.latestRun.partialFailureCount,
                },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          {connection.latestRun?.errorMessage ? (
            <div
              className={`rounded-lg border p-4 text-sm ${
                connection.latestRun.status === "FAILED"
                  ? "border-destructive/35 bg-destructive-muted text-destructive-foreground"
                  : "border-warning/35 bg-warning-muted text-warning-foreground"
              }`}
              role="alert"
            >
              <p className="font-medium">
                {connection.latestRun.status === "FAILED"
                  ? "GitHub sync failed"
                  : "GitHub sync completed with warnings"}
              </p>
              <p className="mt-1 whitespace-pre-line">
                {connection.latestRun.errorMessage}
              </p>
            </div>
          ) : null}

          <Tabs defaultValue="pending">
            <TabsList aria-label="GitHub repository review filters">
              <TabsTrigger value="pending">
                Pending ({groups.pending.length})
              </TabsTrigger>
              <TabsTrigger value="added">
                Added ({groups.added.length})
              </TabsTrigger>
              <TabsTrigger value="ignored">
                Ignored ({groups.ignored.length})
              </TabsTrigger>
              <TabsTrigger value="changed">
                Changed ({groups.changed.length})
              </TabsTrigger>
              <TabsTrigger value="unavailable">
                Unavailable ({groups.unavailable.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending">
              <RepositoryGrid
                emptyDescription="Run a sync to discover repositories, or everything has already been reviewed."
                emptyTitle="No pending repositories"
                mode="pending"
                repositories={groups.pending}
              />
            </TabsContent>
            <TabsContent value="added">
              <RepositoryGrid
                emptyDescription="Accept a pending repository to create an editable draft project."
                emptyTitle="No GitHub projects added"
                mode="added"
                repositories={groups.added}
              />
            </TabsContent>
            <TabsContent value="ignored">
              <RepositoryGrid
                emptyDescription="Ignored repositories remain here and do not return as new during sync."
                emptyTitle="No ignored repositories"
                mode="ignored"
                repositories={groups.ignored}
              />
            </TabsContent>
            <TabsContent value="changed">
              <RepositoryGrid
                emptyDescription="Manual portfolio fields have no GitHub changes waiting for review."
                emptyTitle="No changes to review"
                mode="changed"
                repositories={groups.changed}
              />
            </TabsContent>
            <TabsContent value="unavailable">
              <RepositoryGrid
                emptyDescription="Accepted sources that disappear, transfer, become private, or are filtered will appear here."
                emptyTitle="No unavailable repositories"
                mode="unavailable"
                repositories={groups.unavailable}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
