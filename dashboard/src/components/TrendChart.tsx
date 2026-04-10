import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { Cache, Metric } from '../types';
import {
  findGoal,
  getPeriodRange,
  latestDate,
  type PeriodKey,
} from '../compute/pacing';

Chart.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

interface Props {
  cache: Cache;
  period: PeriodKey;
}

const METRIC_LABEL: Record<Metric, string> = {
  visits: 'Visits',
  pageViews: 'Pageviews',
  visitors: 'Visitors',
};

function* dateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    yield d.toISOString().slice(0, 10);
  }
}

export function TrendChart({ cache, period }: Props) {
  const [metric, setMetric] = useState<Metric>('visits');

  const data = useMemo(() => {
    const referenceIso = latestDate(cache) ?? cache.period.end;
    const range = getPeriodRange(period, referenceIso);
    const labels = Array.from(dateRange(range.start, range.end));

    const dailyMap = new Map<string, number>();
    for (const r of cache.daily) {
      if (r.scope !== 'all' || r.source !== 'all') continue;
      dailyMap.set(r.date, r[metric]);
    }
    const actual = labels.map((d) =>
      dailyMap.has(d) && d <= referenceIso ? dailyMap.get(d)! : null,
    );

    const goal = findGoal(cache.goals, metric, 'all', 'all',
      period === 'today' ? 'daily' : period === 'week' ? 'weekly' : period === 'month' ? 'monthly' : 'yearly',
      referenceIso);
    const target = goal?.target ?? null;
    // Straight-line goal pacing from 0 to target across labels.
    const pacingLine: (number | null)[] = labels.map((_, i) => {
      if (target == null) return null;
      return (target * (i + 1)) / labels.length;
    });

    return {
      labels,
      datasets: [
        {
          label: METRIC_LABEL[metric] + ' (actual cumulatief)',
          data: actual.reduce<(number | null)[]>((acc, v, i) => {
            if (v == null) {
              acc.push(acc[i - 1] ?? null);
            } else {
              acc.push((acc[i - 1] ?? 0) + v);
            }
            return acc;
          }, []),
          borderColor: '#6ea8ff',
          backgroundColor: 'rgba(110, 168, 255, 0.15)',
          fill: true,
          tension: 0.25,
        },
        {
          label: 'Goal pacing',
          data: pacingLine,
          borderColor: '#9a7aff',
          borderDash: [6, 4],
          backgroundColor: 'transparent',
          fill: false,
          pointRadius: 0,
        },
      ],
    };
  }, [cache, metric, period]);

  return (
    <div className="panel">
      <h2>Trend</h2>
      <div className="panel-controls">
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as Metric)}
        >
          <option value="visits">Visits</option>
          <option value="pageViews">Pageviews</option>
          <option value="visitors">Visitors</option>
        </select>
      </div>
      <div className="chart-wrap">
        <Line
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#9aa3c2' } },
              tooltip: { mode: 'index', intersect: false },
            },
            scales: {
              x: { ticks: { color: '#9aa3c2' }, grid: { color: '#28335a' } },
              y: { ticks: { color: '#9aa3c2' }, grid: { color: '#28335a' } },
            },
          }}
        />
      </div>
    </div>
  );
}
