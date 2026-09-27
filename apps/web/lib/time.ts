/** The time zone every league date is entered and shown in: Philippine Standard Time (UTC+8, no daylight saving). */
export const LEAGUE_TIME_ZONE = "Asia/Manila";
const OFFSET = "+08:00";

const displayFormat = new Intl.DateTimeFormat("en-PH", {
  timeZone: LEAGUE_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "Sep 26, 2026, 11:30 AM PHT" -- identical on the server and in every browser, whatever the viewer's own time zone. */
export function formatPhTime(iso: string): string {
  return `${displayFormat.format(new Date(iso))} PHT`;
}

/** Reads a datetime-local value ("2026-09-26T11:30") as Philippine time and returns the absolute ISO timestamp. */
export function phLocalToIso(localValue: string): string {
  const withSeconds = localValue.length === 16 ? `${localValue}:00` : localValue;
  return new Date(`${withSeconds}${OFFSET}`).toISOString();
}

/** The inverse: an absolute timestamp as a datetime-local value in Philippine time, for prefilling the edit form. */
export function isoToPhLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEAGUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
