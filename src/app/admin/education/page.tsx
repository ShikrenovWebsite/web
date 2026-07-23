import { CalendarDays, MapPin } from "lucide-react";
import { ContentActions } from "@/components/admin/content-actions";
import { EducationForm } from "@/components/admin/education-form";
import { EmptyState } from "@/components/admin/empty-state";
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

export const metadata = { title: "Education" };

function dateInput(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "";
}

export default async function EducationPage() {
  const { admin } = await requireAdminPage();
  const items = await db.education.findMany({
    where: { userId: admin.id },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        action={items.length ? <EducationForm /> : undefined}
        count={items.length}
        description="Manage education records and their public display order."
        title="Education"
      />
      {!items.length ? (
        <EmptyState
          action={<EducationForm />}
          description="Add qualifications without publishing them immediately."
          title="No education records"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item, index) => {
            const formValue = {
              id: item.id,
              institution: item.institution,
              qualification: item.qualification ?? "",
              fieldOfStudy: item.fieldOfStudy ?? "",
              location: item.location ?? "",
              description: item.description ?? "",
              startDate: dateInput(item.startDate),
              endDate: dateInput(item.endDate),
              status: item.status,
              displayOrder: item.displayOrder,
            };
            return (
              <Card key={item.id}>
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{item.institution}</CardTitle>
                        <Badge className={statusBadgeClass(item.status)}>
                          {statusLabel(item.status)}
                        </Badge>
                      </div>
                      <CardDescription className="mt-2">
                        {[item.qualification, item.fieldOfStudy]
                          .filter(Boolean)
                          .join(" · ") || "No qualification details"}
                      </CardDescription>
                    </div>
                    <ContentActions
                      canMoveDown={index < items.length - 1}
                      canMoveUp={index > 0}
                      editTrigger={<EducationForm compact value={formValue} />}
                      id={item.id}
                      label={item.institution}
                      status={item.status}
                      type="education"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="size-4" />
                    {dateInput(item.startDate) || "Unknown"} –{" "}
                    {dateInput(item.endDate) || "Unknown"}
                  </p>
                  {item.location ? (
                    <p className="flex items-center gap-2">
                      <MapPin aria-hidden="true" className="size-4" />
                      {item.location}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className="whitespace-pre-line leading-6">{item.description}</p>
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
