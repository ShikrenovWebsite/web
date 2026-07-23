import "server-only";

import { z } from "zod";

const API_ROOT = "https://api.github.com";
const API_VERSION = "2022-11-28";

const githubUserSchema = z.object({
  id: z.number().int(),
  login: z.string().min(1),
  avatar_url: z.string().url().nullable().optional(),
});

const githubRepositorySchema = z.object({
  id: z.number().int(),
  node_id: z.string().nullable().optional(),
  name: z.string().min(1),
  full_name: z.string().min(1),
  private: z.boolean(),
  owner: z.object({
    id: z.number().int(),
    login: z.string().min(1),
    type: z.enum(["User", "Organization"]),
    avatar_url: z.string().url().nullable().optional(),
  }),
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  homepage: z.string().nullable().optional(),
  language: z.string().nullable(),
  topics: z.array(z.string()).default([]),
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  visibility: z.string(),
  archived: z.boolean(),
  is_template: z.boolean().optional().default(false),
  default_branch: z.string().nullable().optional(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
  pushed_at: z.string().datetime().nullable(),
});

const githubOrganizationSchema = z.object({
  id: z.number().int(),
  login: z.string().min(1),
  avatar_url: z.string().url().nullable().optional(),
});

const githubOrganizationMembershipSchema = z.object({
  state: z.string(),
  role: z.string(),
  organization: githubOrganizationSchema,
});

export type GitHubRepositorySource = z.infer<typeof githubRepositorySchema>;
export type GitHubOrganizationSource = z.infer<
  typeof githubOrganizationSchema
>;

export type GitHubListDiagnostics = {
  endpoint: string;
  status: number;
  pageCount: number;
  rawCount: number;
  grantedScopes: string[];
  rateLimitRemaining: number | null;
  rateLimitResetAt: string | null;
};

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rateLimitRemaining: number | null,
    readonly rateLimitResetAt: Date | null,
    readonly ssoHeader: string | null = null,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

type RateLimitState = {
  remaining: number | null;
  resetAt: Date | null;
};

function numberHeader(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function scopesHeader(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function createGitHubClient(token: string) {
  const rateLimit: RateLimitState = {
    remaining: null,
    resetAt: null,
  };

  async function request(path: string, accept = "application/vnd.github+json") {
    const response = await fetch(`${API_ROOT}${path}`, {
      headers: {
        Accept: accept,
        Authorization: `Bearer ${token}`,
        "User-Agent": "portfolio-admin-github-sync",
        "X-GitHub-Api-Version": API_VERSION,
      },
      cache: "no-store",
    });

    rateLimit.remaining = numberHeader(response.headers.get("x-ratelimit-remaining"));
    const reset = numberHeader(response.headers.get("x-ratelimit-reset"));
    rateLimit.resetAt = reset ? new Date(reset * 1000) : null;

    if (!response.ok) {
      let apiMessage = "";
      try {
        const body = (await response.json()) as { message?: unknown };
        apiMessage = typeof body.message === "string" ? body.message : "";
      } catch {
        // GitHub may return an empty or non-JSON response.
      }

      const rateLimited =
        response.status === 403 && rateLimit.remaining === 0;
      throw new GitHubApiError(
        rateLimited
          ? "GitHub API rate limit reached. Try again after the reset time."
          : apiMessage || `GitHub API request failed with status ${response.status}.`,
        response.status,
        rateLimit.remaining,
        rateLimit.resetAt,
        response.headers.get("x-github-sso"),
      );
    }

    return response;
  }

  return {
    rateLimit,

    async getAuthenticatedUser() {
      const response = await request("/user");
      return githubUserSchema.parse(await response.json());
    },

    async listAccessiblePublicRepositories() {
      return (
        await paginate(
          "/user/repos?visibility=public&affiliation=owner,organization_member,collaborator&sort=updated&direction=desc&per_page=100",
          githubRepositorySchema,
          request,
        )
      ).items;
    },

    async listAccessiblePublicRepositoriesWithDiagnostics() {
      return paginate(
        "/user/repos?visibility=public&affiliation=owner,organization_member,collaborator&sort=updated&direction=desc&per_page=100",
        githubRepositorySchema,
        request,
      );
    },

    async listOrganizations() {
      return (
        await paginate(
          "/user/orgs?per_page=100",
          githubOrganizationSchema,
          request,
        )
      ).items;
    },

    async listOrganizationsWithDiagnostics() {
      return paginate(
        "/user/orgs?per_page=100",
        githubOrganizationSchema,
        request,
      );
    },

    async getOrganizationWithDiagnostics(organizationLogin: string) {
      const endpoint = `/orgs/${encodeURIComponent(organizationLogin)}`;
      const response = await request(endpoint);
      return {
        organization: githubOrganizationSchema.parse(await response.json()),
        diagnostics: diagnosticsFromResponse(endpoint, response, 1, 1),
      };
    },

    async getOrganizationMembershipWithDiagnostics(
      organizationLogin: string,
    ) {
      const endpoint = `/user/memberships/orgs/${encodeURIComponent(organizationLogin)}`;
      const response = await request(endpoint);
      return {
        membership: githubOrganizationMembershipSchema.parse(
          await response.json(),
        ),
        diagnostics: diagnosticsFromResponse(endpoint, response, 1, 1),
      };
    },

    async listOrganizationPublicRepositories(organizationLogin: string) {
      return (
        await paginate(
          `/orgs/${encodeURIComponent(organizationLogin)}/repos?type=all&per_page=100`,
          githubRepositorySchema,
          request,
        )
      ).items;
    },

    async listOrganizationRepositoriesWithDiagnostics(
      organizationLogin: string,
    ) {
      return paginate(
        `/orgs/${encodeURIComponent(organizationLogin)}/repos?type=all&sort=updated&direction=desc&per_page=100`,
        githubRepositorySchema,
        request,
      );
    },

    async getRepositoryWithDiagnostics(owner: string, repository: string) {
      const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
      const response = await request(endpoint);
      return {
        repository: githubRepositorySchema.parse(await response.json()),
        diagnostics: diagnosticsFromResponse(endpoint, response, 1, 1),
      };
    },

    async getReadmePreview(owner: string, repository: string) {
      try {
        const response = await request(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/readme`,
          "application/vnd.github.raw+json",
        );
        const text = await response.text();
        return {
          preview: text.slice(0, 5000),
          warning: null,
        };
      } catch (error) {
        if (error instanceof GitHubApiError && error.status === 404) {
          return { preview: null, warning: null };
        }

        return {
          preview: null,
          warning:
            error instanceof Error
              ? `README unavailable for ${owner}/${repository}: ${error.message}`
              : `README unavailable for ${owner}/${repository}.`,
        };
      }
    },
  };
}

async function paginate<T>(
  path: string,
  schema: z.ZodType<T>,
  request: (
    path: string,
    accept?: string,
  ) => Promise<Response>,
) {
  const items: T[] = [];
  let lastResponse: Response | null = null;
  let pageCount = 0;

  for (let page = 1; ; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await request(`${path}${separator}page=${page}`);
    lastResponse = response;
    pageCount += 1;
    const pageItems = z.array(schema).parse(await response.json());
    items.push(...pageItems);
    if (pageItems.length < 100) break;
  }

  if (!lastResponse) {
    throw new Error("GitHub pagination completed without a response.");
  }

  return {
    items,
    diagnostics: diagnosticsFromResponse(
      path,
      lastResponse,
      pageCount,
      items.length,
    ),
  };
}

function diagnosticsFromResponse(
  endpoint: string,
  response: Response,
  pageCount: number,
  rawCount: number,
): GitHubListDiagnostics {
  const reset = numberHeader(response.headers.get("x-ratelimit-reset"));
  return {
    endpoint,
    status: response.status,
    pageCount,
    rawCount,
    grantedScopes: scopesHeader(response.headers.get("x-oauth-scopes")),
    rateLimitRemaining: numberHeader(
      response.headers.get("x-ratelimit-remaining"),
    ),
    rateLimitResetAt: reset ? new Date(reset * 1000).toISOString() : null,
  };
}
