/**
 * ProbabilityChart.jsx — Horizontal bar chart of championship probabilities.
 *
 * Built as raw SVG (no charting library). Teams sorted descending by
 * championship probability, colored by conference (West=blue, East=red).
 * Mirrors render_champ_prob_chart_html() from the Python dashboard.
 */

const WEST_COLOR = '#3a68b5';
const EAST_COLOR = '#c04060';

function espnAbbrev(abbrev) {
  const MAP = {
    GSW: 'gs', NYK: 'ny', SAS: 'sa', NOP: 'no',
    UTA: 'utah', PHO: 'phx', WAS: 'wsh', BRK: 'bkn', CHO: 'cha',
  };
  return MAP[abbrev.toUpperCase()] ?? abbrev.toLowerCase();
}

function logoUrl(abbrev) {
  return `https://a.espncdn.com/i/teamlogos/nba/500/${espnAbbrev(abbrev)}.png`;
}

export default function ProbabilityChart({ data }) {
  const { championship_probs: probs, teams } = data;

  // Sort descending
  const sorted = Object.entries(probs)
    .map(([abbrev, prob]) => ({ abbrev, prob, team: teams[abbrev] }))
    .sort((a, b) => b.prob - a.prob);

  const maxProb = sorted[0]?.prob ?? 1;
  const n = sorted.length;

  // SVG dimensions
  const BAR_AREA_H = 160;
  const LABEL_H = 40; // logo + abbrev row below bars
  const SVG_H = BAR_AREA_H + LABEL_H + 24; // 24px for pct labels above bars
  const COL_W = 100 / n; // percent width per column

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 100 ${SVG_H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: SVG_H * 5 + 'px', maxHeight: 280 }}
        aria-label="Championship probability bar chart"
      >
        {sorted.map(({ abbrev, prob, team }, i) => {
          const isWest = team?.conference === 'West';
          const color = isWest ? WEST_COLOR : EAST_COLOR;
          const barH = Math.max(0.5, (prob / maxProb) * BAR_AREA_H);
          const barY = 24 + (BAR_AREA_H - barH);
          const cx = i * COL_W + COL_W / 2;
          const pctLabel = prob < 0.005
            ? `${(prob * 100).toFixed(1)}%`
            : `${Math.round(prob * 100)}%`;

          return (
            <g key={abbrev}>
              {/* percentage label above bar */}
              <text
                x={cx}
                y={barY - 2}
                textAnchor="middle"
                fontSize="3.5"
                fill="#8fa3c1"
              >
                {pctLabel}
              </text>

              {/* bar */}
              <rect
                x={i * COL_W + COL_W * 0.1}
                y={barY}
                width={COL_W * 0.8}
                height={barH}
                fill={color}
                rx="0.8"
                ry="0"
              />

              {/* baseline */}
              <line
                x1={i * COL_W}
                y1={24 + BAR_AREA_H}
                x2={(i + 1) * COL_W}
                y2={24 + BAR_AREA_H}
                stroke="#2a3a54"
                strokeWidth="0.3"
              />

              {/* logo */}
              <image
                href={logoUrl(abbrev)}
                x={cx - 3.5}
                y={24 + BAR_AREA_H + 4}
                width="7"
                height="7"
              />

              {/* abbrev label */}
              <text
                x={cx}
                y={24 + BAR_AREA_H + 16}
                textAnchor="middle"
                fontSize="3"
                fill="#8fa3c1"
              >
                {abbrev}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-2 text-xs text-court-text">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: WEST_COLOR }} />
          West
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: EAST_COLOR }} />
          East
        </span>
      </div>
    </div>
  );
}
