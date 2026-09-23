/**
 * The "roofline over three rising bars" mark, replacing the placeholder 🏠
 * emoji — traced exactly from the user's own design file (Mark.dc.html):
 * one chevron roof stroke plus three ascending bars, the tallest in the
 * accent color. `color` is the roof/first-two-bars fill (white on the dark
 * header/footer, near-black `#151821` in the mark's own light-background
 * reference), independent of the accent bar.
 */
export function Logo({
  size = 22,
  color = "white",
  accent = "var(--accent)",
}: {
  size?: number;
  color?: string;
  accent?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="House of Stats">
      <path
        d="M6 46 L50 10 L94 46"
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="22" y="68" width="14" height="24" rx="3" fill={color} />
      <rect x="43" y="58" width="14" height="34" rx="3" fill={color} />
      <rect x="64" y="48" width="14" height="44" rx="3" fill={accent} />
    </svg>
  );
}
