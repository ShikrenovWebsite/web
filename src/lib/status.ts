export type PublicationState = "DRAFT" | "PUBLISHED" | "HIDDEN";

const publicationPresentation: Record<
  PublicationState,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "",
  },
  PUBLISHED: {
    label: "Published",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  HIDDEN: {
    label: "Hidden",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export function statusBadgeClass(status: PublicationState) {
  return publicationPresentation[status].className;
}

export function statusLabel(status: PublicationState) {
  return publicationPresentation[status].label;
}

export type GitHubReviewState = "PENDING" | "ACCEPTED" | "IGNORED" | "REMOVED";

const githubReviewPresentation: Record<
  GitHubReviewState,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  ACCEPTED: {
    label: "Added",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  IGNORED: {
    label: "Ignored",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  REMOVED: {
    label: "Removed",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export function githubReviewBadgeClass(status: GitHubReviewState) {
  return githubReviewPresentation[status].className;
}

export function githubReviewLabel(status: GitHubReviewState) {
  return githubReviewPresentation[status].label;
}

export type GitHubAccessState =
  | "ACCESSIBLE"
  | "REAUTHORIZATION_REQUIRED"
  | "APPROVAL_REQUIRED"
  | "RESTRICTED"
  | "PARTIAL"
  | "UNAVAILABLE";

const githubAccessPresentation: Record<
  GitHubAccessState,
  { label: string; className: string }
> = {
  ACCESSIBLE: {
    label: "Accessible",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  REAUTHORIZATION_REQUIRED: {
    label: "Reconnect required",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  APPROVAL_REQUIRED: {
    label: "Approval required",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  RESTRICTED: {
    label: "Restricted",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  PARTIAL: {
    label: "Partial access",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  UNAVAILABLE: {
    label: "Unavailable",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export function githubAccessBadgeClass(status: GitHubAccessState) {
  return githubAccessPresentation[status].className;
}

export function githubAccessLabel(status: GitHubAccessState) {
  return githubAccessPresentation[status].label;
}

export type GitHubOwnerPreferenceState = "PENDING" | "ENABLED" | "IGNORED";

const githubOwnerPreferencePresentation: Record<
  GitHubOwnerPreferenceState,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  ENABLED: {
    label: "Enabled",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  IGNORED: {
    label: "Ignored",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

export function githubOwnerPreferenceBadgeClass(
  preference: GitHubOwnerPreferenceState,
) {
  return githubOwnerPreferencePresentation[preference].className;
}

export function githubOwnerPreferenceLabel(
  preference: GitHubOwnerPreferenceState,
) {
  return githubOwnerPreferencePresentation[preference].label;
}
