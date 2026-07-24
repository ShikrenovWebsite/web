import { config } from "dotenv";
import { randomUUID } from "node:crypto";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Publication verification is disabled in production.");
  }
  const [{ db }, publication, publicPortfolio] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/publication"),
    import("../src/lib/public-portfolio"),
  ]);
  const admin = await db.user.findFirst({
    where: { isAdmin: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!admin) throw new Error("Admin user not found.");
  const before = await db.portfolioPublication.findUnique({
    where: { userId: admin.id },
    select: { revision: true, publishedAt: true },
  });
  let simulated:
    | {
        profile: boolean;
        experiences: number;
        education: number;
        skills: number;
        projects: number;
        acceptedCvItemsPromoted: number;
        fixtureAcceptedSectionsIncluded: Record<string, boolean>;
      }
    | undefined;
  try {
    await db.$transaction(async (transaction) => {
      const fixtureRun = await transaction.cvImportRun.findFirst({
        where: { userId: admin.id },
        select: { id: true },
      });
      const [profile, experience, education, skill, project] = await Promise.all([
        transaction.portfolioProfile.findUnique({
          where: { userId: admin.id },
          select: { id: true },
        }),
        transaction.experience.findFirst({
          where: { userId: admin.id },
          select: { id: true },
        }),
        transaction.education.findFirst({
          where: { userId: admin.id },
          select: { id: true },
        }),
        transaction.skill.findFirst({
          where: { userId: admin.id },
          select: { id: true },
        }),
        transaction.portfolioProject.findFirst({
          where: { userId: admin.id },
          select: { id: true },
        }),
      ]);
      const fixtureRecords = [
        ["PROFILE", profile?.id],
        ["EXPERIENCE", experience?.id],
        ["EDUCATION", education?.id],
        ["SKILL", skill?.id],
        ["PROJECT", project?.id],
      ].filter((item): item is [string, string] => Boolean(item[1]));
      if (fixtureRun && fixtureRecords.length === 5) {
        await Promise.all([
          transaction.portfolioProfile.update({
            where: { id: profile!.id },
            data: { status: "DRAFT" },
          }),
          transaction.experience.update({
            where: { id: experience!.id },
            data: { status: "DRAFT" },
          }),
          transaction.education.update({
            where: { id: education!.id },
            data: { status: "DRAFT" },
          }),
          transaction.skill.update({
            where: { id: skill!.id },
            data: { status: "DRAFT" },
          }),
          transaction.portfolioProject.update({
            where: { id: project!.id },
            data: { status: "DRAFT" },
          }),
        ]);
        await transaction.cvImportItem.createMany({
          data: fixtureRecords.map(([itemType, recordId], displayOrder) => ({
            id: `verify_${randomUUID()}`,
            importRunId: fixtureRun.id,
            itemType: itemType as
              | "PROFILE"
              | "EXPERIENCE"
              | "EDUCATION"
              | "SKILL"
              | "PROJECT",
            status: "ACCEPTED",
            resolution: "MERGE",
            importedData: {},
            existingRecordId: recordId,
            createdRecordId: recordId,
            appliedAt: new Date(),
            displayOrder,
          })),
        });
      }
      const acceptedCvItemsPromoted = await transaction.cvImportItem.count({
        where: {
          status: "ACCEPTED",
          appliedAt: { not: null },
          createdRecordId: { not: null },
          publishedAt: null,
          importRun: { userId: admin.id },
        },
      });
      await publication.approveAppliedCvRecords(transaction, admin.id);
      const data = await publication.buildPortfolioPublicationData(
        transaction,
        admin.id,
      );
      simulated = {
        profile: Boolean(data.profile),
        experiences: data.experiences.length,
        education: data.education.length,
        skills: data.skills.length,
        projects: data.projects.length,
        acceptedCvItemsPromoted,
        fixtureAcceptedSectionsIncluded: {
          PROFILE: data.profile?.id === profile?.id,
          EXPERIENCE: data.experiences.some(
            (item) => item.id === experience?.id,
          ),
          EDUCATION: data.education.some((item) => item.id === education?.id),
          SKILL: data.skills.some((item) => item.id === skill?.id),
          PROJECT: data.projects.some((item) => item.id === project?.id),
        },
      };
      throw new Error("ROLLBACK_PUBLICATION_VERIFICATION");
    });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "ROLLBACK_PUBLICATION_VERIFICATION"
    ) {
      throw error;
    }
  }
  const after = await db.portfolioPublication.findUnique({
    where: { userId: admin.id },
    select: { revision: true, publishedAt: true },
  });
  const currentPublic = await publicPortfolio.getPublicPortfolio();
  console.log(
    JSON.stringify({
      simulated,
      currentPublic: currentPublic
        ? {
            profile: Boolean(currentPublic.profile),
            experiences: currentPublic.experiences.length,
            education: currentPublic.education.length,
            skills: currentPublic.skills.length,
            projects: currentPublic.projects.length,
          }
        : null,
      snapshotRevision: after?.revision ?? null,
      publicSnapshotUnchanged: JSON.stringify(before) === JSON.stringify(after),
      transactionRolledBack: true,
    }),
  );
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
