/**
 * Practice mode (spec 6.15): a practice game never gets a row in the
 * server's `game` table at all — it's purely a local, client-generated id
 * that never syncs and appears nowhere on the website. There is no
 * `is_practice` column on `game` (spec 5.1 lists its exact fields); whether a
 * game is practice is entirely determined by this id prefix.
 */
export const PRACTICE_GAME_ID_PREFIX = "practice-";

export function isPracticeGameId(gameId: string): boolean {
  return gameId.startsWith(PRACTICE_GAME_ID_PREFIX);
}
