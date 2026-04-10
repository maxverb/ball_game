import type { Cache, Metric } from '../types';
import { computePacing, type PeriodKey } from '../compute/pacing';
import { KpiCard } from './KpiCard';

interface Props {
  cache: Cache;
}

const METRICS: { metric: Metric; label: string }[] = [
  { metric: 'visits', label: 'Visits' },
  { metric: 'pageViews', label: 'Pageviews' },
  { metric: 'visitors', label: 'Visitors' },
];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'ytd', label: 'YTD' },
];

export function KpiGrid({ cache }: Props) {
  return (
    <div>
      {METRICS.map(({ metric, label }) => (
        <div key={metric}>
          <div className="kpi-grid-row-label">{label}</div>
          <div className="kpi-grid">
            {PERIODS.map((p) => {
              const pacing = computePacing(cache, metric, 'all', 'all', p.key);
              return (
                <KpiCard
                  key={p.key}
                  label={label}
                  periodLabel={p.label}
                  pacing={pacing}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
