import { CalendarDays, MapPin } from "lucide-react";
import { ContentActions } from "@/components/admin/content-actions";
import { EmptyState } from "@/components/admin/empty-state";
import { ExperienceForm } from "@/components/admin/experience-form";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
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

export const metadata = { title: "Experience" };

function dateInput(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "";
}

export default async function ExperiencePage() {
  const { admin } = await requireAdminPage();
  const items = await db.experience.findMany({
    where: { userId: admin.id },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        action={items.length ? <ExperienceForm /> : undefined}
        count={items.length}
        description="Create, publish, hide, and order your professional history."
        title="Experience"
      />
      {!items.length ? (
        <EmptyState
          action={<ExperienceForm />}
          description="Add a role as a draft, review it, then publish when ready."
          title="No experience records"
        />
      ) : (
        <div className="grid gap-4">
          {items.map((item, index) => {
            const formValue = {
              id: item.id,
              company: item.company,
              role: item.role,
              location: item.location ?? "",
              description: item.description ?? "",
              highlightsText: item.highlights.join("\n"),
              startDate: dateInput(item.startDate),
              endDate: dateInput(item.endDate),
              isCurrent: item.isCurrent,
              status: item.status,
              displayOrder: item.displayOrder,
            };

            return (
              <Card key={item.id}>
                <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{item.role}</CardTitle>
                      <Badge className={statusBadgeClass(item.status)}>
                        {statusLabel(item.status)}
                      </Badge>
                      <Badge>#{index + 1}</Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {item.company}
                    </CardDescription>
                  </div>
                  <ContentActions
                    canMoveDown={index < items.length - 1}
                    canMoveUp={index > 0}
                    editTrigger={<ExperienceForm compact value={formValue} />}
                    id={item.id}
                    label={item.role}
                    status={item.status}
                    type="experience"
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <CalendarDays aria-hidden="true" className="size-4" />
                      {dateInput(item.startDate) || "No start date"} –{" "}
                      {item.isCurrent
                        ? "Present"
                        : dateInput(item.endDate) || "No end date"}
                    </span>
                    {item.location ? (
                      <span className="flex items-center gap-2">
                        <MapPin aria-hidden="true" className="size-4" />
                        {item.location}
                      </span>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  {item.highlights.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {item.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
