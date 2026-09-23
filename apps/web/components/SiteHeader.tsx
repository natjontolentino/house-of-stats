"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Live" },
  { href: "#leagues", label: "Leagues" },
  { href: "#", label: "Players" },
  { href: "#leaders", label: "Leaderboards" },
  { href: "/standings", label: "Standings" },
  { href: "#", label: "Schedule" },
];

/**
 * Persistent brand header across every public page. Most nav destinations
 * ("Leagues", "Players", "Schedule") are still placeholders -- those pages
 * don't exist yet, only the home page's own preview sections do. "Standings"
 * is real (season averages + standings implementation).
 */
export function SiteHeader() {
  const pathname = usePathname();

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
              className={[
                "site-header__link",
                pathname === link.href && "site-header__link--active",
                pathname === link.href && link.label === "Live" && "site-header__link--live",
              ]
                .filter(Boolean)
                .join(" ")}
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
