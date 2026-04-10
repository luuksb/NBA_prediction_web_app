/**
 * UpsetPanel.jsx — Top 5 upset predictions.
 *
 * Receives a pre-derived list of upset matchups from NBADashboard.
 * An "upset" is any matchup where the bottom_team (lower seed) has
 * a non-trivial win probability, sorted by bottom_team win probability
 * descending (highest underdog prob first).
 *
 * Props:
 *   upsets — array of { matchupId, round, topTeam, bottomTeam, topSeed,
 *             bottomSeed, underdogProb, conference } objects, pre-sorted.
 *   teams  — data.teams dict for color lookup.
 */

const ROUND_LABELS = {
  W_R1: 'West · R1',
  W_R2: 'West · R2',
  W_CF: 'West · Conf Finals',
  E_R1: 'East · R1',
  E_R2: 'East · R2',
  E_CF: 'East · Conf Finals',
  Finals: 'NBA Finals',
};

function roundLabel(matchupId) {
  // matchupId examples: "W_R1_1", "E_R2_2", "W_CF", "E_CF", "Finals"
  if (matchupId === 'Finals') return 'NBA Finals';
  const parts = matchupId.split('_');
  const key = parts.slice(0, 2).join('_'); // "W_R1", "E_CF", etc.
  return ROUND_LABELS[key] ?? matchupId;
}

function espnAbbrev(abbrev) {
  const MAP = {
    GSW: 'gs', NYK: 'ny', SAS: 'sa', NOP: 'no',
    UTA: 'utah', PHO: 'phx', WAS: 'wsh', BRK: 'bkn', CHO: 'cha',
  };
  return MAP[abbrev.toUpperCase()] ?? abbrev.toLowerCase();
}

function UpsetCard({ upset, teams }) {
  const underdog = teams[upset.bottomTeam];
  const favourite = teams[upset.topTeam];
  if (!underdog || !favourite) return null;

  const color = underdog.color_primary ?? '#1a3a5c';
  const pct = Math.round(upset.underdogProb * 100);

  return (
    <div className="flex items-center gap-3 bg-court-card rounded-lg px-3 py-2.5 border border-court-border">
      {/* Underdog logo */}
      <img
        src={`https://a.espncdn.com/i/teamlogos/nba/500/${espnAbbrev(upset.bottomTeam)}.png`}
        alt={upset.bottomTeam}
        className="w-8 h-8 object-contain flex-shrink-0"
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
      />

      {/* Matchup text */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">
          <span style={{ color }}>#{upset.bottomSeed} {upset.bottomTeam}</span>
          <span className="text-court-text"> over #{upset.topSeed} {upset.topTeam}</span>
        </p>
        <p className="text-court-text text-xs mt-0.5">{roundLabel(upset.matchupId)}</p>
      </div>

      {/* Probability badge */}
      <span
        className="text-sm font-bold flex-shrink-0 tabular-nums"
        style={{ color: pct >= 40 ? '#ffd700' : '#8fa3c1' }}
      >
        {pct}%
      </span>
    </div>
  );
}

export default function UpsetPanel({ upsets, teams }) {
  if (!upsets?.length) {
    return (
      <p className="text-court-text text-sm">No notable upsets predicted.</p>
    );
  }

  return (
    <div className="space-y-2">
      {upsets.map((u) => (
        <UpsetCard key={u.matchupId} upset={u} teams={teams} />
      ))}
    </div>
  );
}
