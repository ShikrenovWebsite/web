# Personal portfolio

A production-oriented personal portfolio and content-management system built with Next.js App
Router, TypeScript, PostgreSQL, Prisma, Auth.js, Tailwind CSS, and shadcn/ui
conventions.

Phases 1–3 include the data architecture, secure owner-only authentication,
public portfolio, responsive administration, content management for profile,
experience, education, skills, and projects, plus review-first GitHub repository
synchronization. CV parsing is deliberately deferred to Phase 4.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- A Neon PostgreSQL project with pooled and direct connection strings
- A GitHub OAuth app

## Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon pooled PostgreSQL URL used by the application |
| `DIRECT_URL` | Yes for CLI | Neon direct PostgreSQL URL used by Prisma CLI migrations |
| `AUTH_SECRET` | Yes | At least 32 characters; signs and encrypts Auth.js data |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth app client ID |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth app client secret |
| `ADMIN_GITHUB_LOGIN` | Yes | Exact GitHub login approved as the owner |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical application origin |
| `NEXTAUTH_URL` | Yes | Auth.js callback origin (same value as the site URL) |

Generate a suitable Auth.js secret with:

```bash
openssl rand -base64 32
```

For local GitHub OAuth, configure:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL:
  `http://localhost:3000/api/auth/callback/github`

Use the deployed origin for the production OAuth app.

## Local setup

Create an ignored local environment file and replace every placeholder with
values from Neon and the GitHub OAuth application:

```bash
cp .env.example .env.local
```

Use Neon's pooled connection string for `DATABASE_URL`. Use the corresponding
unpooled connection string for `DIRECT_URL`; Prisma CLI commands prefer this
direct URL while the application continues to use the pooled URL.
`.env.local` overrides `.env` for Next.js, Prisma CLI commands, and the seed
script.

Install dependencies, apply committed migrations, seed, and start the app:

```bash
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Open:

- Public portfolio: `http://localhost:3000`
- Admin panel: `http://localhost:3000/admin`

Only the GitHub account whose actual provider login matches
`ADMIN_GITHUB_LOGIN` can complete owner authentication. The seed creates the
initial approved database record, and authentication links that record to the
verified OAuth identity. Matching is case-insensitive.

## Useful commands

```bash
npm run dev
npm run lint
npm run test
npm run typecheck
npm run build
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:studio
```

## Architecture

- `src/app/(public)` is the public portfolio. Its data query explicitly selects
  only `PUBLISHED` records.
- `src/app/admin` is a server-authorized area. Its layout calls
  `requireAdminPage()` before rendering any child route.
- `src/app/api/admin` is protected server-side. Admin route handlers call
  `requireAdminApi()` before processing inputs.
- `src/app/api/auth/[...nextauth]` contains the Auth.js GitHub OAuth handlers.
- `src/lib/auth.ts` owns authentication and authorization policy.
- `src/lib/public-portfolio.ts` is the public read boundary.
- `src/app/admin/actions.ts` contains owner-authorized mutations.
- `src/app/admin/github/actions.ts` contains validated repository review
  mutations.
- `src/lib/github` contains the server-only GitHub client, token encryption, and
  transactional sync engine.
- `src/lib/validations/content.ts` contains shared Zod validation contracts.
- `src/lib/status.ts` contains server-safe presentation mappings shared by
  server and client components.
- `prisma/schema.prisma` separates external snapshots, import review items, and
  editable portfolio presentation records.

Database-backed Auth.js sessions allow administrator access to be revoked
centrally. OAuth access tokens stay in server-only database models and are never
serialized into the browser session.

### Import safety boundaries

- Public records use `DRAFT`, `PUBLISHED`, and `HIDDEN` publication states.
- Editable records retain `MANUAL`, `CV_IMPORT`, or `GITHUB` provenance.
- GitHub source snapshots live in `GitHubRepository`; manually edited public
  presentation lives in `PortfolioProject`.
- GitHub decisions persist as `PENDING`, `ACCEPTED`, `IGNORED`, or `REMOVED`.
- CV extraction and conflict review live in `CvImportRun` and `CvImportItem`.
- CVs and media store private storage keys and metadata; file bytes will use a
  storage adapter in Phase 4.
- Future imports and sync-created projects default to `DRAFT`; neither workflow
  will publish records automatically.

## Content management

The admin routes `/admin/profile`, `/admin/experience`, `/admin/education`,
`/admin/skills`, and `/admin/projects` support:

- creation and editing through React Hook Form and shared Zod schemas;
- server-side validation and owner authorization on every mutation;
- draft, published, and hidden states;
- explicit up/down ordering plus editable display-order values;
- permanent deletion behind confirmation dialogs;
- responsive cards, empty states, pending controls, inline errors, and toast
  feedback.

Project records also support technology tags, live/source URLs, featured state,
dates, provenance, GitHub source links, and cover-image metadata placeholders.

The public query boundary returns only `PUBLISHED` records. Draft and hidden
content never reaches the public page query result.

## GitHub synchronization

Open `/admin/github`, choose **Connect GitHub**, then choose **Sync GitHub**.
Connection reuses the approved owner's existing Auth.js GitHub OAuth account.
The provider token is copied into `GitHubConnection` using authenticated
AES-256-GCM encryption derived from `AUTH_SECRET`; neither the encrypted value
nor the original token is serialized to client components or API responses.

The OAuth request uses:

- `read:user` to identify the authenticated GitHub login;
- `user:email` for Auth.js account identity;
- `read:org` to discover the owner's organization memberships reliably.

GitHub permits read-only access to public repository metadata without a
repository OAuth scope. The application therefore does not request `repo` or
another private-repository scope. The OAuth callback remains:

```text
http://localhost:3000/api/auth/callback/github
```

Tokens issued before organization support do not automatically gain
`read:org`. When `/admin/github` shows **Reconnect GitHub**, use that action,
approve the updated permissions on GitHub, return to `/admin/github`, and
choose **Complete reconnect** if it is shown. The stored encrypted sync token
is replaced only after the callback has authenticated the configured owner and
the new token contains every required scope. Existing repository decisions,
projects, and manual edits are preserved.

If GitHub keeps issuing the old scopes, sign out, revoke the OAuth application
under GitHub **Settings → Applications → Authorized OAuth Apps**, then sign in
again. An organization with OAuth application restrictions may also require an
organization owner to approve the application. If the organization uses SAML
SSO, authorize the OAuth application for that organization from the same
GitHub settings area.

The sync:

- requests all pages of `GET /user/repos` with
  `visibility=public` and
  `affiliation=owner,organization_member,collaborator`;
- requests all pages of `GET /user/orgs` and separately inspects each enabled
  organization through `GET /orgs/{org}/repos`;
- includes public repositories owned by the personal account or an enabled
  organization, while preserving GitHub's numeric repository ID as identity;
- excludes forks, archived repositories, and templates by default;
- never treats a `/settings` URL as repository identity or as a project source
  URL; source links come from GitHub's canonical repository `html_url`;
- lets the administrator disable one organization without deleting its
  repositories, review decisions, or portfolio projects;
- stores GitHub source fields and snapshots separately from editable
  `PortfolioProject` fields;
- treats README failures as warnings rather than failing the repository sync;
- records new, changed, unchanged, and unavailable results in
  `GitHubSyncRun`/`GitHubSyncItem`;
- stores API rate-limit remaining/reset information and shows complete API
  failures without changing existing source records;
- preserves `IGNORED` decisions across later runs;
- creates only `DRAFT` projects when **Add to portfolio** is selected;
- never deletes projects or overwrites titles, descriptions, technologies,
  media, ordering, publication state, or featured state during sync.

### Automatic project enrichment

Every eligible new repository is enriched after its metadata is synchronized.
Existing repositories are enriched again when GitHub reports a new push or
when the analyzer version changes. The server inspects a bounded set of common
repository files, including:

- JavaScript package manifests and npm, pnpm, Yarn, and Bun lockfiles;
- Dockerfiles and Compose configuration;
- GitHub Actions, GitLab CI, and CircleCI workflows;
- Prisma, Python, Go, Rust, PHP, and Ruby manifests;
- Vercel, Netlify, Render, Fly.io, Railway, and Cloudflare configuration.

At most 40 relevant files are considered. Individual files are capped at
250 KB and the combined fetched content is capped at 1.5 MB. This keeps a
manual sync predictable and prevents arbitrary repository contents from being
executed. The analyzer detects frameworks, libraries, databases, cloud
providers, CI/CD systems, package managers, deployment platforms, languages,
and tools. It stores the evidence, detection snapshot, fingerprint, README,
README images, and generated title/summary/description/technology suggestions
on `GitHubRepository`.

These values are immutable source suggestions, not public portfolio content.
`PortfolioProject` remains the independently editable presentation record.
Creating a project copies the current suggestions into a `DRAFT` once. Later
syncs never update that project. The owner can explicitly apply one suggested
field or select a stored README image as a cover; all other manual values,
ordering, featured state, and publication state remain untouched.

README Markdown is rendered through a conservative React renderer that does
not inject README HTML or use `dangerouslySetInnerHTML`. Links are limited to
HTTP(S). README images are suggestions only and are never selected as a public
cover without an explicit admin action.

GitHub owner records are source identities beneath the authenticated
portfolio owner's single `GitHubConnection`. The personal owner is always
enabled. Organizations never create an application `User`, Auth.js `Account`,
portfolio profile, tenant, or separate connection.

Organization discovery merges both paginated sources by GitHub's stable
numeric owner ID:

- `GET /user/orgs?per_page=100`;
- unique organization owners in the paginated authenticated
  `GET /user/repos` result.

New organizations start as `PENDING`. The administrator can enable or ignore
them. `PENDING`, `ENABLED`, and `IGNORED` preferences persist across later
syncs; only enabled organizations receive direct repository synchronization.
Disabling or ignoring an organization never removes existing source records,
review decisions, or projects.

Organization access is evaluated independently. Missing `read:org`, an OAuth
approval requirement, a `403`, or a rate limit is shown as a warning rather
than “zero repositories.” Successfully accessible personal accounts and other
organizations continue syncing. A repository previously associated with an
organization is not marked unavailable when that organization could not be
inspected during the current run.

In development, `/admin/github` also provides **Test access** for the configured
Calistheni verification target. The server-authorized diagnostic checks
`GET /user/orgs`, `GET /user/repos`,
`GET /orgs/Calistheni/repos`, and
`GET /repos/Calistheni/calistheni-app`. It records only sanitized statuses,
scopes, counts, pagination, filter reasons, and rate-limit metadata—never
tokens, cookies, authorization headers, or OAuth codes. If GitHub hides an
OAuth-restricted organization from membership discovery while its public
repository endpoint remains accessible, the test safely registers that public
organization as a sync owner. Detailed repository diagnostics are omitted from
the production UI.

The application does not request `public_repo`: the public organization and
repository endpoints work with the existing public-only policy. GitHub
organization approval is still recommended when the admin warning says the
OAuth app is restricted, because membership discovery remains unavailable
until an organization owner approves the OAuth application.

The **Changed** view compares current project presentation with the latest
GitHub source. Individual GitHub values can be applied explicitly; all
unselected values remain unchanged. The **Unavailable** view allows the owner
to keep, unpublish, disconnect, or separately remove the portfolio project.

GitHub's rate limit is read from response headers. When exhausted, the run is
marked failed with its reset time and existing repositories remain intact. A
subsequent manual sync can be started after that time.

## Database changes

For schema development, create a separate Neon development branch/database and
run:

```bash
npm run db:migrate -- --name describe_change
```

Apply already committed migrations to a configured Neon database with:

```bash
npm run db:deploy
```

> **Production data warning:** Never run `prisma migrate dev`, reset commands,
> destructive SQL, or experimental migrations against a Neon branch containing
> production data. Develop migrations on an isolated Neon development branch,
> review the generated SQL, commit it, and use `prisma migrate deploy` for
> production.

The seed script writes example portfolio records and an administrator record.
Run it only against a Neon database where that sample data is intended.

## Vercel deployment

1. Provision a Neon PostgreSQL project and add all variables from `.env.example`
   to the Vercel project.
2. Use the Neon pooled URL for `DATABASE_URL` and direct URL for `DIRECT_URL`.
3. Set `NEXT_PUBLIC_SITE_URL` to the production origin.
4. Add that origin and its Auth.js callback URL to the production GitHub OAuth
   app.
5. Run `npm run db:deploy` from a trusted deployment job.
6. Deploy with `npm run build`.

The application uses the Node.js runtime because Auth.js sessions and Prisma
require server-side database access.

## Next phase

Implement Phase 4: private PDF/DOCX storage, text extraction, structured CV
drafts, duplicate/conflict detection, field-level review, and selective import
without overwriting or publishing existing portfolio content.
