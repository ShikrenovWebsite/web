import { AtSign, Globe2, MapPin, Phone } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { ContentActions } from "@/components/admin/content-actions";
import { EmptyState } from "@/components/admin/empty-state";
import { ProfileForm } from "@/components/admin/profile-form";
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
import { readLinkedInUrl } from "@/lib/public-social-links";

export const metadata = { title: "Profile" };

const emptyProfile = {
  fullName: "",
  professionalTitle: "",
  biography: "",
  email: "",
  phone: "",
  location: "",
  websiteUrl: "",
  linkedinUrl: "",
  status: "DRAFT" as const,
  displayOrder: 0,
};

export default async function ProfilePage() {
  const { admin } = await requireAdminPage();
  const profile = await db.portfolioProfile.findUnique({
    where: { userId: admin.id },
  });

  if (!profile) {
    return (
      <div className="space-y-6">
        <SectionHeading
          description="Create the identity and biography used across the public portfolio."
          title="Profile"
        />
        <EmptyState
          action={<ProfileForm value={emptyProfile} />}
          description="Nothing is published until you explicitly choose Published."
          title="No profile yet"
        />
      </div>
    );
  }

  const formValue = {
    fullName: profile.fullName ?? "",
    professionalTitle: profile.professionalTitle ?? "",
    biography: profile.biography ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    websiteUrl: profile.websiteUrl ?? "",
    linkedinUrl: readLinkedInUrl(profile.socialLinks) ?? "",
    status: profile.status,
    displayOrder: profile.displayOrder,
  };
  const linkedinUrl = readLinkedInUrl(profile.socialLinks);

  return (
    <div className="space-y-6">
      <SectionHeading
        description="Manage your public identity, biography, contact details, and visibility."
        title="Profile"
      />
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{profile.fullName || "Unnamed profile"}</CardTitle>
              <Badge className={statusBadgeClass(profile.status)}>
                {statusLabel(profile.status)}
              </Badge>
              <Badge>{profile.sourceType.toLowerCase()}</Badge>
            </div>
            <CardDescription className="mt-2">
              {profile.professionalTitle || "No professional title"}
            </CardDescription>
          </div>
          <ContentActions
            editTrigger={<ProfileForm compact value={formValue} />}
            id={profile.id}
            label="profile"
            status={profile.status}
            type="profile"
          />
        </CardHeader>
        <CardContent className="space-y-5">
          {profile.biography ? (
            <p className="max-w-3xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {profile.biography}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No biography supplied.</p>
          )}
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {profile.email ? (
              <div className="flex items-center gap-2">
                <AtSign aria-hidden="true" className="size-4 text-muted-foreground" />
                <span>{profile.email}</span>
              </div>
            ) : null}
            {profile.phone ? (
              <div className="flex items-center gap-2">
                <Phone aria-hidden="true" className="size-4 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            ) : null}
            {profile.location ? (
              <div className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 text-muted-foreground" />
                <span>{profile.location}</span>
              </div>
            ) : null}
            {profile.websiteUrl ? (
              <div className="flex items-center gap-2">
                <Globe2 aria-hidden="true" className="size-4 text-muted-foreground" />
                <span className="truncate">{profile.websiteUrl}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <FaLinkedin
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              {linkedinUrl ? (
                <a
                  className="truncate underline-offset-4 hover:underline"
                  href={linkedinUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {linkedinUrl}
                </a>
              ) : (
                <span className="text-muted-foreground">
                  LinkedIn not configured
                </span>
              )}
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
