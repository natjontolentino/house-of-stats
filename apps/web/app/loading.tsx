/** Shown instantly while a page's data loads, so a click never looks like it did nothing. */
export default function Loading() {
  return (
    <main className="page" aria-busy="true" aria-label="Loading">
      <div className="loading-bar" />
      <div className="loading-block" style={{ width: "40%", height: 28, marginTop: 8 }} />
      <div className="loading-block" style={{ width: "100%", height: 120, marginTop: 20 }} />
      <div className="loading-block" style={{ width: "100%", height: 120, marginTop: 14 }} />
    </main>
  );
}
