import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sections = {
  profile: {
    title: "Profile",
    description: "Personal information and public biography management.",
    phase: "Phase 2",
  },
  "cv-import": {
    title: "CV import",
    description: "Private upload, extraction, conflict review, and selective import.",
    phase: "Phase 4",
  },
  github: {
    title: "GitHub",
    description: "Connection, repository sync, and review queues.",
    phase: "Phase 3",
  },
  projects: {
    title: "Projects",
    description: "Manual and imported project presentation management.",
    phase: "Phase 2",
  },
  experience: {
    title: "Experience",
    description: "Employment history, publication, and ordering.",
    phase: "Phase 2",
  },
  education: {
    title: "Education",
    description: "Education records, publication, and ordering.",
    phase: "Phase 2",
  },
  skills: {
    title: "Skills",
    description: "Skill categories, proficiency, publication, and ordering.",
    phase: "Phase 2",
  },
  contact: {
    title: "Contact",
    description: "Public contact details and contact form configuration.",
    phase: "Phase 2",
  },
  settings: {
    title: "Website settings",
    description: "Site identity, CV download controls, and publishing preferences.",
    phase: "Phase 2",
  },
} as const;

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = sections[section as keyof typeof sections];

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          <Badge>{item.phase}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Foundation ready</CardTitle>
          <CardDescription>
            This workflow is intentionally not implemented during Phase 1. Its route
            is protected and the supporting data model is in place.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
