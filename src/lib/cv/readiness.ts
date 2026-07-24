type DateLike = Date | string | null | undefined;

function missing(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0)
  );
}

export function profileCvIssues(profile: {
  fullName?: string | null;
  professionalTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
}) {
  return [
    ...(missing(profile.fullName) ? ["Name is missing"] : []),
    ...(missing(profile.professionalTitle) ? ["Headline is missing"] : []),
    ...(profile.email || profile.phone || profile.websiteUrl
      ? []
      : ["Contact information is missing"]),
  ];
}

export function experienceCvIssues(experience: {
  company?: string | null;
  role?: string | null;
  startDate?: DateLike;
  endDate?: DateLike;
  isCurrent?: boolean;
}) {
  return [
    ...(missing(experience.company) ? ["Company is missing"] : []),
    ...(missing(experience.role) ? ["Role is missing"] : []),
    ...(missing(experience.startDate) ? ["Start date is missing"] : []),
    ...(!experience.isCurrent && missing(experience.endDate)
      ? ["End date is missing"]
      : []),
  ];
}

export function educationCvIssues(education: {
  institution?: string | null;
  qualification?: string | null;
}) {
  return [
    ...(missing(education.institution) ? ["Institution is missing"] : []),
    ...(missing(education.qualification) ? ["Degree is missing"] : []),
  ];
}

export function projectCvIssues(project: {
  title?: string | null;
  shortDescription?: string | null;
}) {
  return [
    ...(missing(project.title) ? ["Title is missing"] : []),
    ...(missing(project.shortDescription) ? ["Summary is missing"] : []),
  ];
}

export function skillCvIssues(skill: { name?: string | null }) {
  return missing(skill.name) ? ["Name is missing"] : [];
}
