import React from 'react';
import MessageBubble from './MessageBubble.js';

const MessageList = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <div className="welcome-message">
          <h2>👋 Welcome to AI Collab Team!</h2>
          <p>Describe your software project and our AI team will:</p>
          <ul>
            <li>🎯 Plan the architecture</li>
            <li>💻 Write the code</li>
            <li>🧪 Create tests</li>
            <li>🔍 Review and improve</li>
          </ul>
          <p>Try: "Build a chatbot with FastAPI and React"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
};

export default MessageList;