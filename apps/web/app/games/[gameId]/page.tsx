import { notFound } from "next/navigation";
import { fetchGameBundle } from "../../../lib/gameData";
import { LiveGameView } from "./LiveGameView";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: { gameId: string } }) {
  const bundle = await fetchGameBundle(params.gameId);
  if (!bundle) notFound();

  return <LiveGameView bundle={bundle} />;
}
