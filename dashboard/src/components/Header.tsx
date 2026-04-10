import type { Cache } from '../types';
import type { PeriodKey } from '../compute/pacing';

interface Props {
  cache: Cache | null;
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'ytd', label: 'YTD' },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Header({ cache, period, onPeriodChange, onRefresh, refreshing }: Props) {
  return (
    <div className="header">
      <div>
        <div className="header-title">
          Piano Analytics Dashboard {cache ? `— site ${cache.siteId}` : ''}
        </div>
        <div className="header-meta">
          Laatst ververst: {formatDate(cache?.generatedAt)}
          {cache?.meta.fetchErrors?.length
            ? ` · ${cache.meta.fetchErrors.length} fetch error(s)`
            : ''}
        </div>
      </div>

      <div className="period-selector">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={p.key === period ? 'active' : ''}
            onClick={() => onPeriodChange(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button className="refresh-btn" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? 'Refreshing…' : 'Refresh now'}
      </button>
    </div>
  );
}
