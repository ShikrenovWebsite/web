import {
  addRepositoryToPortfolio,
  applyGitHubProjectField,
  connectGitHubAccount,
  finishRepositoryChangeReview,
  handleUnavailableRepository,
  setOrganizationSyncPreference,
  setRepositoryReviewStatus,
  syncGitHub,
  testGitHubOrganizationAccess,
} from "@/app/admin/github/actions";
import { requireAdminApi } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.authorized) return authorization.response;

  const { action } = await context.params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Connect and sync do not require a body.
  }

  const result =
    action === "connect"
      ? await connectGitHubAccount()
      : action === "sync"
        ? await syncGitHub()
        : action === "add"
          ? await addRepositoryToPortfolio(body)
          : action === "ignore"
            ? await setRepositoryReviewStatus({
                ...(typeof body === "object" && body ? body : {}),
                status: "IGNORED",
              })
            : action === "reconsider"
              ? await setRepositoryReviewStatus({
                  ...(typeof body === "object" && body ? body : {}),
                  status: "PENDING",
                })
              : action === "organization"
                ? await setOrganizationSyncPreference(body)
              : action === "test-access"
                ? await testGitHubOrganizationAccess(body)
              : action === "apply"
                ? await applyGitHubProjectField(body)
                : action === "finish"
                  ? await finishRepositoryChangeReview(body)
                  : action === "unavailable"
                    ? await handleUnavailableRepository(body)
                    : null;

  if (!result) {
    return Response.json({ error: "Unknown GitHub action." }, { status: 404 });
  }

  return Response.json(result, { status: result.success ? 200 : 400 });
}
