import { NextResponse } from "next/server";
import { fetchLeagueBySlug } from "../../../../../lib/leaguePage";
import { renderSeasonSummaryHtml } from "../../../../../lib/seasonSummaryTemplate";
import { launchExportBrowser } from "../../../../../lib/launchBrowser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Season summary PDF, generated on demand from finalized games (nothing is stored). */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const data = await fetchLeagueBySlug(params.slug);
  if (!data || !data.stats || data.stats.players.length === 0) {
    return NextResponse.json({ error: "No season stats yet" }, { status: 404 });
  }

  const html = renderSeasonSummaryHtml({
    leagueName: data.league.name,
    seasonName: data.season?.name ?? "",
    stats: data.stats,
  });

  const browser = await launchExportBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "Letter",
      landscape: true,
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });
    return new NextResponse(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${data.league.slug}-season-summary.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
