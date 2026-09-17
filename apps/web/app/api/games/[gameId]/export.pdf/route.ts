import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { fetchGameBundle } from "../../../../../lib/gameData";
import { renderScoresheetHtml } from "../../../../../lib/exportTemplate";
import { computeLiveGameState } from "@courtstats/shared";

export const runtime = "nodejs";

/**
 * Generated on demand from stored events — spec 12.1, 12.4. Nothing is
 * persisted; a game's PDF is a picture of data already held as text and can
 * be regenerated identically at any time.
 */
export async function GET(_req: Request, { params }: { params: { gameId: string } }) {
  const bundle = await fetchGameBundle(params.gameId);
  if (!bundle) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const liveState = computeLiveGameState({
    game: bundle.game,
    allEvents: bundle.events,
    rosterByTeam: bundle.rosterByTeam,
    settings: bundle.settings,
  });

  const html = renderScoresheetHtml(bundle, liveState);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "Letter", printBackground: true, margin: { top: "24px", bottom: "24px", left: "24px", right: "24px" } });
    return new NextResponse(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="game-${params.gameId}-scoresheet.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
