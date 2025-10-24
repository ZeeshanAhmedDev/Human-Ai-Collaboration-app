// import React, { useState } from 'react';

// const MessageBubble = ({ message }) => {
//   const [isExpanded, setIsExpanded] = useState(false);

//   const getAgentIcon = (agent) => {
//     const icons = {
//       planner: '🎯',
//       developer: '💻',
//       tester: '🧪',
//       reviewer: '🔍',
//       system: '🤖'
//     };
//     return icons[agent] || '🤖';
//   };

//   const getAgentName = (agent) => {
//     const names = {
//       planner: 'Architect',
//       developer: 'Developer',
//       tester: 'QA Engineer',
//       reviewer: 'Code Reviewer',
//       system: 'System'
//     };
//     return names[agent] || 'AI';
//   };

//   const formatContent = (content) => {
//     if (content.includes('```')) {
//       return content.split('```').map((part, index) => 
//         index % 2 === 1 ? (
//           <pre key={index} className="code-block">{part}</pre>
//         ) : (
//           <span key={index}>{part}</span>
//         )
//       );
//     }
//     return content;
//   };

//   const shouldTruncate = message.content.length > 500 && message.type === 'ai';
//   const displayContent = shouldTruncate && !isExpanded 
//     ? message.content.substring(0, 500) + '...' 
//     : message.content;

//   return (
//     <div className={`message-bubble ${message.type} ${message.agent || ''}`}>
//       <div className="message-header">
//         <span className="agent-icon">{getAgentIcon(message.agent)}</span>
//         <span className="agent-name">{getAgentName(message.agent)}</span>
//         <span className="message-time">
//           {new Date(message.timestamp).toLocaleTimeString()}
//         </span>
//       </div>
      
//       <div className="message-content">
//         {formatContent(displayContent)}
//       </div>

//       {shouldTruncate && (
//         <button 
//           className="expand-button"
//           onClick={() => setIsExpanded(!isExpanded)}
//         >
//           {isExpanded ? 'Show Less' : 'Show More'}
//         </button>
//       )}

//       {message.status === 'pending' && (
//         <div className="typing-indicator">
//           <span></span>
//           <span></span>
//           <span></span>
//         </div>
//       )}
//     </div>
//   );
// };

// export default MessageBubble;


import React, { useState, useEffect } from 'react';

const MessageBubble = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayedContent, setDisplayedContent] = useState('');

  // Simulate typing effect for thinking messages
  useEffect(() => {
    if (message.isThinking && message.content) {
      setDisplayedContent('');
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= message.content.length) {
          setDisplayedContent(message.content.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, 20); // Typing speed
      
      return () => clearInterval(typingInterval);
    } else {
      setDisplayedContent(message.content);
    }
  }, [message.content, message.isThinking]);

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

  const getAgentStatus = (agent, isThinking) => {
    if (isThinking) {
      const status = {
        planner: 'Planning architecture...',
        developer: 'Writing code...',
        tester: 'Creating tests...',
        reviewer: 'Reviewing code...',
        system: 'Processing...'
      };
      return status[agent] || 'Thinking...';
    }
    return 'Completed';
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

  const shouldTruncate = message.content.length > 500 && message.type === 'ai' && !message.isThinking;
  const displayContent = shouldTruncate && !isExpanded 
    ? displayedContent.substring(0, 500) + '...' 
    : displayedContent;

  return (
    <div className={`message-bubble ${message.type} ${message.agent || ''} ${message.isThinking ? 'thinking' : ''}`}>
      <div className="message-header">
        <span className="agent-icon">{getAgentIcon(message.agent)}</span>
        <div className="agent-info">
          <span className="agent-name">{getAgentName(message.agent)}</span>
          {message.isThinking && (
            <span className="agent-status">{getAgentStatus(message.agent, true)}</span>
          )}
        </div>
        <span className="message-time">
          {message.isThinking ? 'Just now' : new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      <div className="message-content">
        {formatContent(displayContent)}
        {message.isThinking && displayedContent.length < message.content.length && (
          <span className="typing-cursor">|</span>
        )}
      </div>

      {message.isThinking && (
        <div className="thinking-indicator">
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="thinking-text">AI is thinking...</span>
        </div>
      )}

      {shouldTruncate && (
        <button 
          className="expand-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
};

export default MessageBubble;