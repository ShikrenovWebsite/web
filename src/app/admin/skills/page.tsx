import { ContentActions } from "@/components/admin/content-actions";
import { EmptyState } from "@/components/admin/empty-state";
import { SectionHeading } from "@/components/admin/section-heading";
import { SkillForm } from "@/components/admin/skill-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { statusBadgeClass, statusLabel } from "@/lib/status";

export const metadata = { title: "Skills" };

export default async function SkillsPage() {
  const { admin } = await requireAdminPage();
  const items = await db.skill.findMany({
    where: { userId: admin.id },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        action={items.length ? <SkillForm /> : undefined}
        count={items.length}
        description="Organize skills by category, proficiency, visibility, and order."
        title="Skills"
      />
      {!items.length ? (
        <EmptyState
          action={<SkillForm />}
          description="Create your first skill as a draft or publish it immediately."
          title="No skills yet"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => {
            const formValue = {
              id: item.id,
              name: item.name,
              category: item.category ?? "",
              proficiency: item.proficiency ?? "",
              status: item.status,
              displayOrder: item.displayOrder,
            };
            return (
              <Card key={item.id}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      <Badge className={statusBadgeClass(item.status)}>
                        {statusLabel(item.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[item.category, item.proficiency]
                        .filter(Boolean)
                        .join(" · ") || "Uncategorized"}
                    </p>
                  </div>
                  <ContentActions
                    canMoveDown={index < items.length - 1}
                    canMoveUp={index > 0}
                    editTrigger={<SkillForm compact value={formValue} />}
                    id={item.id}
                    label={item.name}
                    status={item.status}
                    type="skill"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
