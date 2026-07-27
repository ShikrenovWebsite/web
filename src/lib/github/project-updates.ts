export const githubProjectFields = [
  "title",
  "shortDescription",
  "longDescription",
  "technologies",
  "liveUrl",
  "sourceCodeUrl",
  "coverImageUrl",
] as const;

export type GitHubProjectField = (typeof githubProjectFields)[number];

type RepositoryProjectSource = {
  name: string;
  description: string | null;
  githubUrl: string;
  homepageUrl: string | null;
  primaryLanguage: string | null;
  topics: string[];
  readmePreview: string | null;
  detectedTechnologies: string[];
  suggestedTitle: string | null;
  suggestedShortDescription: string | null;
  suggestedLongDescription: string | null;
  suggestedCoverImageUrl: string | null;
};

type PortfolioProjectValues = {
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  technologies: string[];
  liveUrl: string | null;
  sourceCodeUrl: string | null;
  coverImageUrl: string | null;
};

export function githubProjectValues(
  repository: RepositoryProjectSource,
): PortfolioProjectValues {
  const technologies = repository.detectedTechnologies.length
    ? repository.detectedTechnologies
    : [repository.primaryLanguage, ...repository.topics].filter(
        (value): value is string => Boolean(value),
      );

  return {
    title: repository.suggestedTitle ?? repository.name,
    shortDescription:
      repository.suggestedShortDescription ?? repository.description,
    longDescription:
      repository.suggestedLongDescription ??
      repository.readmePreview ??
      repository.description,
    technologies: [...new Set(technologies)],
    liveUrl: repository.homepageUrl,
    sourceCodeUrl: repository.githubUrl,
    coverImageUrl: repository.suggestedCoverImageUrl,
  };
}

export function githubProjectDifferenceFields(
  project: PortfolioProjectValues,
  repository: RepositoryProjectSource,
) {
  const incoming = githubProjectValues(repository);
  return githubProjectFields.filter(
    (field) =>
      JSON.stringify(project[field]) !== JSON.stringify(incoming[field]),
  );
}

export function shouldRefreshSourceDerivedHomepage(input: {
  projectLiveUrl: string | null;
  previousHomepageUrl: string | null | undefined;
  incomingHomepageUrl: string | null;
}) {
  return (
    input.previousHomepageUrl !== undefined &&
    input.previousHomepageUrl !== input.incomingHomepageUrl &&
    input.projectLiveUrl === input.previousHomepageUrl
  );
}
