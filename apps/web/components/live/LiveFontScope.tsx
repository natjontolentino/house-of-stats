import { liveBodyFont, liveCondensedFont, liveDisplayFont } from "../../lib/liveFonts";

/** Makes the scoreboard fonts available to everything inside. */
export function LiveFontScope({ children }: { children: React.ReactNode }) {
  return <div className={`${liveDisplayFont.variable} ${liveCondensedFont.variable} ${liveBodyFont.variable}`}>{children}</div>;
}
