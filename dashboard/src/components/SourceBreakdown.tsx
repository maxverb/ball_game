import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import type { Cache, Metric } from '../types';
import { getPeriodRange, latestDate, type PeriodKey } from '../compute/pacing';

interface Props {
  cache: Cache;
  period: PeriodKey;
}

interface SourceAgg {
  source: string;
  value: number;
  isDiscover: boolean;
}

export function SourceBreakdown({ cache, period }: Props) {
  const [metric, setMetric] = useState<Metric>('visits');

  const sources: SourceAgg[] = useMemo(() => {
    const referenceIso = latestDate(cache) ?? cache.period.end;
    const range = getPeriodRange(period, referenceIso);
    const discoverKey = cache.meta.googleDiscoverSourceKey;

    const totals = new Map<string, number>();
    for (const r of cache.daily) {
      if (r.scope !== 'all') continue;
      if (r.source === 'all') continue; // skip overall bucket
      if (r.date < range.start || r.date > range.end) continue;
      totals.set(r.source, (totals.get(r.source) ?? 0) + r[metric]);
    }
    const arr: SourceAgg[] = Array.from(totals.entries()).map(([source, value]) => ({
      source,
      value,
      isDiscover: source === discoverKey,
    }));
    arr.sort((a, b) => b.value - a.value);
    // Always keep Discover even if it's not top-8.
    const top = arr.slice(0, 8);
    const discover = arr.find((s) => s.isDiscover);
    if (discover && !top.some((s) => s.isDiscover)) {
      top.pop();
      top.push(discover);
      top.sort((a, b) => b.value - a.value);
    }
    return top;
  }, [cache, metric, period]);

  const data = {
    labels: sources.map((s) => (s.isDiscover ? `★ ${s.source}` : s.source)),
    datasets: [
      {
        label: metric,
        data: sources.map((s) => s.value),
        backgroundColor: sources.map((s) => (s.isDiscover ? '#ffb84d' : '#6ea8ff')),
      },
    ],
  };

  return (
    <div className="panel">
      <h2>Top bronnen</h2>
      <div className="panel-controls">
        <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
          <option value="visits">Visits</option>
          <option value="pageViews">Pageviews</option>
          <option value="visitors">Visitors</option>
        </select>
      </div>
      <div className="chart-wrap-sm">
        {sources.length === 0 ? (
          <div style={{ color: '#9aa3c2' }}>Geen source data in deze periode.</div>
        ) : (
          <Bar
            data={data}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { ticks: { color: '#9aa3c2' }, grid: { color: '#28335a' } },
                y: { ticks: { color: '#9aa3c2' }, grid: { color: '#28335a' } },
              },
              plugins: { legend: { display: false } },
            }}
          />
        )}
      </div>
    </div>
  );
}
