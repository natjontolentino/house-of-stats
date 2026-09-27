import { formatPhTime } from "../lib/time";

/** A timestamp in Philippine time (UTC+8). Formatted the same on the server and in every browser, so it never shifts with the viewer's time zone. */
export function LocalTime({ iso }: { iso: string }) {
  return <span>{formatPhTime(iso)}</span>;
}
