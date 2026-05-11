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

const renderInlineMarkdown = (text, keyPrefix) => {
  const source = String(text || '').replace(/\s+$/g, '');
  const pattern = /(\*\*[^*]+?\*\*|__[^_]+?__|`[^`]+?`)/g;
  const nodes = [];
  let cursor = 0;
  let match;

  const pushText = (value) => {
    if (value) {
      nodes.push(value);
    }
  };

  while ((match = pattern.exec(source)) !== null) {
    pushText(source.slice(cursor, match.index));

    const token = match[0];
    const key = `${keyPrefix}-inline-${match.index}`;

    if (token.startsWith('`')) {
      nodes.push(
        <code className="inline-code" key={key}>
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    }

    cursor = match.index + token.length;
  }

  pushText(source.slice(cursor));
  return nodes.length > 0 ? nodes : source;
};

const renderMarkdownBlocks = (text, keyPrefix) => {
  const lines = String(text || '').split(/\r?\n/);
  const nodes = [];
  let paragraphLines = [];
  let listItems = [];
  let listType = null;
  let quoteLines = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;

    const paragraphText = paragraphLines.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (paragraphText) {
      nodes.push(
        <p key={`${keyPrefix}-p-${nodes.length}`}>
          {renderInlineMarkdown(paragraphText, `${keyPrefix}-p-${nodes.length}`)}
        </p>
      );
    }

    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;

    const Tag = listType === 'ol' ? 'ol' : 'ul';
    nodes.push(
      <Tag className={`markdown-list ${listType === 'ol' ? 'numbered' : 'bulleted'}`} key={`${keyPrefix}-list-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li key={`${keyPrefix}-li-${index}`}>
            {renderInlineMarkdown(item, `${keyPrefix}-li-${index}`)}
          </li>
        ))}
      </Tag>
    );

    listItems = [];
    listType = null;
  };

  const flushQuote = () => {
    if (quoteLines.length === 0) return;

    const quoteText = quoteLines.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (quoteText) {
      nodes.push(
        <blockquote className="markdown-quote" key={`${keyPrefix}-quote-${nodes.length}`}>
          {renderInlineMarkdown(quoteText, `${keyPrefix}-quote-${nodes.length}`)}
        </blockquote>
      );
    }

    quoteLines = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushAll();
      return;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmedLine)) {
      flushAll();
      nodes.push(<hr className="markdown-rule" key={`${keyPrefix}-rule-${nodes.length}`} />);
      return;
    }

    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      const Tag = level <= 2 ? 'h3' : level === 3 ? 'h4' : 'h5';
      nodes.push(
        <Tag className={`markdown-heading level-${level}`} key={`${keyPrefix}-heading-${nodes.length}`}>
          {renderInlineMarkdown(headingMatch[2], `${keyPrefix}-heading-${nodes.length}`)}
        </Tag>
      );
      return;
    }

    const quoteMatch = trimmedLine.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      return;
    }

    const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      flushQuote();
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(orderedMatch[1]);
      return;
    }

    const unorderedMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushQuote();
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(unorderedMatch[1]);
      return;
    }

    flushList();
    flushQuote();
    paragraphLines.push(trimmedLine);
  });

  flushAll();
  return nodes.length > 0 ? nodes : null;
};

const renderContent = (content) => {
  const text = String(content || '');
  const parts = text.split('```');

  if (parts.length === 1) {
    return renderMarkdownBlocks(text, 'text');
  }

  const renderedParts = [];

  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      if (part) {
        const blocks = renderMarkdownBlocks(part, `text-${index}`);
        if (blocks) {
          renderedParts.push(...blocks);
        }
      }
      return;
    }

    const [firstLine, ...rest] = part.replace(/^\n/, '').split('\n');
    const hasLanguage = /^[a-z0-9+#.-]+$/i.test(firstLine.trim()) && rest.length > 0;
    const code = hasLanguage ? rest.join('\n') : part.trim();
    const language = hasLanguage ? firstLine.trim() : 'code';

    renderedParts.push(
      <div className="code-shell" key={`code-${index}`}>
        <div className="code-label">{language}</div>
        <pre className="code-block">{code}</pre>
      </div>
    );
  });

  return renderedParts;
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
