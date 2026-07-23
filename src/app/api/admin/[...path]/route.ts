import { requireAdminApi } from "@/lib/auth";

async function protectedNotFound() {
  const auth = await requireAdminApi();

  if (!auth.authorized) {
    return auth.response;
  }

  return Response.json(
    { error: "Admin endpoint not implemented in Phase 1" },
    { status: 404 },
  );
}

export {
  protectedNotFound as DELETE,
  protectedNotFound as GET,
  protectedNotFound as PATCH,
  protectedNotFound as POST,
  protectedNotFound as PUT,
};
