/**
 * Team display name for space-constrained chrome (top bar, team foul label,
 * phone team toggle) — spec fix A5: use short_name there, falling back to a
 * truncated full name only if short_name is somehow absent.
 */
export function teamShortLabel(team: { name: string; short_name?: string | null }): string {
  if (team.short_name && team.short_name.trim().length > 0) return team.short_name;
  return team.name.length > 12 ? `${team.name.slice(0, 11)}…` : team.name;
}
