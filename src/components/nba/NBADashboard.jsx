/**
 * NBADashboard.jsx — Root React component for the NBA bracket dashboard.
 *
 * Layout mirrors the Streamlit reference dashboard exactly:
 *   Left panel  — Configuration + Model Specification + Model Performance
 *   Right panel — Title + stats header cards + Probability Mode toggle + Bracket
 *                 + Championship chart + Upset predictions (below fold)
 */

import { useState, useEffect } from 'react';
import BracketCanvas from './BracketCanvas.jsx';
import ProbabilityChart from './ProbabilityChart.jsx';
import UpsetPanel from './UpsetPanel.jsx';

// Window display labels
const WINDOW_LABELS = {
  full:   'Full',
  modern: 'Modern',
  recent: 'Recent',
};

// ---------------------------------------------------------------------------
// Derive top-N upset predictions from bracket data
// ---------------------------------------------------------------------------
function deriveUpsets(bracket, topN = 5) {
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
      underdogProb: 1 - m.top_win_prob,
    }))
    .sort((a, b) => b.underdogProb - a.underdogProb)
    .slice(0, topN);
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
// Left panel sub-components
// ---------------------------------------------------------------------------

/** Styled select dropdown that matches the sidebar dark theme. */
function SelectField({ label, value, options, onChange }) {
  return (
    <div className="mb-3">
      <p className="text-court-text text-xs mb-1">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md px-3 py-1.5 text-sm text-white border border-court-border cursor-pointer focus:outline-none focus:border-court-accent"
        style={{ background: '#0d1829' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: '#0d1829' }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Single feature chip pill (mirrors Streamlit button pills). */
function FeatureChip({ children }) {
  return (
    <span
      className="inline-block text-xs rounded-md px-2 py-0.5 mb-1.5 mr-1"
      style={{
        background: '#1a3052',
        color: '#8fa3c1',
        border: '1px solid #2a3a54',
        fontSize: '10px',
        fontWeight: 500,
        lineHeight: '1.6',
      }}
    >
      {children}
    </span>
  );
}

/** Section header inside the left sidebar. */
function SidebarHeader({ children }) {
  return (
    <p
      className="font-bold text-white mb-2 mt-4 first:mt-0"
      style={{ fontSize: '13px' }}
    >
      {children}
    </p>
  );
}

/** Key/value row inside the left sidebar. */
function SpecRow({ label, value }) {
  return (
    <p className="text-xs mb-1" style={{ color: '#8fa3c1' }}>
      <span style={{ color: '#c8d6e8', fontWeight: 600 }}>{label}:</span>{' '}
      {value ?? '—'}
    </p>
  );
}

/** Metric row inside the sidebar model-performance box. */
function PerfRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-court-border last:border-0">
      <span className="text-xs" style={{ color: '#8fa3c1' }}>{label}</span>
      <span className="text-xs font-mono font-semibold text-white">{value ?? '—'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right panel sub-components
// ---------------------------------------------------------------------------

/** One of the five header metric cards (Year / Window / Predicted Champ / …). */
function StatCard({ label, value }) {
  return (
    <div
      className="flex flex-col rounded-xl px-4 py-3 border border-court-border"
      style={{ background: '#1e2a45' }}
    >
      <span className="text-xs mb-1" style={{ color: '#8fa3c1', fontSize: '11px' }}>
        {label}
      </span>
      <span className="text-xl font-bold text-white leading-tight tracking-tight">
        {value}
      </span>
    </div>
  );
}

/** Section title (right panel). */
function SectionTitle({ children }) {
  return (
    <h2
      className="font-bold text-white mb-3 uppercase tracking-wide"
      style={{ fontSize: '11px', color: '#8fa3c1' }}
    >
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// NBADashboard
// ---------------------------------------------------------------------------
export default function NBADashboard() {
  const [index, setIndex]               = useState(null);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedWindow, setSelectedWindow] = useState('modern');
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const [probMode, setProbMode] = useState('Matchup Win %');

  // Load run index once on mount
  useEffect(() => {
    fetch('/data/index.json')
      .then((r) => r.json())
      .then(setIndex)
      .catch((e) => console.warn('Failed to load index:', e));
  }, []);

  // Fetch season data whenever year or window changes
  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/data/seasons/${selectedYear}_${selectedWindow}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [selectedYear, selectedWindow]);

  // Derive available years and windows from the index
  const availableYears = index
    ? [...new Set(index.runs.map((r) => r.year))].sort((a, b) => b - a)
    : [2025];

  const windowsForYear = index
    ? index.runs.filter((r) => r.year === selectedYear).map((r) => r.window)
    : ['full', 'modern', 'recent'];

  // If current window isn't available for the newly-selected year, reset to first available
  const handleYearChange = (yr) => {
    const y = Number(yr);
    const wins = index
      ? index.runs.filter((r) => r.year === y).map((r) => r.window)
      : ['full', 'modern', 'recent'];
    setSelectedYear(y);
    if (!wins.includes(selectedWindow)) setSelectedWindow(wins[0] ?? 'modern');
  };

  if (error) return <ErrorMessage message={error} />;
  if (!data)  return <LoadingSpinner />;

  const m = data.metadata;
  const season = m.season;

  // Predicted champion = team with highest championship probability
  const predictedChamp = Object.entries(data.championship_probs).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] ?? '—';

  // Use actual_champion from the data file; fall back to index lookup
  const actualChamp =
    data.actual_champion ??
    (index?.runs.find((r) => r.year === season && r.window === selectedWindow)?.actual_champion) ??
    '—';

  const windowShort = WINDOW_LABELS[selectedWindow] ?? selectedWindow;

  const simsLabel = m.n_simulations
    ? `${Math.round(m.n_simulations / 1000)}k`
    : '—';

  const upsets = deriveUpsets(data.bracket);

  return (
    <div className="flex gap-5 items-start">
      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <aside
        className="shrink-0 rounded-2xl p-4 border border-court-border"
        style={{ width: 232, background: '#1e2a45', boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}
      >
        {/* Configuration */}
        <SidebarHeader>Configuration</SidebarHeader>
        <SelectField
          label="Year"
          value={selectedYear}
          options={availableYears.map((y) => ({ value: y, label: String(y) }))}
          onChange={handleYearChange}
        />
        <SelectField
          label="Training Window"
          value={selectedWindow}
          options={windowsForYear.map((w) => ({ value: w, label: WINDOW_LABELS[w] ?? w }))}
          onChange={setSelectedWindow}
        />

        {/* Model Specification */}
        <SidebarHeader>Model Specification</SidebarHeader>
        <SpecRow label="Training window" value={m.training_window} />
        <div className="mt-1 mb-1">
          <p className="text-xs font-semibold mb-1" style={{ color: '#c8d6e8' }}>Features:</p>
          <div className="flex flex-wrap">
            {(m.features ?? []).map((f) => (
              <FeatureChip key={f}>{f}</FeatureChip>
            ))}
          </div>
        </div>

        {/* Model Performance */}
        <SidebarHeader>Model Performance</SidebarHeader>
        <div className="rounded-lg border border-court-border px-3 py-1" style={{ background: '#182338' }}>
          <PerfRow label="McFadden pseudo-R²" value={m.pseudo_r2?.toFixed(3)} />
          <PerfRow label="AUC-ROC" value={m.auc?.toFixed(3)} />
          <PerfRow label="Brier score" value={m.brier_score?.toFixed(3)} />
        </div>
      </aside>

      {/* ── Right main panel ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Page title */}
        <div>
          <h1 className="text-white font-bold text-2xl tracking-tight">
            NBA Playoff Prediction Model
          </h1>
          <p className="text-court-text text-sm mt-0.5">
            Monte Carlo bracket simulation
          </p>
        </div>

        {/* ── Stats header cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3">
          <StatCard label="Year" value={String(season)} />
          <StatCard label="Window" value={windowShort} />
          <StatCard label="Predicted Champion" value={predictedChamp} />
          <StatCard label="Actual Champion" value={actualChamp} />
          <StatCard label="Simulations" value={simsLabel} />
        </div>

        {/* ── Bracket ─────────────────────────────────────────────────── */}
        <div>
          {/* Probability Mode toggle */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: '#8fa3c1' }}>
              Probability Mode
            </p>
            <div className="flex gap-5">
              {['Matchup Win %', 'Championship %'].map((mode) => (
                <label
                  key={mode}
                  className="flex items-center gap-1.5 cursor-pointer text-sm"
                  style={{ color: probMode === mode ? '#ffffff' : '#8fa3c1' }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full border"
                    style={{
                      width: 14,
                      height: 14,
                      borderColor: probMode === mode ? '#ffffff' : '#4a6080',
                      background: probMode === mode ? '#ffffff' : 'transparent',
                      flexShrink: 0,
                    }}
                  >
                    {probMode === mode && (
                      <span
                        className="rounded-full"
                        style={{ width: 6, height: 6, background: '#0a1929' }}
                      />
                    )}
                  </span>
                  <input
                    type="radio"
                    name="probMode"
                    value={mode}
                    checked={probMode === mode}
                    onChange={() => setProbMode(mode)}
                    className="sr-only"
                  />
                  {mode}
                </label>
              ))}
            </div>
          </div>

          {/* Bracket canvas (horizontally scrollable on narrow viewports) */}
          <div
            className="relative overflow-x-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Right-edge fade hint on narrow viewports */}
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 lg:hidden"
              style={{ background: 'linear-gradient(to left, #0a1929 0%, transparent 100%)' }}
            />
            <div style={{ minWidth: 1260 }}>
              <BracketCanvas
                data={data}
                probMode={probMode}
              />
            </div>
          </div>
        </div>

        {/* ── Championship probabilities + Upsets (below fold) ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
          <div className="lg:col-span-2">
            <SectionTitle>Championship Probabilities</SectionTitle>
            <ProbabilityChart data={data} />
          </div>
          <div>
            <SectionTitle>Top Upset Predictions</SectionTitle>
            <UpsetPanel upsets={upsets} teams={data.teams} />
          </div>
        </div>
      </div>
    </div>
  );
}
