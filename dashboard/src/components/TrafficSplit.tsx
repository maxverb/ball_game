import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import type { Cache, Metric } from '../types';
import { getPeriodRange, latestDate, sumMetric, type PeriodKey } from '../compute/pacing';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Props {
  cache: Cache;
  period: PeriodKey;
}

export function TrafficSplit({ cache, period }: Props) {
  const [metric, setMetric] = useState<Metric>('visits');

  const data = useMemo(() => {
    const referenceIso = latestDate(cache) ?? cache.period.end;
    const range = getPeriodRange(period, referenceIso);
    const web = sumMetric(cache.daily, metric, 'web', 'all', range.start, range.end);
    const app = sumMetric(cache.daily, metric, 'app', 'all', range.start, range.end);
    return {
      labels: [range.label],
      datasets: [
        {
          label: 'Web',
          data: [web],
          backgroundColor: '#6ea8ff',
        },
        {
          label: 'App',
          data: [app],
          backgroundColor: '#9a7aff',
        },
      ],
    };
  }, [cache, metric, period]);

  return (
    <div className="panel">
      <h2>Web vs. App</h2>
      <div className="panel-controls">
        <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
          <option value="visits">Visits</option>
          <option value="pageViews">Pageviews</option>
          <option value="visitors">Visitors</option>
        </select>
      </div>
      <div className="chart-wrap-sm">
        <Bar
          data={data}
          options={{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                stacked: true,
                ticks: { color: '#9aa3c2' },
                grid: { color: '#28335a' },
              },
              y: {
                stacked: true,
                ticks: { color: '#9aa3c2' },
                grid: { color: '#28335a' },
              },
            },
            plugins: {
              legend: { labels: { color: '#9aa3c2' } },
            },
          }}
        />
      </div>
    </div>
  );
}
