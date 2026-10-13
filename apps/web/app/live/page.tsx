import { fetchLiveFeed } from "../../lib/liveFeed";
import { getHomeFeed } from "../../lib/homeCache";
import type { FeedGame } from "../../lib/feedBuilder";
import { LiveBoard } from "./LiveBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live games · House of Stats" };

export default async function LivePage() {
  // Read straight from the database, not the home page's short cache: this board is meant to be left up on a screen.
  const games = await fetchLiveFeed();

  // Only needed to fill the screen when nothing is live.
  let recent: FeedGame[] = [];
  if (games.length === 0) {
    const feed = await getHomeFeed();
    recent = [...(feed.spotlight ? [feed.spotlight] : []), ...feed.recent];
  }

  return <LiveBoard games={games} recent={recent} generatedAt={new Date().toISOString()} />;
}
