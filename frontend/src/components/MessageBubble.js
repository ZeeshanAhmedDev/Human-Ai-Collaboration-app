import React, { useState } from 'react';

const MessageBubble = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getAgentIcon = (agent) => {
    const icons = {
      planner: '🎯',
      developer: '💻',
      tester: '🧪',
      reviewer: '🔍',
      system: '🤖'
    };
    return icons[agent] || '🤖';
  };

  const getAgentName = (agent) => {
    const names = {
      planner: 'Architect',
      developer: 'Developer',
      tester: 'QA Engineer',
      reviewer: 'Code Reviewer',
      system: 'System'
    };
    return names[agent] || 'AI';
  };

  const formatContent = (content) => {
    if (content.includes('```')) {
      return content.split('```').map((part, index) => 
        index % 2 === 1 ? (
          <pre key={index} className="code-block">{part}</pre>
        ) : (
          <span key={index}>{part}</span>
        )
      );
    }
    return content;
  };

  const shouldTruncate = message.content.length > 500 && message.type === 'ai';
  const displayContent = shouldTruncate && !isExpanded 
    ? message.content.substring(0, 500) + '...' 
    : message.content;

  return (
    <div className={`message-bubble ${message.type} ${message.agent || ''}`}>
      <div className="message-header">
        <span className="agent-icon">{getAgentIcon(message.agent)}</span>
        <span className="agent-name">{getAgentName(message.agent)}</span>
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      <div className="message-content">
        {formatContent(displayContent)}
      </div>

      {shouldTruncate && (
        <button 
          className="expand-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      )}

      {message.status === 'pending' && (
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;