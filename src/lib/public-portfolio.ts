import { PublicationStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export async function getPublicPortfolio() {
  const owner = await db.user.findFirst({
    where: { isAdmin: true },
    orderBy: { createdAt: "asc" },
    select: {
      profile: {
        where: { status: PublicationStatus.PUBLISHED },
      },
      experiences: {
        where: { status: PublicationStatus.PUBLISHED },
        orderBy: [{ displayOrder: "asc" }, { startDate: "desc" }],
      },
      education: {
        where: { status: PublicationStatus.PUBLISHED },
        orderBy: [{ displayOrder: "asc" }, { startDate: "desc" }],
      },
      skills: {
        where: { status: PublicationStatus.PUBLISHED },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      },
      projects: {
        where: { status: PublicationStatus.PUBLISHED },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      },
      siteSettings: true,
    },
  });

  return owner;
}
