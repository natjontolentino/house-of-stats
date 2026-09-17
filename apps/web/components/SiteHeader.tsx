import Link from "next/link";

/** Persistent brand header across every public page — spec 8.1 pages share one identity. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__mark">🏀</span>
          CourtStats
        </Link>
      </div>
    </header>
  );
}
