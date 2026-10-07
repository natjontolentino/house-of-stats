import { Bebas_Neue, Barlow, Barlow_Condensed } from "next/font/google";

// Display + condensed faces for a scoreboard readable from across a room.
const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--live-font-display", display: "swap" });
const condensed = Barlow_Condensed({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--live-font-cond", display: "swap" });
const body = Barlow({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--live-font-body", display: "swap" });

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${condensed.variable} ${body.variable}`}>{children}</div>;
}
