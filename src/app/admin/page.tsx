import {
  FileText,
  FolderKanban,
  GitFork,
  ListChecks,
  Plus,
  RefreshCw,
} from "@/components/ui/icons";
import Link from "next/link";
import { PublicationStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth";
import { formatAdminDate } from "@/lib/date";
import { db } from "@/lib/db";

export const metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  const { admin } = await requireAdminPage();

  const [
    publishedProjects,
    draftProjects,
    pendingRepositories,
    ignoredRepositories,
    latestSync,
    latestCv,
    profile,
  ] = await Promise.all([
    db.portfolioProject.count({
      where: { userId: admin.id, status: PublicationStatus.PUBLISHED },
    }),
    db.portfolioProject.count({
      where: { userId: admin.id, status: PublicationStatus.DRAFT },
    }),
    db.gitHubRepository.count({
      where: {
        connection: { userId: admin.id },
        status: "PENDING",
      },
    }),
    db.gitHubRepository.count({
      where: {
        connection: { userId: admin.id },
        status: "IGNORED",
      },
    }),
    db.gitHubSyncRun.findFirst({
      where: { userId: admin.id },
      orderBy: { startedAt: "desc" },
      select: { completedAt: true, startedAt: true, status: true },
    }),
    db.cvUpload.findFirst({
      where: { userId: admin.id },
      orderBy: { createdAt: "desc" },
      select: { status: true, originalName: true },
    }),
    db.portfolioProfile.findUnique({
      where: { userId: admin.id },
      select: {
        fullName: true,
        professionalTitle: true,
        biography: true,
        email: true,
        location: true,
      },
    }),
  ]);

  const missingProfileFields = [
    profile?.fullName,
    profile?.professionalTitle,
    profile?.biography,
    profile?.email,
    profile?.location,
  ].filter((value) => !value).length;

  const metrics = [
    {
      label: "Published projects",
      value: publishedProjects,
      icon: FolderKanban,
    },
    { label: "Draft projects", value: draftProjects, icon: Plus },
    {
      label: "Waiting for review",
      value: pendingRepositories,
      icon: ListChecks,
    },
    { label: "Ignored repositories", value: ignoredRepositories, icon: GitFork },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <Badge>Portfolio operations</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage canonical portfolio content, GitHub source review, skill
          suggestions, CV imports, and private exports.
        </p>
      </div>

      <section aria-labelledby="portfolio-overview">
        <h2 className="sr-only" id="portfolio-overview">
          Portfolio overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardDescription>{metric.label}</CardDescription>
                  <Icon
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{metric.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import status</CardTitle>
            <CardDescription>
              Source data is always reviewed before it becomes portfolio content.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Latest GitHub sync</span>
              <span className="text-right font-medium">
                {latestSync
                  ? `${latestSync.status.toLowerCase()} · ${formatAdminDate(
                      latestSync.completedAt ?? latestSync.startedAt
                    )}`
                  : "Not connected"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Latest CV import</span>
              <span className="truncate text-right font-medium">
                {latestCv
                  ? `${latestCv.originalName} · ${latestCv.status.toLowerCase()}`
                  : "No CV uploaded"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Incomplete profile fields
              </span>
              <span className="font-medium">{missingProfileFields}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Create content, synchronize GitHub, import an existing CV, or
              build a tailored version.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/admin/projects">
                <Plus aria-hidden="true" className="size-4" />
                Manage projects
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/cv-import">
                <FileText aria-hidden="true" className="size-4" />
                Upload CV
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/github">
                <RefreshCw aria-hidden="true" className="size-4" />
                Sync GitHub
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
