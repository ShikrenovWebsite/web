import { db } from "@/lib/db";
import {
  buildPortfolioPublicationData,
  type PortfolioPublicationData,
} from "@/lib/publication";

function hydrateDates(data: PortfolioPublicationData) {
  return {
    ...data,
    experiences: data.experiences.map((item) => ({
      ...item,
      startDate: item.startDate ? new Date(item.startDate) : null,
      endDate: item.endDate ? new Date(item.endDate) : null,
    })),
    education: data.education.map((item) => ({
      ...item,
      startDate: item.startDate ? new Date(item.startDate) : null,
      endDate: item.endDate ? new Date(item.endDate) : null,
    })),
    projects: data.projects.map((item) => ({
      ...item,
      startDate: item.startDate ? new Date(item.startDate) : null,
      endDate: item.endDate ? new Date(item.endDate) : null,
    })),
  };
}

export async function getPublicPortfolio() {
  const owner = await db.user.findFirst({
    where: { isAdmin: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      publication: { select: { data: true } },
    },
  });
  if (!owner) return null;

  // Existing installations retain their currently published content until the
  // first explicit snapshot publication.
  const data = owner.publication?.data
    ? (owner.publication.data as unknown as PortfolioPublicationData)
    : await buildPortfolioPublicationData(db, owner.id);
  return hydrateDates(data);
}
