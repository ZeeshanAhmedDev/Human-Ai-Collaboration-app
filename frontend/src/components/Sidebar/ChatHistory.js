import React from 'react';
import { MessageSquareText, Trash2 } from 'lucide-react';

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recent';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday - startOfDate) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });
};

const truncateText = (text, maxLength = 58) => {
  const value = String(text || '');
  if (value.length <= maxLength) return value;
  return `${value.substring(0, maxLength).trim()}...`;
};

const ChatHistory = ({
  conversations,
  activeConversation,
  onSelectConversation,
  onDeleteConversation
}) => {
  if (conversations.length === 0) {
    return (
      <div className="empty-history">
        <div className="empty-history-icon">
          <MessageSquareText size={24} strokeWidth={1.8} />
        </div>
        <p>No saved sessions</p>
        <span>Start a collaboration to see it here.</span>
      </div>
    );
  }

  return (
    <div className="chat-history">
      <div className="history-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>Conversations</h2>
        </div>
        <span className="conversation-count">{conversations.length}</span>
      </div>

      <div className="conversation-list">
        {conversations.map((conversation) => {
          const isActive = activeConversation?.id === conversation.id;

          return (
            <div className={`conversation-row ${isActive ? 'active' : ''}`} key={conversation.id}>
              <button
                className="conversation-main"
                type="button"
                onClick={() => onSelectConversation(conversation)}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className="conversation-title">{conversation.title || 'New collaboration'}</span>
                <span className="conversation-preview">
                  {truncateText(conversation.lastMessage || 'No messages yet')}
                </span>
                <span className="conversation-meta">
                  <span>{formatDate(conversation.timestamp)}</span>
                  <span>{conversation.messageCount || 0} messages</span>
                </span>
              </button>

              <button
                className="delete-conversation"
                type="button"
                onClick={() => onDeleteConversation(conversation.id)}
                aria-label={`Delete ${conversation.title || 'conversation'}`}
                title="Delete conversation"
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatHistory;
