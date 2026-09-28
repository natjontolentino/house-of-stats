/**
 * Angled bird's-eye view of a full court with two hoops -- an original
 * line-art recreation of that composition (not traced from any reference
 * image; every stock preview the user shared for this carried marketplace
 * watermarks, so this is drawn from scratch instead). Pure SVG, no image
 * asset. Purely visual: aria-hidden and absolutely positioned behind a
 * section's real content. The caller supplies the class that sets
 * color/opacity/positioning for its own background.
 */
export function CourtBackground({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1000 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* Floor, viewed at a slight angle: front (bottom) edge lower and wider than the back (top) edge. */}
        <path d="M 130 330 L 870 300 L 830 470 L 170 495 Z" />
        <line x1="503" y1="313" x2="497" y2="484" />
        <ellipse cx="500" cy="398" rx="46" ry="18" transform="rotate(-2 500 398)" />

        {/* Left key and free-throw circle. */}
        <path d="M 130 330 L 300 322 L 292 468 L 170 495 Z" />
        <path d="M 220 365 A 45 20 0 0 1 220 432" />

        {/* Right key and free-throw circle. */}
        <path d="M 700 305 L 870 300 L 830 470 L 708 462 Z" />
        <path d="M 782 358 A 45 20 0 0 0 782 425" />

        {/* Left hoop: angled support rising from the court's near corner, backboard and net. */}
        <line x1="150" y1="325" x2="95" y2="150" />
        <rect x="66" y="118" width="54" height="36" rx="6" transform="rotate(-8 93 136)" />
        <path d="M 78 155 L 106 152 L 100 180 L 88 181 Z" transform="rotate(-8 93 136)" />

        {/* Right hoop: mirrored. */}
        <line x1="850" y1="300" x2="905" y2="150" />
        <rect x="880" y="118" width="54" height="36" rx="6" transform="rotate(8 907 136)" />
        <path d="M 894 155 L 922 152 L 916 180 L 904 181 Z" transform="rotate(8 907 136)" />
      </g>
    </svg>
  );
}
