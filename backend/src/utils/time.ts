/**
 * Day boundaries.
 *
 * uCommit is built on the idea of a day: did you submit proof today,
 * and which days did you miss. Until now "today" meant the *server's*
 * local day, so a user in another country had their day start and end
 * at the wrong moment - and worse, the submission check and the
 * close-out job each worked it out separately.
 *
 * Every day decision now goes through this file, using the user's own
 * IANA timezone. The rule that matters: whatever counts as "today" when
 * somebody submits must be the same day the close-out job later decides
 * was or was not missed. Two different answers means charging someone
 * for a day they actually showed up for.
 *
 * Days are compared as keys ("2026-09-26") rather than as instants.
 * A key is unambiguous, sorts correctly, and sidesteps the offset
 * arithmetic that daylight saving makes fragile.
 */

const formatterCache = new Map<
  string,
  Intl.DateTimeFormat
>();

/** Falls back to UTC rather than throwing on a bad stored zone. */
function formatterFor(
  timezone: string
): Intl.DateTimeFormat {
  const cached =
    formatterCache.get(timezone);

  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;

  try {
    // en-CA renders as YYYY-MM-DD.
    formatter = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
  } catch {
    formatter = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
  }

  formatterCache.set(
    timezone,
    formatter
  );

  return formatter;
}

/** True when the string is a timezone this runtime recognises. */
export function isValidTimezone(
  timezone: unknown
): timezone is string {
  if (
    typeof timezone !== "string" ||
    timezone.trim() === ""
  ) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
    });
    return true;
  } catch {
    return false;
  }
}

/** The calendar day an instant falls on, in that timezone. */
export function dayKey(
  instant: Date,
  timezone: string
): string {
  return formatterFor(timezone).format(
    instant
  );
}

/** The user's current day. */
export function todayKey(
  timezone: string,
  now: Date = new Date()
): string {
  return dayKey(now, timezone);
}

/** The day before a given key. Keys are plain calendar dates. */
export function previousDayKey(
  key: string
): string {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** The day after a given key. */
export function nextDayKey(
  key: string
): string {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Whole days from one key to another, negative if `to` is earlier. */
export function daysBetween(
  from: string,
  to: string
): number {
  const a = Date.parse(
    from + "T12:00:00Z"
  );

  const b = Date.parse(
    to + "T12:00:00Z"
  );

  return Math.round(
    (b - a) / 86400000
  );
}

/**
 * Every key from `from` up to but not including `until`.
 * Anchored at midday UTC so a daylight saving shift can never skip or
 * repeat a day.
 */
export function dayKeysBetween(
  from: string,
  until: string
): string[] {
  const keys: string[] = [];

  let cursor = from;

  // Guard against a malformed range looping forever.
  let guard = 0;

  while (
    cursor < until &&
    guard < 3660
  ) {
    keys.push(cursor);
    cursor = nextDayKey(cursor);
    guard++;
  }

  return keys;
}

/**
 * An instant safely before the start of `key` in any timezone, for
 * bounding a database query. Day membership is then decided exactly by
 * comparing keys - this only narrows the rows fetched.
 */
export function queryFloor(
  key: string
): Date {
  return new Date(
    Date.parse(key + "T00:00:00Z") -
      36 * 3600 * 1000
  );
}

/** The matching upper bound for `queryFloor`. */
export function queryCeiling(
  key: string
): Date {
  return new Date(
    Date.parse(key + "T00:00:00Z") +
      36 * 3600 * 1000
  );
}
