import { CvBuilder } from "@/components/admin/cv-builder";
import { SectionHeading } from "@/components/admin/section-heading";
import { requireAdminPage } from "@/lib/auth";
import { canonicalUpdatedAtForUser } from "@/lib/cv/document";
import { formatAdminDateTime } from "@/lib/date";
import { db } from "@/lib/db";
import {
  educationCvIssues,
  experienceCvIssues,
  profileCvIssues,
  projectCvIssues,
  skillCvIssues,
} from "@/lib/cv/readiness";

export const metadata = { title: "CV builder" };
export const dynamic = "force-dynamic";

export default async function CvBuilderPage() {
  const { admin } = await requireAdminPage("/admin/cv");
  const [
    versions,
    profile,
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
      include: {
        _count: { select: { snapshots: true } },
        snapshots: {
          orderBy: { exportedAt: "desc" },
          take: 10,
        },
      },
    }),
    db.portfolioProfile.findFirst({
      where: { userId: admin.id, status: "PUBLISHED" },
    }),
    db.experience.findMany({
      where: { userId: admin.id, status: "PUBLISHED" },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.portfolioProject.findMany({
      where: { userId: admin.id, status: "PUBLISHED" },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.education.findMany({
      where: { userId: admin.id, status: "PUBLISHED" },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.skill.findMany({
      where: { userId: admin.id, status: "PUBLISHED" },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.certification.findMany({
      where: { userId: admin.id, status: "PUBLISHED" },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.language.findMany({
      where: { userId: admin.id, status: "PUBLISHED" },
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
        profile={{
          fullName: profile?.fullName ?? "",
          headline: profile?.professionalTitle ?? "",
          summary: profile?.biography ?? "",
          email: profile?.email ?? "",
          phone: profile?.phone ?? "",
          location: profile?.location ?? "",
          website: profile?.websiteUrl ?? "",
          hasLinks:
            typeof profile?.socialLinks === "object" &&
            profile.socialLinks !== null &&
            !Array.isArray(profile.socialLinks) &&
            Object.values(profile.socialLinks).some(
              (value) => typeof value === "string" && value.length > 0,
            ),
          issues: profileCvIssues(profile ?? {}),
        }}
        options={{
          experience: experience.map((item) => ({
            id: item.id,
            label: `${item.role} — ${item.company}`,
            issues: experienceCvIssues(item),
          })),
          projects: projects.map((item) => ({
            id: item.id,
            label: item.title,
            issues: projectCvIssues(item),
          })),
          education: education.map((item) => ({
            id: item.id,
            label: item.institution,
            issues: educationCvIssues(item),
          })),
          skills: skills.map((item) => ({
            id: item.id,
            label: item.name,
            issues: skillCvIssues(item),
          })),
          certifications: certifications.map((item) => ({
            id: item.id,
            label: item.name,
            issues: item.name.trim() ? [] : ["Name is missing"],
          })),
          languages: languages.map((item) => ({
            id: item.id,
            label: item.name,
            issues: item.name.trim() ? [] : ["Name is missing"],
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
          contactFields:
            typeof version.visibilitySettings === "object" &&
            version.visibilitySettings &&
            !Array.isArray(version.visibilitySettings) &&
            "contactFields" in version.visibilitySettings &&
            Array.isArray(version.visibilitySettings.contactFields)
              ? version.visibilitySettings.contactFields.filter(
                  (field): field is string => typeof field === "string",
                )
              : ["email", "phone", "location", "website", "links"],
          overridesJson: JSON.stringify(version.overrides ?? {}, null, 2),
          updatedAtLabel: formatAdminDateTime(version.updatedAt),
          lastExportedAtLabel: formatAdminDateTime(
            version.lastExportedAt,
            "Never",
          ),
          exportCount: version._count.snapshots,
          newerDataAvailable:
            !version.sourceUpdatedAt ||
            canonicalUpdatedAt > version.sourceUpdatedAt,
          snapshots: version.snapshots.map((snapshot) => ({
            id: snapshot.id,
            filename: snapshot.filename,
            exportedAtLabel: formatAdminDateTime(snapshot.exportedAt),
            pageCount: snapshot.pageCount,
            checksumLabel: snapshot.checksum.slice(0, 12),
            sizeBytes: snapshot.sizeBytes,
            newerDataAvailable:
              canonicalUpdatedAt > snapshot.canonicalUpdatedAt,
          })),
          layoutMode:
            typeof version.visibilitySettings === "object" &&
            version.visibilitySettings &&
            !Array.isArray(version.visibilitySettings) &&
            "layoutMode" in version.visibilitySettings &&
            version.visibilitySettings.layoutMode === "STANDARD_TWO_PAGE"
              ? "STANDARD_TWO_PAGE"
              : "COMPACT_ONE_PAGE",
        }))}
      />
    </div>
  );
}
