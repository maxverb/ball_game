import { useEffect, useState, useCallback } from 'react';
import type { Cache } from './types';
import { getData, refresh as refreshApi } from './api';
import { Header } from './components/Header';
import { KpiGrid } from './components/KpiGrid';
import { TrendChart } from './components/TrendChart';
import { TrafficSplit } from './components/TrafficSplit';
import { SourceBreakdown } from './components/SourceBreakdown';
import { Projection } from './components/Projection';
import type { PeriodKey } from './compute/pacing';

export function App() {
  const [cache, setCache] = useState<Cache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getData()
      .then((res) => {
        if (!cancelled) {
          setCache(res.cache);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    refreshApi()
      .then((res) => {
        setCache(res.cache);
        setRefreshing(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setRefreshing(false);
      });
  }, []);

  return (
    <div className="app">
      <Header
        cache={cache}
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      {loading && <div className="banner loading">Cache laden / verversen…</div>}
      {error && <div className="banner error">Error: {error}</div>}
      {cache && cache.meta.fetchErrors.length > 0 && (
        <div className="banner error">
          Laatste fetch had {cache.meta.fetchErrors.length} fout(en):
          <ul>
            {cache.meta.fetchErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {cache && (
        <>
          <KpiGrid cache={cache} />
          <TrendChart cache={cache} period={period} />
          <div className="two-col">
            <TrafficSplit cache={cache} period={period} />
            <SourceBreakdown cache={cache} period={period} />
          </div>
          <Projection cache={cache} />
        </>
      )}
    </div>
  );
}
