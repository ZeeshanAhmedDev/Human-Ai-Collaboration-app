import React, { useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  CircleDashed,
  Code2,
  ClipboardList,
  FileText,
  FileSearch,
  FlaskConical,
  MonitorDot,
  UserRound
} from 'lucide-react';
import WorkflowPanel from './WorkflowPanel.js';

const agentMeta = {
  planner: {
    label: 'Planner',
    role: 'Architecture plan',
    icon: ClipboardList
  },
  developer: {
    label: 'Developer',
    role: 'Implementation',
    icon: Code2
  },
  tester: {
    label: 'Tester',
    role: 'Test strategy',
    icon: FlaskConical
  },
  reviewer: {
    label: 'Reviewer',
    role: 'Quality review',
    icon: FileSearch
  },
  system: {
    label: 'System',
    role: 'Status update',
    icon: MonitorDot
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const renderContent = (content) => {
  const text = String(content || '');
  const parts = text.split('```');

  if (parts.length === 1) {
    return <p>{text}</p>;
  }

  return parts.map((part, index) => {
    if (index % 2 === 0) {
      return part ? <p key={`text-${index}`}>{part}</p> : null;
    }

    const [firstLine, ...rest] = part.replace(/^\n/, '').split('\n');
    const hasLanguage = /^[a-z0-9+#.-]+$/i.test(firstLine.trim()) && rest.length > 0;
    const code = hasLanguage ? rest.join('\n') : part.trim();
    const language = hasLanguage ? firstLine.trim() : 'code';

    return (
      <div className="code-shell" key={`code-${index}`}>
        <div className="code-label">{language}</div>
        <pre className="code-block">{code}</pre>
      </div>
    );
  });
};

const formatAttachmentSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MessageBubble = ({ message, onWorkflowAction, actionsDisabled }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const content = String(message.content || '');
  const meta = agentMeta[message.agent] || agentMeta.system;
  const isUser = message.type === 'user';
  const Icon = isUser ? UserRound : meta.icon || Bot;
  const statusIcon = message.isThinking ? CircleDashed : CheckCircle2;
  const StatusIcon = statusIcon;
  const shouldCollapse = content.length > 1800 && message.type === 'ai' && !message.isThinking;

  const visibleContent = useMemo(() => {
    if (!shouldCollapse || isExpanded) return content;
    return `${content.slice(0, 1800).trim()}...`;
  }, [content, isExpanded, shouldCollapse]);

  return (
    <article className={`message-bubble ${message.type} ${message.agent || 'general'}`}>
      <div className="message-avatar" aria-hidden="true">
        <Icon size={18} strokeWidth={2} />
      </div>

      <div className="message-card">
        <header className="message-header">
          <div>
            <div className="message-author">{isUser ? 'You' : meta.label}</div>
            <div className="message-role">{isUser ? 'Project request' : meta.role}</div>
          </div>
          <div className={`message-status ${message.isThinking ? 'working' : 'done'}`}>
            <StatusIcon size={14} strokeWidth={2.2} />
            <span>{message.isThinking ? 'Working' : formatTime(message.timestamp)}</span>
          </div>
        </header>

        {message.type === 'workflow' ? (
          <WorkflowPanel
            task={message.workflow}
            onAction={onWorkflowAction}
            disabled={actionsDisabled}
          />
        ) : (
          <div className="message-content">
            {renderContent(visibleContent)}
            {message.attachments?.length > 0 && (
              <div className="message-attachments">
                {message.attachments.map((attachment) => (
                  <span className="message-attachment" key={`${attachment.name}-${attachment.size}`}>
                    <FileText size={14} strokeWidth={2} />
                    <span>{attachment.name}</span>
                    <small>{formatAttachmentSize(attachment.size)}</small>
                  </span>
                ))}
              </div>
            )}
            {message.isThinking && content && <span className="streaming-cursor" aria-hidden="true" />}
          </div>
        )}

        {message.isThinking && (
          <div className="thinking-bar" aria-label="Processing">
            <span />
            <span />
            <span />
          </div>
        )}

        {shouldCollapse && (
          <button
            className="text-button"
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? 'Show less' : 'Show full response'}
          </button>
        )}
      </div>
    </article>
  );
};

export default MessageBubble;
