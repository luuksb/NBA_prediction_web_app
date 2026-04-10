/**
 * ModelMetrics.jsx — Model metadata and data freshness panel.
 *
 * Reads from data.metadata. Prominent freshness indicator at the top
 * signals to the analytics audience that the model is real, not a mockup.
 */

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-court-border last:border-0">
      <span className="text-court-text text-xs">{label}</span>
      <span className="text-white text-xs font-mono font-semibold">{value ?? '—'}</span>
    </div>
  );
}

function fmt(n, decimals = 3) {
  if (n == null) return '—';
  return Number(n).toFixed(decimals);
}

export default function ModelMetrics({ data }) {
  const m = data.metadata;

  const generatedAt = m.generated_at
    ? new Date(m.generated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const featureLabels = {
    delta_bpm_avail_sum: 'BPM (availability-weighted)',
    delta_playoff_series_wins: 'Playoff series wins',
    delta_ts_percent: 'True shooting %',
    delta_star_flag: 'Star player flag',
  };

  const featureDisplay = m.features
    ?.map((f) => featureLabels[f] ?? f)
    .join(', ');

  return (
    <div className="space-y-4">
      {/* Freshness indicator */}
      <div className="bg-court-card rounded-lg px-4 py-3 border border-court-border">
        <p className="text-court-accent text-xs font-semibold uppercase tracking-wider mb-1">
          Model run
        </p>
        <p className="text-white text-sm font-medium">
          {generatedAt ?? '—'}
          {' · '}
          {m.n_simulations?.toLocaleString() ?? '—'} simulations
          {' · '}
          {m.training_window ?? '—'} training window
        </p>
      </div>

      {/* Model performance */}
      <div className="bg-court-card rounded-lg px-4 py-2 border border-court-border">
        <p className="text-court-text text-xs font-semibold uppercase tracking-wider mb-1 pt-1">
          Model performance
        </p>
        <MetricRow label="McFadden pseudo-R²" value={fmt(m.pseudo_r2)} />
        <MetricRow label="AUC-ROC" value={fmt(m.auc)} />
        <MetricRow label="Brier score" value={fmt(m.brier_score)} />
      </div>

      {/* Model spec */}
      <div className="bg-court-card rounded-lg px-4 py-2 border border-court-border">
        <p className="text-court-text text-xs font-semibold uppercase tracking-wider mb-1 pt-1">
          Model specification
        </p>
        <MetricRow label="Features" value={featureDisplay} />
        <MetricRow label="Training window" value={m.training_window} />
        <MetricRow label="Simulations" value={m.n_simulations?.toLocaleString()} />
      </div>
    </div>
  );
}
