import "./live.css";

export default function LiveLoading() {
  return (
    <div className="live-root live-state" aria-busy="true">
      <div className="live-state__title">Loading scoreboard…</div>
    </div>
  );
}
