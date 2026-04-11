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

const MAX_BAR_H = 160;
// Minimum pixel width per team column — ensures bars never overlap at any viewport
const MIN_COL_W = 32;

export default function ProbabilityChart({ data }) {
  const { championship_probs: probs, teams } = data;

  // Sort descending
  const sorted = Object.entries(probs)
    .map(([abbrev, prob]) => ({ abbrev, prob, team: teams[abbrev] }))
    .sort((a, b) => b.prob - a.prob);

  const maxProb = sorted[0]?.prob ?? 1;

  return (
    <div className="w-full overflow-x-auto">
      {/* minWidth prevents columns from squishing below MIN_COL_W each */}
      <div style={{ minWidth: sorted.length * MIN_COL_W }}>
        {/* Bars row — fixed height, bars align to bottom baseline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            width: '100%',
            height: MAX_BAR_H + 22,
            borderBottom: '1px solid #2a3a54',
          }}
        >
          {sorted.map(({ abbrev, prob, team }) => {
            const isWest = team?.conference === 'West';
            const color = isWest ? WEST_COLOR : EAST_COLOR;
            const barH = Math.max(2, Math.round((prob / maxProb) * MAX_BAR_H));
            const pctLabel = prob < 0.005
              ? `${(prob * 100).toFixed(1)}%`
              : `${Math.round(prob * 100)}%`;
            return (
              <div
                key={abbrev}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, padding: '0 1px' }}
              >
                <span style={{ fontSize: 9, color: '#8fa3c1', marginBottom: 2, whiteSpace: 'nowrap' }}>
                  {pctLabel}
                </span>
                <div style={{ width: '80%', height: barH, background: color, borderRadius: '4px 4px 0 0' }} />
              </div>
            );
          })}
        </div>

        {/* Logo + abbrev row */}
        <div style={{ display: 'flex', width: '100%', marginTop: 4 }}>
          {sorted.map(({ abbrev }) => (
            <div
              key={abbrev}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, padding: '0 1px' }}
            >
              <img
                src={logoUrl(abbrev)}
                alt={abbrev}
                style={{ width: 22, height: 22, objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              <span style={{ fontSize: 8, color: '#8fa3c1', marginTop: 1 }}>{abbrev}</span>
            </div>
          ))}
        </div>
      </div>

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
