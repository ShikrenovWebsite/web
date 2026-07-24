import { CvBuilder } from "@/components/admin/cv-builder";
import { SectionHeading } from "@/components/admin/section-heading";
import { requireAdminPage } from "@/lib/auth";
import { canonicalUpdatedAtForUser } from "@/lib/cv/document";
import { formatAdminDateTime } from "@/lib/date";
import { db } from "@/lib/db";

export const metadata = { title: "CV builder" };
export const dynamic = "force-dynamic";

export default async function CvBuilderPage() {
  const { admin } = await requireAdminPage("/admin/cv");
  const [
    versions,
    experience,
    projects,
    education,
    skills,
    certifications,
    languages,
    canonicalUpdatedAt,
  ] = await Promise.all([
    db.cvVersion.findMany({
      where: { userId: admin.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { snapshots: true } } },
    }),
    db.experience.findMany({
      where: { userId: admin.id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.portfolioProject.findMany({
      where: { userId: admin.id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.education.findMany({
      where: { userId: admin.id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.skill.findMany({
      where: { userId: admin.id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.certification.findMany({
      where: { userId: admin.id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.language.findMany({
      where: { userId: admin.id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    canonicalUpdatedAtForUser(admin.id),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Create reference-based CV versions, preview them, and export private ATS-friendly PDFs."
        title="CV versions"
      />
      <CvBuilder
        options={{
          experience: experience.map((item) => ({
            id: item.id,
            label: `${item.role} — ${item.company}`,
          })),
          projects: projects.map((item) => ({ id: item.id, label: item.title })),
          education: education.map((item) => ({
            id: item.id,
            label: item.institution,
          })),
          skills: skills.map((item) => ({ id: item.id, label: item.name })),
          certifications: certifications.map((item) => ({
            id: item.id,
            label: item.name,
          })),
          languages: languages.map((item) => ({
            id: item.id,
            label: item.name,
          })),
        }}
        versions={versions.map((version) => ({
          id: version.id,
          name: version.name,
          customHeadline: version.customHeadline ?? "",
          customSummary: version.customSummary ?? "",
          selectedExperienceIds: version.selectedExperienceIds,
          selectedProjectIds: version.selectedProjectIds,
          selectedEducationIds: version.selectedEducationIds,
          selectedSkillIds: version.selectedSkillIds,
          selectedCertificationIds: version.selectedCertificationIds,
          selectedLanguageIds: version.selectedLanguageIds,
          sectionOrder: version.sectionOrder,
          overridesJson: JSON.stringify(version.overrides ?? {}, null, 2),
          updatedAtLabel: formatAdminDateTime(version.updatedAt),
          lastExportedAtLabel: formatAdminDateTime(
            version.lastExportedAt,
            "Never",
          ),
          exportCount: version._count.snapshots,
          newerDataAvailable:
            Boolean(version.sourceUpdatedAt) &&
            canonicalUpdatedAt > version.sourceUpdatedAt!,
        }))}
      />
    </div>
  );
}
