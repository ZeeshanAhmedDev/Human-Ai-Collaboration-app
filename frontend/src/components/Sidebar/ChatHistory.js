import React from 'react';

const ChatHistory = ({ 
  conversations, 
  activeConversation, 
  onSelectConversation, 
  onDeleteConversation 
}) => {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  const truncateText = (text, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (conversations.length === 0) {
    return (
      <div className="empty-history">
        <div className="empty-icon">💬</div>
        <p>No chat history</p>
        <span>Start a new conversation</span>
      </div>
    );
  }

  return (
    <div className="chat-history">
      <div className="history-header">
        <h3>Chat History</h3>
        <span className="conversation-count">{conversations.length}</span>
      </div>
      
      <div className="conversation-list">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`conversation-item ${
              activeConversation?.id === conversation.id ? 'active' : ''
            }`}
            onClick={() => onSelectConversation(conversation)}
          >
            <div className="conversation-content">
              <div className="conversation-title">
                {conversation.title || 'New Conversation'}
              </div>
              <div className="conversation-preview">
                {truncateText(conversation.lastMessage || 'Start chatting...')}
              </div>
              <div className="conversation-meta">
                <span className="conversation-date">
                  {formatDate(conversation.timestamp)}
                </span>
                <span className="message-count">
                  {conversation.messageCount || 0} messages
                </span>
              </div>
            </div>
            
            <button
              className="delete-conversation"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conversation.id);
              }}
              title="Delete conversation"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatHistory;