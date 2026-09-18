import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wide-page site-footer__inner">
        <div className="site-footer__copy">
          <span>🏠</span>
          <span>© 2026 House of Stats</span>
        </div>
        <nav className="site-footer__nav">
          <Link href="/">Live</Link>
          <Link href="#leagues">Leagues</Link>
          <Link href="#">For organizers</Link>
          <Link href="#">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
