import { ExternalLink, GitFork, ImageIcon, Star } from "lucide-react";
import { ContentActions } from "@/components/admin/content-actions";
import { EmptyState } from "@/components/admin/empty-state";
import { ProjectForm } from "@/components/admin/project-form";
import { SectionHeading } from "@/components/admin/section-heading";
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
import { db } from "@/lib/db";
import { statusBadgeClass, statusLabel } from "@/lib/status";

export const metadata = { title: "Projects" };

function dateInput(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "";
}

export default async function ProjectsPage() {
  const { admin } = await requireAdminPage();
  const items = await db.portfolioProject.findMany({
    where: { userId: admin.id },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: {
      githubRepository: { select: { fullName: true } },
      mediaAssets: {
        where: { kind: "PROJECT_COVER" },
        orderBy: { displayOrder: "asc" },
        take: 1,
        select: { originalName: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        action={items.length ? <ProjectForm /> : undefined}
        count={items.length}
        description="Manage presentation content independently from GitHub source data."
        title="Projects"
      />
      {!items.length ? (
        <EmptyState
          action={<ProjectForm />}
          description="Create a manual project or add a repository draft from GitHub synchronization."
          title="No projects yet"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item, index) => {
            const coverImageName = item.mediaAssets[0]?.originalName;
            const formValue = {
              id: item.id,
              title: item.title,
              shortDescription: item.shortDescription ?? "",
              longDescription: item.longDescription ?? "",
              technologiesText: item.technologies.join(", "),
              liveUrl: item.liveUrl ?? "",
              sourceCodeUrl: item.sourceCodeUrl ?? "",
              startDate: dateInput(item.startDate),
              endDate: dateInput(item.endDate),
              featured: item.featured,
              status: item.status,
              sourceType: item.sourceType,
              displayOrder: item.displayOrder,
            };
            return (
              <Card key={item.id}>
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{item.title}</CardTitle>
                        <Badge className={statusBadgeClass(item.status)}>
                          {statusLabel(item.status)}
                        </Badge>
                        {item.featured ? (
                          <Badge>
                            <Star aria-hidden="true" className="mr-1 size-3" />
                            Featured
                          </Badge>
                        ) : null}
                      </div>
                      <CardDescription className="mt-2">
                        {item.shortDescription || "No short description"}
                      </CardDescription>
                    </div>
                    <ContentActions
                      canMoveDown={index < items.length - 1}
                      canMoveUp={index > 0}
                      editTrigger={
                        <ProjectForm
                          compact
                          coverImageName={coverImageName}
                          githubRepositoryName={
                            item.githubRepository?.fullName
                          }
                          value={formValue}
                        />
                      }
                      id={item.id}
                      label={item.title}
                      status={item.status}
                      type="project"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.technologies.length ? (
                    <div className="flex flex-wrap gap-2">
                      {item.technologies.map((technology) => (
                        <Badge key={technology}>{technology}</Badge>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {item.liveUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={item.liveUrl} rel="noreferrer" target="_blank">
                          <ExternalLink aria-hidden="true" className="size-4" />
                          Live site
                        </a>
                      </Button>
                    ) : null}
                    {item.sourceCodeUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={item.sourceCodeUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <GitFork aria-hidden="true" className="size-4" />
                          Source
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-2 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      Source: <span className="font-medium">{item.sourceType}</span>
                    </p>
                    <p>
                      GitHub:{" "}
                      <span className="font-medium">
                        {item.githubRepository?.fullName ?? "not connected"}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <ImageIcon aria-hidden="true" className="size-3.5" />
                      {coverImageName ?? "No cover metadata"}
                    </p>
                    <p>Display position: {index + 1}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
