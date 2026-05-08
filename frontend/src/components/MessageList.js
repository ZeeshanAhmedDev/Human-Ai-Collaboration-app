import React from 'react';
import { ArrowRight, Bot, GitBranch, MessageSquareText } from 'lucide-react';
import MessageBubble from './MessageBubble.js';

const starterPrompts = [
  'Build a student project tracker with FastAPI and React',
  'Create a REST API for a blog system',
  'Design a task board with automated review steps'
];

const MessageList = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="empty-conversation">
        <div className="empty-icon">
          <Bot size={34} strokeWidth={1.7} />
        </div>
        <p className="eyebrow">New session</p>
        <h2>Start with a clear software goal.</h2>
        <p className="empty-copy">
          The agent team will turn your request into a plan, implementation, tests, and review notes.
        </p>

        <div className="empty-flow" aria-label="Collaboration flow">
          <span>Human goal</span>
          <ArrowRight size={15} strokeWidth={2} />
          <span>Agent pipeline</span>
          <ArrowRight size={15} strokeWidth={2} />
          <span>Reviewed output</span>
        </div>

        <div className="starter-prompts" aria-label="Example goals">
          {starterPrompts.map((prompt) => (
            <div className="starter-prompt" key={prompt}>
              <MessageSquareText size={15} strokeWidth={2} />
              <span>{prompt}</span>
            </div>
          ))}
        </div>

        <div className="empty-footnote">
          <GitBranch size={14} strokeWidth={2} />
          <span>Conversation history is saved locally in this browser.</span>
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
