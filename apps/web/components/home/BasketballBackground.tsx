interface BallSpec {
  cx: number;
  cy: number;
  r: number;
  rotate: number;
}

const BALLS: BallSpec[] = [
  { cx: 110, cy: 110, r: 70, rotate: -18 },
  { cx: 860, cy: 90, r: 95, rotate: 22 },
  { cx: 520, cy: 430, r: 58, rotate: 8 },
  { cx: 230, cy: 390, r: 42, rotate: -28 },
  { cx: 730, cy: 340, r: 52, rotate: 16 },
  { cx: 960, cy: 440, r: 38, rotate: -12 },
  { cx: 30, cy: 440, r: 34, rotate: 6 },
  { cx: 420, cy: 60, r: 30, rotate: -6 },
];

/** One basketball drawn in line art -- outer seam plus the classic cross + two bowed side seams. */
function Ball({ cx, cy, r, rotate }: BallSpec) {
  const w = Math.max(1.5, r * 0.04);
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={w} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="currentColor" strokeWidth={w} />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="currentColor" strokeWidth={w} />
      <path d={`M ${cx} ${cy - r} Q ${cx + r * 0.62} ${cy} ${cx} ${cy + r}`} fill="none" stroke="currentColor" strokeWidth={w} />
      <path d={`M ${cx} ${cy - r} Q ${cx - r * 0.62} ${cy} ${cx} ${cy + r}`} fill="none" stroke="currentColor" strokeWidth={w} />
    </g>
  );
}

/** Decorative scattered basketballs used as a background texture -- pure SVG, no image asset. Purely visual: aria-hidden and absolutely positioned behind a section's real content. The caller supplies the class that sets color/opacity/positioning for its own background (dark vs. light section). */
export function BasketballBackground({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {BALLS.map((b, i) => (
        <Ball key={i} {...b} />
      ))}
    </svg>
  );
}
