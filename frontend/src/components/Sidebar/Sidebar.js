import React from 'react';
import { Network, X } from 'lucide-react';
import ChatHistory from './ChatHistory.js';
import NewChatButton from './NewChatButton.js';
import '.././../styles/Sidebar.css';

const Sidebar = ({
  conversations,
  activeConversation,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onCloseSidebar
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand-row">
          <div className="brand-mark">
            <Network size={20} strokeWidth={2} />
          </div>
          <div className="brand-copy">
            <strong>AI Collab</strong>
            <span>Thesis prototype</span>
          </div>
          <button
            className="icon-button sidebar-close-btn"
            type="button"
            onClick={onCloseSidebar}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <NewChatButton onNewChat={onNewChat} />
      </div>

      <div className="sidebar-content">
        <ChatHistory
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
        />
      </div>

      <div className="sidebar-footer">
        <div className="profile-chip">
          <span className="profile-avatar">D</span>
          <div>
            <strong>Developer</strong>
            <span>Human collaborator</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
