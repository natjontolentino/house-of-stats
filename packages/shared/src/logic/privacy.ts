/**
 * Youth-league privacy — spec section 15: a per-league setting hides full
 * names of players flagged as minors, showing first name and last initial
 * instead. Applies to public-facing display (the website, exports) — the
 * tracker app already shows nicknames, not full names, per spec 5.1.
 */
import type { Player } from "../types/entities";
import type { LeagueSettings } from "../types/settings";

export function displayPlayerName(
  player: Pick<Player, "full_name" | "is_minor">,
  settings: Pick<LeagueSettings, "hide_full_names_and_photos_of_minors">,
): string {
  if (!player.is_minor || !settings.hide_full_names_and_photos_of_minors) {
    return player.full_name;
  }
  const parts = player.full_name.trim().split(/\s+/);
  const first = parts[0] ?? player.full_name;
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : undefined;
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

// Note: Phase 1 never renders a player photo anywhere (box scores are
// text-only), so there is no photo-hiding logic to write yet — add it
// alongside whichever phase first displays photos, next to a real caller.
