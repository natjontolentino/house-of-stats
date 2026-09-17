import { NextResponse } from "next/server";
import { fetchGameBundle } from "../../../../../lib/gameData";
import { renderGraphicHtml } from "../../../../../lib/exportTemplate";
import { launchExportBrowser } from "../../../../../lib/launchBrowser";
import { computeLiveGameState } from "@courtstats/shared";

export const runtime = "nodejs";

/** Shareable per-game JPEG graphic — spec 12.2, generated on demand (12.4). */
export async function GET(_req: Request, { params }: { params: { gameId: string } }) {
  const bundle = await fetchGameBundle(params.gameId);
  if (!bundle) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const liveState = computeLiveGameState({
    game: bundle.game,
    allEvents: bundle.events,
    rosterByTeam: bundle.rosterByTeam,
    settings: bundle.settings,
  });

  const html = renderGraphicHtml(bundle, liveState);

  const browser = await launchExportBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
    await page.setContent(html, { waitUntil: "load" });
    const jpeg = await page.screenshot({ type: "jpeg", quality: 90 });
    return new NextResponse(new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `inline; filename="game-${params.gameId}-graphic.jpg"`,
      },
    });
  } finally {
    await browser.close();
  }
}
