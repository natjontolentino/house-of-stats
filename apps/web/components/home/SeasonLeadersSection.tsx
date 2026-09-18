interface LeaderRow {
  name: string;
  value: string;
}

interface LeaderCategory {
  title: string;
  rows: LeaderRow[];
}

/** Placeholder leaders (landing page redesign, placeholder-first pass) — real leaderboard computation is Phase 2 work. */
const CATEGORIES: LeaderCategory[] = [
  {
    title: "Points",
    rows: [
      { name: "D. Estevez", value: "24.6" },
      { name: "R. Okafor", value: "22.1" },
      { name: "J. Bosko", value: "20.8" },
      { name: "T. Adjei", value: "19.4" },
      { name: "M. Ilori", value: "18.9" },
    ],
  },
  {
    title: "Rebounds",
    rows: [
      { name: "K. Nakashima", value: "13.2" },
      { name: "A. Delacroix", value: "11.7" },
      { name: "S. Marchetti", value: "10.9" },
      { name: "P. Adegoke", value: "10.1" },
      { name: "L. Fetterman", value: "9.6" },
    ],
  },
  {
    title: "Assists",
    rows: [
      { name: "C. Ellery", value: "8.4" },
      { name: "B. Vantong", value: "7.9" },
      { name: "N. Talaman", value: "6.5" },
      { name: "G. Yarbrough", value: "6.1" },
      { name: "H. Mackleroy", value: "5.8" },
    ],
  },
];

export function SeasonLeadersSection() {
  return (
    <section id="leaders" className="section-band leaders-band">
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">Season leaders</h2>
          <a href="#" className="section-band__link">
            Every category, top 10 →
          </a>
        </div>

        <div className="leaders-grid">
          {CATEGORIES.map((cat) => (
            <div className="leaders-card" key={cat.title}>
              <div className="leaders-card__head">
                <span className="leaders-card__title">{cat.title}</span>
                <span className="leaders-card__unit">per game</span>
              </div>
              {cat.rows.map((row, i) => (
                <div className="leaders-row" key={row.name}>
                  <span className={`leaders-row__rank${i === 0 ? " leaders-row__rank--first" : ""}`}>{i + 1}</span>
                  <span className="leaders-row__name">{row.name}</span>
                  <span className="leaders-row__value">{row.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
