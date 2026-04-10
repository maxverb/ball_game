import type { PacingResult } from '../compute/pacing';
import { formatNumber } from '../compute/pacing';

interface Props {
  label: string;
  periodLabel: string;
  pacing: PacingResult;
}

function PercentRing({ pct }: { pct: number | null }) {
  const size = 42;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = pct == null ? 0 : Math.max(0, Math.min(pct, 100));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <svg className="kpi-ring" viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#28335a"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#6ea8ff"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 3}
        textAnchor="middle"
        fontSize="10"
        fill="#e8ecf7"
        fontWeight="600"
      >
        {pct == null ? '—' : `${Math.round(pct)}%`}
      </text>
    </svg>
  );
}

export function KpiCard({ label, periodLabel, pacing }: Props) {
  const badgeClass =
    pacing.onPace === 'good'
      ? 'good'
      : pacing.onPace === 'warn'
        ? 'warn'
        : pacing.onPace === 'bad'
          ? 'bad'
          : '';
  const badgeLabel =
    pacing.onPace === 'none'
      ? 'no goal'
      : pacing.onPace === 'good'
        ? 'on pace'
        : pacing.onPace === 'warn'
          ? 'behind'
          : 'off pace';
  return (
    <div className="kpi-card">
      <div className="kpi-card-period">
        {label} · {periodLabel}
      </div>
      <div className="kpi-card-actual">{formatNumber(pacing.actual)}</div>
      <div className="kpi-card-goal">
        {pacing.target != null
          ? `Doel: ${formatNumber(pacing.target)}`
          : 'Geen doel ingesteld'}
      </div>
      <div className="kpi-card-footer">
        <PercentRing pct={pacing.pctOfGoal} />
        <span className={`pace-badge ${badgeClass}`}>{badgeLabel}</span>
      </div>
    </div>
  );
}
