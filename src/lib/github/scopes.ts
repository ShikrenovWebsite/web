export const REQUIRED_GITHUB_SCOPES = [
  "read:user",
  "user:email",
  "read:org",
] as const;

export function parseGitHubScopes(value: string | null | string[]) {
  const scopes = Array.isArray(value)
    ? value
    : (value ?? "").split(/[,\s]+/);

  return [
    ...new Set(
      scopes.map((scope) => scope.trim().toLowerCase()).filter(Boolean),
    ),
  ];
}

export function hasRequiredGitHubScopes(value: string | null | string[]) {
  const scopes = new Set(parseGitHubScopes(value));
  return REQUIRED_GITHUB_SCOPES.every((scope) => scopes.has(scope));
}
