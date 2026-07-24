-- Freeze the currently visible portfolio for existing installations so later
-- canonical edits cannot leak before the first explicit Publish changes action.
INSERT INTO "PortfolioPublication" (
  "id",
  "userId",
  "revision",
  "data",
  "publishedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'pub_' || md5(u."id" || clock_timestamp()::text),
  u."id",
  1,
  jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', p."id",
        'fullName', p."fullName",
        'professionalTitle', p."professionalTitle",
        'biography', p."biography",
        'email', p."email",
        'phone', p."phone",
        'location', p."location",
        'websiteUrl', p."websiteUrl",
        'socialLinks', p."socialLinks"
      )
      FROM "PortfolioProfile" p
      WHERE p."userId" = u."id" AND p."status" = 'PUBLISHED'
      LIMIT 1
    ),
    'experiences', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e."id",
        'company', e."company",
        'role', e."role",
        'employmentType', e."employmentType",
        'location', e."location",
        'description', e."description",
        'highlights', to_jsonb(e."highlights"),
        'startDate', e."startDate",
        'endDate', e."endDate",
        'isCurrent', e."isCurrent"
      ) ORDER BY e."displayOrder", e."startDate" DESC)
      FROM "Experience" e
      WHERE e."userId" = u."id" AND e."status" = 'PUBLISHED'
    ), '[]'::jsonb),
    'education', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e."id",
        'institution', e."institution",
        'qualification', e."qualification",
        'fieldOfStudy', e."fieldOfStudy",
        'location', e."location",
        'description', e."description",
        'achievements', to_jsonb(e."achievements"),
        'startDate', e."startDate",
        'endDate', e."endDate"
      ) ORDER BY e."displayOrder", e."startDate" DESC)
      FROM "Education" e
      WHERE e."userId" = u."id" AND e."status" = 'PUBLISHED'
    ), '[]'::jsonb),
    'skills', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s."id",
        'name', s."name",
        'category', s."category",
        'proficiency', s."proficiency"
      ) ORDER BY s."displayOrder", s."name")
      FROM "Skill" s
      WHERE s."userId" = u."id" AND s."status" = 'PUBLISHED'
    ), '[]'::jsonb),
    'projects', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p."id",
        'title', p."title",
        'slug', p."slug",
        'shortDescription', p."shortDescription",
        'longDescription', p."longDescription",
        'highlights', to_jsonb(p."highlights"),
        'technologies', to_jsonb(p."technologies"),
        'liveUrl', p."liveUrl",
        'sourceCodeUrl', p."sourceCodeUrl",
        'coverImageUrl', p."coverImageUrl",
        'startDate', p."startDate",
        'endDate', p."endDate",
        'featured', p."featured"
      ) ORDER BY p."displayOrder", p."createdAt" DESC)
      FROM "PortfolioProject" p
      WHERE p."userId" = u."id" AND p."status" = 'PUBLISHED'
    ), '[]'::jsonb),
    'siteSettings', (
      SELECT jsonb_build_object(
        'siteTitle', s."siteTitle",
        'siteDescription', s."siteDescription",
        'contactEmail', s."contactEmail",
        'isContactFormEnabled', s."isContactFormEnabled",
        'isCvDownloadEnabled', s."isCvDownloadEnabled",
        'publicCvUploadId', s."publicCvUploadId",
        'socialLinks', s."socialLinks",
        'seoMetadata', s."seoMetadata"
      )
      FROM "SiteSettings" s
      WHERE s."userId" = u."id"
      LIMIT 1
    )
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE u."isAdmin" = TRUE
AND NOT EXISTS (
  SELECT 1
  FROM "PortfolioPublication" publication
  WHERE publication."userId" = u."id"
);
