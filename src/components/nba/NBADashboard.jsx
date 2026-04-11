/**
 * NBADashboard.jsx — Root React component for the NBA bracket dashboard.
 *
 * Layout mirrors the Streamlit reference dashboard exactly:
 *   Left panel  — Configuration + Model Specification + Model Performance
 *   Right panel — Title + stats header cards + Probability Mode toggle + Bracket
 *                 + Championship chart + Upset predictions (below fold)
 */

import { useState, useEffect, useRef } from 'react';
import BracketCanvas from './BracketCanvas.jsx';
import ProbabilityChart from './ProbabilityChart.jsx';

// Window display labels
const WINDOW_LABELS = {
  full:   'Full',
  modern: 'Modern',
  recent: 'Recent',
};

// Hardcoded observations per training window
const N_OBS = { full: 659, modern: 375, recent: 165 };

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
        background: '#182338',
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

/** In-Sample Fit table shown below Model Performance. */
function InSampleFitSection({ nbaResults }) {
  if (!nbaResults) return null;
  const windows = ['full', 'modern', 'recent'];
  const CAPS = { full: 'Full', modern: 'Modern', recent: 'Recent' };
  return (
    <>
      <SidebarHeader>In-Sample Fit</SidebarHeader>
      <div className="rounded-lg border border-court-border overflow-hidden" style={{ background: '#182338' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#253350', borderBottom: '1px solid #2a3a54' }}>
              <th style={{ width: '42%', padding: '4px 6px', textAlign: 'left', color: '#8fa3c1', fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>Window</th>
              <th style={{ width: '29%', padding: '4px 6px', textAlign: 'right', color: '#8fa3c1', fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>Series</th>
              <th style={{ width: '29%', padding: '4px 6px', textAlign: 'right', color: '#8fa3c1', fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>Champs</th>
            </tr>
          </thead>
          <tbody>
            {windows.map((w) => {
              const tw = nbaResults.training_windows?.[w];
              if (!tw) return null;
              const { correct_series: cs, total_series: ts, correct_champs: cc, total_champs: tc } = tw.insample_fit;
              const sPct = `${Math.round((cs / ts) * 100)}%`;
              const cPct = tc > 0 ? `${Math.round((cc / tc) * 100)}%` : '—';
              return (
                <tr key={w} style={{ borderBottom: '1px solid #1e2a45' }}>
                  <td style={{ padding: '4px 6px', color: '#8fa3c1', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {CAPS[w]} ({tw.window_span})
                  </td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', color: '#e8f0fb', fontSize: '10px', whiteSpace: 'nowrap' }}>
                    {cs}/{ts} <span style={{ color: '#8fa3c1' }}>({sPct})</span>
                  </td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', color: '#e8f0fb', fontSize: '10px', whiteSpace: 'nowrap' }}>
                    {cc}/{tc} <span style={{ color: '#8fa3c1' }}>({cPct})</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Injury Impact module — only renders when injury_impact data is present (2025+). */
function InjuryImpactSection({ injuryData }) {
  if (!injuryData) return null;
  const { pct_finals_with_injury, healthy_finalist_win_rate, pct_champ_with_injury } = injuryData;
  const fmt = (v) => `${Math.round(v * 100)}%`;
  const items = [
    `${fmt(pct_finals_with_injury)} of Finals have 1+ injured star`,
    `Healthy finalist wins ${fmt(healthy_finalist_win_rate)} of 1-sided injury matchups`,
    `Champion overcame an injury in ${fmt(pct_champ_with_injury)} of all simulated Finals`,
  ];
  return (
    <>
      <SidebarHeader>Injury Impact*</SidebarHeader>
      <p style={{ fontSize: '9px', color: '#8fa3c1', marginTop: '-6px', marginBottom: '6px' }}>
        * Out-of-sample (2025–2026) only
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              background: '#182338',
              color: '#8fa3c1',
              border: '1px solid #2a3a54',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: '10px',
              lineHeight: '1.5',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </>
  );
}

/** Longest Shots: 3 teams with lowest nonzero championship probability. */
function LongestShots({ data }) {
  const { championship_probs: probs, teams, metadata: m } = data;
  const nSims = m.n_simulations;

  const shots = Object.entries(probs)
    .filter(([, v]) => v > 0)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([abbrev, prob]) => ({ abbrev, prob, team: teams[abbrev] }));

  if (!shots.length) return <p className="text-court-text text-sm">No data.</p>;

  return (
    <div>
      {shots.map(({ abbrev, prob, team }) => {
        const nWins = Math.round(prob * nSims);
        const pctLabel = (prob * 100).toFixed(3) + '%';
        return (
          <div key={abbrev} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#8fa3c1', marginBottom: 1 }}>
              {team?.name ?? abbrev}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>
              {pctLabel}
            </div>
            <div style={{ fontSize: 11, color: '#ffffff', marginTop: 2 }}>
              {nWins.toLocaleString()} / {nSims.toLocaleString()} sims
            </div>
          </div>
        );
      })}
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
  const [nbaResults, setNbaResults] = useState(null);
  const bracketRef = useRef(null);
  const [bracketScale, setBracketScale] = useState(1);

  // Load run index once on mount
  useEffect(() => {
    fetch('/data/index.json')
      .then((r) => r.json())
      .then(setIndex)
      .catch((e) => console.warn('Failed to load index:', e));
  }, []);

  // Load global model results (in-sample fit) once on mount
  useEffect(() => {
    fetch('/data/nba_results.json')
      .then((r) => r.json())
      .then(setNbaResults)
      .catch((e) => console.warn('Failed to load nba_results:', e));
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

  // Scale bracket to available container width
  useEffect(() => {
    const el = bracketRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setBracketScale(w / 1260);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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

  return (
    <div className="flex gap-5 items-start">
      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <aside
        className="shrink-0 rounded-2xl p-4 border border-court-border"
        style={{ width: 320, background: '#1e2a45', boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}
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
        <SpecRow label="Observations (N)" value={N_OBS[selectedWindow]} />
        <div className="mt-1 mb-1">
          <p className="text-xs font-semibold mb-1" style={{ color: '#c8d6e8' }}>Features:</p>
          <div className="flex flex-wrap">
            {(m.features ?? []).map((f) => {
              const coef = m.coefficients?.[f];
              const coefStr = coef != null
                ? ` (${coef >= 0 ? '+' : ''}${coef.toFixed(4)})`
                : '';
              return <FeatureChip key={f}>{f}{coefStr}</FeatureChip>;
            })}
          </div>
        </div>

        {/* Model Performance */}
        <SidebarHeader>Model Performance</SidebarHeader>
        <div className="rounded-lg border border-court-border px-3 py-1" style={{ background: '#182338' }}>
          <PerfRow label="McFadden pseudo-R²" value={m.pseudo_r2?.toFixed(3)} />
          <PerfRow label="AUC-ROC" value={m.auc?.toFixed(3)} />
          <PerfRow label="Brier score" value={m.brier_score?.toFixed(3)} />
        </div>

        {/* In-Sample Fit */}
        <InSampleFitSection nbaResults={nbaResults} />

        {/* Injury Impact (2025+ only) */}
        <InjuryImpactSection injuryData={data.injury_impact} />
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

          {/* Bracket canvas — scales fluidly to container width */}
          <div
            ref={bracketRef}
            style={{
              width: '100%',
              overflow: 'hidden',
              position: 'relative',
              height: Math.round(520 * bracketScale),
            }}
          >
            <div
              style={{
                transform: `scale(${bracketScale})`,
                transformOrigin: 'top left',
                width: 1260,
              }}
            >
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
            <SectionTitle>Longest Shots</SectionTitle>
            <LongestShots data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
