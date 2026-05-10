import React from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  FilePenLine,
  GitBranch,
  RotateCcw,
  ShieldCheck,
  XCircle
} from 'lucide-react';

const formatLabel = (value) => String(value || 'unknown').replace(/_/g, ' ');

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getActions = (task) => {
  const status = task?.status;

  if (status === 'waiting_human_approval' || status === 'revision_requested') {
    return [
      { id: 'approve-plan', label: 'Approve Plan', icon: CheckCircle2, variant: 'primary' },
      { id: 'edit-plan', label: 'Edit Plan', icon: FilePenLine, variant: 'secondary' },
      { id: 'request-revision', label: 'Request Revision', icon: RotateCcw, variant: 'secondary' },
      { id: 'reject-output', label: 'Reject', icon: XCircle, variant: 'danger' },
    ];
  }

  if (status === 'under_human_review' || status === 'ai_generated' || status === 'review_generated') {
    return [
      { id: 'approve-output', label: 'Approve Output', icon: ShieldCheck, variant: 'primary' },
      { id: 'request-revision', label: 'Request Revision', icon: RotateCcw, variant: 'secondary' },
      { id: 'complete', label: 'Mark Completed', icon: CheckCircle2, variant: 'primary' },
      { id: 'reject-output', label: 'Reject', icon: XCircle, variant: 'danger' },
    ];
  }

  if (status === 'validated') {
    return [
      { id: 'complete', label: 'Mark Completed', icon: CheckCircle2, variant: 'primary' },
      { id: 'request-revision', label: 'Request Revision', icon: RotateCcw, variant: 'secondary' },
    ];
  }

  return [];
};

const WorkflowPanel = ({ task, onAction, disabled }) => {
  const actions = getActions(task);
  const events = task?.events || [];

  return (
    <div className="workflow-panel">
      <div className="workflow-meta-row">
        <span className="workflow-pill intent">
          <GitBranch size={14} strokeWidth={2} />
          {formatLabel(task?.intent)}
        </span>
        <span className={`workflow-pill status ${task?.status || 'unknown'}`}>
          <Clock3 size={14} strokeWidth={2} />
          {formatLabel(task?.status)}
        </span>
      </div>

      {task?.message && (
        <div className="workflow-message">
          <CircleAlert size={16} strokeWidth={2} />
          <span>{task.message}</span>
        </div>
      )}

      {actions.length > 0 && (
        <div className="workflow-actions">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                className={`${action.variant}-button compact`}
                type="button"
                disabled={disabled}
                onClick={() => onAction?.(action.id, task)}
              >
                <Icon size={15} strokeWidth={2.2} />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <ol className="workflow-timeline">
          {events.map((event) => (
            <li key={event.event_id || `${event.action}-${event.timestamp}`}>
              <span className={`event-dot ${event.actor_type}`} />
              <div>
                <strong>{event.actor_name}</strong>
                <span>{formatLabel(event.action)}</span>
                <time>{formatTime(event.timestamp)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default WorkflowPanel;
