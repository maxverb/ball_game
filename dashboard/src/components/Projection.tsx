import type { Cache, Metric } from '../types';
import { computePacing, formatNumber } from '../compute/pacing';

interface Props {
  cache: Cache;
}

const METRICS: { metric: Metric; label: string }[] = [
  { metric: 'visits', label: 'visits' },
  { metric: 'pageViews', label: 'pageviews' },
  { metric: 'visitors', label: 'visitors' },
];

export function Projection({ cache }: Props) {
  const lines = METRICS.map(({ metric, label }) => {
    const pacing = computePacing(cache, metric, 'all', 'all', 'month');
    if (pacing.target == null || pacing.projectedEnd == null) {
      return (
        <div key={metric} className="projection-line">
          Geen maand-doel ingesteld voor <strong>{label}</strong>.
        </div>
      );
    }
    const projectedPct = Math.round((pacing.projectedEnd / pacing.target) * 100);
    return (
      <div key={metric} className="projection-line">
        Op huidig tempo haal je <strong>{projectedPct}%</strong> van je maand-doel voor{' '}
        <strong>{label}</strong> ({formatNumber(pacing.projectedEnd)} vs{' '}
        {formatNumber(pacing.target)}). Op dag {pacing.daysElapsed} van {pacing.daysTotal}.
      </div>
    );
  });

  return (
    <div className="panel">
      <h2>Projectie (maand)</h2>
      <div className="projection-strip">{lines}</div>
    </div>
  );
}
