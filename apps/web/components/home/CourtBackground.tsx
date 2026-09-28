/** Decorative full-court line drawing used as a background texture -- pure SVG, no image asset, so it stays crisp and lightweight at any size. Purely visual: aria-hidden and absolutely positioned behind a section's real content. The caller supplies the class that sets color/opacity/positioning for its own background. */
export function CourtBackground({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1000 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="20" y="20" width="960" height="460" rx="4" />
        <line x1="500" y1="20" x2="500" y2="480" />
        <circle cx="500" cy="250" r="70" />
        <circle cx="500" cy="250" r="8" fill="currentColor" stroke="none" />

        {/* Left key, arc and hoop */}
        <rect x="20" y="160" width="170" height="180" />
        <circle cx="190" cy="250" r="60" />
        <path d="M 20 60 A 330 330 0 0 1 20 440" />
        <circle cx="55" cy="250" r="7" />
        <path d="M 40 235 A 22 22 0 0 1 40 265" />

        {/* Right key, arc and hoop */}
        <rect x="810" y="160" width="170" height="180" />
        <circle cx="810" cy="250" r="60" />
        <path d="M 980 60 A 330 330 0 0 0 980 440" />
        <circle cx="945" cy="250" r="7" />
        <path d="M 960 235 A 22 22 0 0 0 960 265" />
      </g>
    </svg>
  );
}
