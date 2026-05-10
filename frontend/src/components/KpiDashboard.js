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
  completed_tasks: 0,
  failed_tasks: 0,
  small_talk_messages: 0,
  software_tasks: 0,
  ai_success_rate: 0,
  average_completion_time_seconds: 0,
  average_ai_response_time_seconds: 0,
  average_human_validation_time_seconds: 0,
  validation_time_ratio: 0,
  test_pass_rate: 0,
  average_revision_count: 0,
  post_generation_modification_rate: 0,
  average_feedback_score: 0,
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
        label: 'Total Tasks',
        value: safeNumber(kpis.total_tasks).toLocaleString(),
        detail: 'All workflow records',
        icon: Gauge,
      },
      {
        label: 'Completed Tasks',
        value: safeNumber(kpis.completed_tasks).toLocaleString(),
        detail: 'Human marked complete',
        icon: CheckCircle2,
      },
      {
        label: 'Failed Tasks',
        value: safeNumber(kpis.failed_tasks).toLocaleString(),
        detail: 'Failed or rejected',
        icon: XCircle,
      },
      {
        label: 'AI Success Rate',
        value: `${formatNumber(kpis.ai_success_rate)}%`,
        detail: 'Successful AI tasks',
        icon: Gauge,
      },
      {
        label: 'Avg Completion Time',
        value: `${formatNumber(kpis.average_completion_time_seconds, 2)}s`,
        detail: 'End time minus start time',
        icon: Clock3,
      },
      {
        label: 'Avg AI Response Time',
        value: `${formatNumber(kpis.average_ai_response_time_seconds, 2)}s`,
        detail: 'Mean model time',
        icon: Clock3,
      },
      {
        label: 'Human Validation Time',
        value: `${formatNumber(kpis.average_human_validation_time_seconds, 2)}s`,
        detail: 'Generated to decision',
        icon: Clock3,
      },
      {
        label: 'Validation Time Ratio',
        value: formatNumber(kpis.validation_time_ratio, 2),
        detail: 'Validation time / response time',
        icon: Clock3,
      },
      {
        label: 'Test Pass Rate',
        value: `${formatNumber(kpis.test_pass_rate)}%`,
        detail: 'Passed tests / total tests',
        icon: TestTube2,
      },
      {
        label: 'Revision Count',
        value: formatNumber(kpis.average_revision_count, 2),
        detail: 'Average requested revisions',
        icon: GitCompareArrows,
      },
      {
        label: 'Modification Rate',
        value: `${formatNumber(kpis.post_generation_modification_rate)}%`,
        detail: 'Human-edited / AI lines',
        icon: GitCompareArrows,
      },
      {
        label: 'Feedback Score',
        value: formatNumber(kpis.average_feedback_score, 2),
        detail: 'Average human rating',
        icon: Star,
      },
      {
        label: 'Software Tasks',
        value: safeNumber(kpis.software_tasks).toLocaleString(),
        detail: 'AI-assisted tasks',
        icon: CheckCircle2,
      },
      {
        label: 'Small Talk',
        value: safeNumber(kpis.small_talk_messages).toLocaleString(),
        detail: 'No agent pipeline',
        icon: AlertTriangle,
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
