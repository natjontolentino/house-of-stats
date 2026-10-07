import { notFound } from "next/navigation";
import { fetchGameBundle } from "../../../../lib/gameData";
import { LiveScoreboard, type LiveView } from "./LiveScoreboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { gameId: string } }) {
  const bundle = await fetchGameBundle(params.gameId);
  return {
    title: bundle ? `${bundle.awayTeam.name} vs ${bundle.homeTeam.name} · Live · House of Stats` : "Live · House of Stats",
  };
}

export default async function LivePage({ params, searchParams }: { params: { gameId: string }; searchParams: { view?: string } }) {
  const bundle = await fetchGameBundle(params.gameId);
  if (!bundle) notFound();

  const initialView: LiveView = searchParams.view === "box" || searchParams.view === "pbp" ? searchParams.view : "scoreboard";
  return <LiveScoreboard bundle={bundle} initialView={initialView} />;
}
