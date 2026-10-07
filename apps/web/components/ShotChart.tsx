"use client";

import { useState } from "react";
import { SHOT_ZONE_LABELS, zoneTone, type ShotZone, type ShotZoneStats, type ZoneLine, type ZoneTone } from "@courtstats/shared";

/**
 * Half-court shot chart, drawn with the basket at the top — the same
 * orientation as the tracker's zone picker, so "left" and "right" mean the
 * same thing in both places. Zones are tinted by FG%: no attempts is grey,
 * under 33% red, 33-49% amber, 50%+ green.
 *
 * Court geometry is in tenths of a foot (a 50 x 47 ft half court), with the
 * rim 5.2 ft out from the baseline and a FIBA-style three-point line.
 */
const TONE_FILL: Record<ZoneTone, string> = {
  none: "rgba(120, 125, 145, 0.14)",
  cold: "rgba(214, 60, 60, 0.42)",
  warm: "rgba(240, 168, 36, 0.48)",
  hot: "rgba(34, 168, 92, 0.46)",
};

const LEGEND: Array<{ tone: ZoneTone; label: string }> = [
  { tone: "none", label: "No shots" },
  { tone: "cold", label: "Under 33%" },
  { tone: "warm", label: "33-49%" },
  { tone: "hot", label: "50%+" },
];

const ZONE_PATHS: Record<ShotZone, string> = {
  paint: "M170 0 L330 0 L330 190 L170 190 Z",
  mid_left: "M33.5 0 L170 0 L170 258 A221 221 0 0 1 33.5 96 Z",
  mid_right: "M466.5 0 L330 0 L330 258 A221 221 0 0 0 466.5 96 Z",
  mid_top: "M170 190 L330 190 L330 258 A221 221 0 0 1 170 258 Z",
  corner_left: "M0 0 L33.5 0 L33.5 96 L0 96 Z",
  corner_right: "M466.5 0 L500 0 L500 96 L466.5 96 Z",
  wing_left: "M33.5 96 A221 221 0 0 0 156.6 252.3 L55.1 470 L0 470 L0 96 Z",
  wing_right: "M466.5 96 A221 221 0 0 1 343.4 252.3 L444.9 470 L500 470 L500 96 Z",
  top_key: "M156.6 252.3 A221 221 0 0 0 343.4 252.3 L444.9 470 L55.1 470 Z",
};

/** Where each zone's label sits, and whether it is narrow enough to need small type. */
const LABEL_AT: Record<ShotZone, { x: number; y: number; small?: boolean }> = {
  paint: { x: 250, y: 118 },
  mid_left: { x: 102, y: 108 },
  mid_right: { x: 398, y: 108 },
  mid_top: { x: 250, y: 228 },
  corner_left: { x: 16.7, y: 42, small: true },
  corner_right: { x: 483.3, y: 42, small: true },
  wing_left: { x: 64, y: 232 },
  wing_right: { x: 436, y: 232 },
  top_key: { x: 250, y: 362 },
};

function pctText(line: ZoneLine): string {
  return line.pct === null ? "-" : `${Math.round(line.pct * 100)}%`;
}

function describe(zone: ShotZone, line: ZoneLine): string {
  return line.attempts === 0
    ? `${SHOT_ZONE_LABELS[zone]}: no shots`
    : `${SHOT_ZONE_LABELS[zone]}: ${line.makes}/${line.attempts} (${pctText(line)})`;
}

export function ShotChart({ stats, emptyMessage = "No shots recorded yet." }: { stats: ShotZoneStats; emptyMessage?: string }) {
  const [active, setActive] = useState<ShotZone | null>(null);
  const zones = Object.keys(ZONE_PATHS) as ShotZone[];
  const zonedAttempts = stats.total.attempts - stats.unzoned.attempts;
  const hasZones = zonedAttempts > 0;

  return (
    <div>
      <svg viewBox="0 0 500 470" role="img" aria-label="Shot chart by court zone" style={{ width: "100%", maxWidth: 520, display: "block", margin: "0 auto" }}>
        {zones.map((zone) => {
          const line = stats.zones[zone];
          const label = LABEL_AT[zone];
          const tone = zoneTone(line);
          const isActive = active === zone;
          return (
            <g
              key={zone}
              tabIndex={0}
              role="button"
              aria-label={describe(zone, line)}
              style={{ cursor: "pointer", outline: "none" }}
              onClick={() => setActive((cur) => (cur === zone ? null : zone))}
              onMouseEnter={() => setActive(zone)}
              onMouseLeave={() => setActive((cur) => (cur === zone ? null : cur))}
              onFocus={() => setActive(zone)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActive((cur) => (cur === zone ? null : zone));
                }
              }}
            >
              <title>{describe(zone, line)}</title>
              <path d={ZONE_PATHS[zone]} fill={TONE_FILL[tone]} stroke={isActive ? "var(--text)" : "none"} strokeWidth={isActive ? 3 : 0} />
              {line.attempts > 0 && (
                <text x={label.x} y={label.y} textAnchor="middle" fill="var(--text)" style={{ pointerEvents: "none", fontWeight: 700 }}>
                  <tspan x={label.x} fontSize={label.small ? 11 : 24}>
                    {line.makes}/{line.attempts}
                  </tspan>
                  <tspan x={label.x} dy={label.small ? 12 : 22} fontSize={label.small ? 10 : 16} fontWeight={600} opacity={0.75}>
                    {pctText(line)}
                  </tspan>
                </text>
              )}
            </g>
          );
        })}

        <g fill="none" stroke="var(--muted)" strokeWidth={2.5} strokeLinecap="round" opacity={0.75} style={{ pointerEvents: "none" }}>
          <rect x="1.5" y="1.5" width="497" height="467" />
          <rect x="170" y="1.5" width="160" height="188.5" />
          <circle cx="250" cy="190" r="60" />
          <path d="M210 52 A40 40 0 0 0 290 52" />
          <line x1="220" y1="38" x2="280" y2="38" />
          <circle cx="250" cy="52" r="9" />
          <line x1="33.5" y1="0" x2="33.5" y2="96" />
          <line x1="466.5" y1="0" x2="466.5" y2="96" />
          <path d="M33.5 96 A221 221 0 0 0 466.5 96" />
        </g>
      </svg>

      <p aria-live="polite" style={{ textAlign: "center", fontSize: 14, fontWeight: 700, margin: "10px 0 2px", minHeight: 21 }}>
        {active ? describe(active, stats.zones[active]) : stats.total.attempts === 0 ? emptyMessage : "Tap a zone for details"}
      </p>

      <ul style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 14px", listStyle: "none", margin: "8px 0 0", padding: 0, fontSize: 12, color: "var(--muted)" }}>
        {LEGEND.map(({ tone, label }) => (
          <li key={tone} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: TONE_FILL[tone], border: "1px solid var(--border-strong)" }} />
            {label}
          </li>
        ))}
      </ul>

      {stats.total.attempts > 0 && (
        <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--muted)", margin: "10px 0 0" }}>
          {stats.total.makes}/{stats.total.attempts} field goals ({pctText(stats.total)})
          {stats.unzoned.attempts > 0 &&
            (hasZones
              ? ` · ${stats.unzoned.attempts} shot${stats.unzoned.attempts === 1 ? "" : "s"} not tagged with a zone`
              : " · none of these shots were tagged with a zone")}
        </p>
      )}
    </div>
  );
}
