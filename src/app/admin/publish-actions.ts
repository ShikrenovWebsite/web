"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/auth";
import { publishPortfolio } from "@/lib/publication";

export async function publishPortfolioChanges() {
  const { admin } = await requireAdminPage("/admin");
  try {
    const publication = await publishPortfolio(admin.id);
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/profile");
    revalidatePath("/admin/experience");
    revalidatePath("/admin/education");
    revalidatePath("/admin/skills");
    revalidatePath("/admin/projects");
    revalidatePath("/admin/cv-import");
    return {
      success: true,
      message: `Portfolio revision ${publication.revision} published.`,
    };
  } catch {
    return {
      success: false,
      message: "The portfolio could not be published. No public snapshot changed.",
    };
  }
}
