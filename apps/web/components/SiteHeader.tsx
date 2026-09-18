import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Live", active: true },
  { href: "#leagues", label: "Leagues" },
  { href: "#", label: "Players" },
  { href: "#leaders", label: "Leaderboards" },
  { href: "#", label: "Schedule" },
];

/**
 * Persistent brand header across every public page. The nav destinations
 * beyond the home page ("Leagues", "Players", etc.) are placeholders for
 * now (Fix: landing page redesign) -- the pages themselves don't exist yet,
 * only the home page's own preview sections do.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__mark">🏠</span>
          House of Stats
        </Link>

        <nav className="site-header__nav">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`site-header__link${link.active ? " site-header__link--active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="#" className="site-header__cta">
          For organizers
        </Link>
      </div>
    </header>
  );
}
