/**
 * NBADashboard.jsx — Root React component for the NBA bracket dashboard.
 *
 * Fetches /data/nba_results.json on mount, derives upset predictions,
 * and distributes data to child components.
 */

import { useState, useEffect } from 'react';
import BracketCanvas from './BracketCanvas.jsx';
import ProbabilityChart from './ProbabilityChart.jsx';
import ModelMetrics from './ModelMetrics.jsx';
import UpsetPanel from './UpsetPanel.jsx';

// ---------------------------------------------------------------------------
// Derive top-N upset predictions from bracket data
// ---------------------------------------------------------------------------
function deriveUpsets(bracket, teams, topN = 5) {
  const matchups = [];

  for (const conf of ['West', 'East']) {
    for (const rnd of ['R1', 'R2', 'CF']) {
      for (const m of bracket[conf][rnd]) {
        matchups.push({ ...m, conference: conf });
      }
    }
  }
  matchups.push({ ...bracket.Finals, conference: 'Finals' });

  return matchups
    .map((m) => ({
      matchupId: m.matchup_id,
      conference: m.conference,
      topTeam: m.top_team,
      bottomTeam: m.bottom_team,
      topSeed: m.top_seed,
      bottomSeed: m.bottom_seed,
      // Underdog = bottom_team (lower seed). Their probability = 1 - top_win_prob.
      underdogProb: 1 - m.top_win_prob,
    }))
    .sort((a, b) => b.underdogProb - a.underdogProb)
    .slice(0, topN);
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-white text-base font-bold mb-3 tracking-wide uppercase text-sm">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Loading / error states
// ---------------------------------------------------------------------------
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-2 border-court-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-court-text text-sm">Loading bracket data…</p>
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-2">
      <p className="text-red-400 font-semibold">Failed to load data</p>
      <p className="text-court-text text-sm">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NBADashboard
// ---------------------------------------------------------------------------
export default function NBADashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/data/nba_results.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorMessage message={error} />;
  if (!data) return <LoadingSpinner />;

  const upsets = deriveUpsets(data.bracket, data.teams);
  const season = data.metadata.season;

  return (
    <div className="space-y-10">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="border-b border-court-border pb-6">
        <h1 className="text-white text-2xl font-bold tracking-tight">
          {season} NBA Playoff Predictions
        </h1>
        <p className="text-court-text text-sm mt-1">
          Monte Carlo bracket simulation ·{' '}
          {data.metadata.n_simulations?.toLocaleString()} iterations ·{' '}
          {data.metadata.training_window} training window
        </p>
      </div>

      {/* ── Bracket (horizontally scrollable on mobile) ─────────── */}
      <Section title="Bracket">
        <div
          className="overflow-x-auto -webkit-overflow-scrolling-touch relative"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Scroll hint: right-edge fade on narrow viewports */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 lg:hidden"
            style={{
              background:
                'linear-gradient(to left, #1a2035 0%, transparent 100%)',
            }}
          />
          <div style={{ minWidth: 1260 }}>
            <BracketCanvas data={data} />
          </div>
        </div>
      </Section>

      {/* ── Two-column panels ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Championship probability chart */}
        <div className="lg:col-span-2">
          <Section title="Championship Probabilities">
            <ProbabilityChart data={data} />
          </Section>
        </div>

        {/* Model metrics */}
        <div>
          <Section title="Model Info">
            <ModelMetrics data={data} />
          </Section>
        </div>
      </div>

      {/* ── Upset predictions ───────────────────────────────────── */}
      <Section title="Top Upset Predictions">
        <UpsetPanel upsets={upsets} teams={data.teams} />
      </Section>
    </div>
  );
}
