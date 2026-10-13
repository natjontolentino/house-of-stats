import { Bebas_Neue, Barlow, Barlow_Condensed } from "next/font/google";

// Display + condensed faces for scoreboards readable from across a room. Font
// loaders must be called at module scope, so the live pages share these.
export const liveDisplayFont = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--live-font-display", display: "swap" });
export const liveCondensedFont = Barlow_Condensed({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--live-font-cond", display: "swap" });
export const liveBodyFont = Barlow({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--live-font-body", display: "swap" });
