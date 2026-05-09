import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Coins,
  Gauge,
  GitCompareArrows,
  Loader2,
  RefreshCw,
  Star,
  TestTube2,
  XCircle,
} from 'lucide-react';
import apiService from '../services/apiService.js';

const defaultKpis = {
  total_tasks: 0,
  successful_tasks: 0,
  failed_tasks: 0,
  success_rate: 0,
  average_response_time: 0,
  average_validation_time: 0,
  validation_time_ratio: 0,
  average_test_pass_rate: 0,
  average_user_feedback_score: 0,
  average_post_generation_modification_rate: 0,
  average_cost_per_task: 0,
};

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value, decimals = 1) => safeNumber(value).toFixed(decimals);

const KpiDashboard = () => {
  const [kpis, setKpis] = useState(defaultKpis);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadKpis = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiService.getKpis();
      setKpis({ ...defaultKpis, ...data });
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpis();
  }, []);

  const cards = useMemo(
    () => [
      {
        label: 'Total AI Tasks',
        value: safeNumber(kpis.total_tasks).toLocaleString(),
        detail: 'All tracked generations',
        icon: Gauge,
      },
      {
        label: 'Successful Tasks',
        value: safeNumber(kpis.successful_tasks).toLocaleString(),
        detail: 'Completed without model errors',
        icon: CheckCircle2,
      },
      {
        label: 'Failed Tasks',
        value: safeNumber(kpis.failed_tasks).toLocaleString(),
        detail: 'Timed out or errored',
        icon: XCircle,
      },
      {
        label: 'Success Rate',
        value: `${formatNumber(kpis.success_rate)}%`,
        detail: 'Successful / total tasks',
        icon: Gauge,
      },
      {
        label: 'Average Response Time',
        value: `${formatNumber(kpis.average_response_time, 2)}s`,
        detail: 'Mean AI workflow time',
        icon: Clock3,
      },
      {
        label: 'Validation Time Ratio',
        value: `${formatNumber(kpis.validation_time_ratio)}%`,
        detail: 'Validation time / response time',
        icon: Clock3,
      },
      {
        label: 'Test Pass Rate',
        value: `${formatNumber(kpis.average_test_pass_rate)}%`,
        detail: 'Passed tests / total tests',
        icon: TestTube2,
      },
      {
        label: 'User Feedback Score',
        value: formatNumber(kpis.average_user_feedback_score, 2),
        detail: 'Average human rating',
        icon: Star,
      },
      {
        label: 'Modification Rate',
        value: `${formatNumber(kpis.average_post_generation_modification_rate)}%`,
        detail: 'Human-edited / AI lines',
        icon: GitCompareArrows,
      },
      {
        label: 'Cost per Task',
        value: `$${formatNumber(kpis.average_cost_per_task, 4)}`,
        detail: 'Estimated model cost',
        icon: Coins,
      },
    ],
    [kpis]
  );

  return (
    <div className="kpi-dashboard">
      <div className="kpi-header">
        <div>
          <p className="eyebrow">Evaluation layer</p>
          <h2>KPI Dashboard</h2>
          <p>
            Monitor whether AI-generated work is fast, successful, validated, and supervised.
          </p>
        </div>
        <button className="secondary-button dashboard-refresh" type="button" onClick={loadKpis}>
          <RefreshCw size={16} strokeWidth={2} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="dashboard-state">
          <Loader2 className="spin" size={20} strokeWidth={2.2} />
          Loading KPI data...
        </div>
      )}

      {!loading && error && (
        <div className="dashboard-state error">
          <AlertTriangle size={20} strokeWidth={2.2} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="kpi-grid">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <article className="kpi-card" key={card.label}>
                  <div className="kpi-icon">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <div className="kpi-card-copy">
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <p>{card.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="kpi-footnote">
            Missing validation, feedback, or modification values are treated as safe defaults.
            {lastUpdated && (
              <span> Last refreshed at {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default KpiDashboard;
