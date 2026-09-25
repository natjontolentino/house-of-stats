"use client";

/** Formats a timestamp in the viewer's own time zone. The server runs in UTC, so formatting there would show the wrong hour. */
export function LocalTime({ iso }: { iso: string }) {
  return <span suppressHydrationWarning>{new Date(iso).toLocaleString()}</span>;
}
