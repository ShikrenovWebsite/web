const ADMIN_LOCALE = "en-GB";
const ADMIN_TIME_ZONE = "Europe/Sofia";

const adminDateTimeFormatter = new Intl.DateTimeFormat(ADMIN_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ADMIN_TIME_ZONE,
});

const adminDateFormatter = new Intl.DateTimeFormat(ADMIN_LOCALE, {
  dateStyle: "medium",
  timeZone: ADMIN_TIME_ZONE,
});

type DateInput = Date | string | number | null | undefined;

function toValidDate(value: DateInput) {
  if (value === null || value === undefined) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatAdminDateTime(
  value: DateInput,
  fallback = "Never",
) {
  const parsed = toValidDate(value);
  return parsed ? adminDateTimeFormatter.format(parsed) : fallback;
}

export function formatAdminDate(value: DateInput, fallback = "Never") {
  const parsed = toValidDate(value);
  return parsed ? adminDateFormatter.format(parsed) : fallback;
}
