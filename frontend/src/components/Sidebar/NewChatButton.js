import React from 'react';

const NewChatButton = ({ onNewChat }) => {
  return (
    <button className="new-chat-button" onClick={onNewChat}>
      <span className="plus-icon">+</span>
      <span className="button-text">New Chat</span>
    </button>
  );
};

export default NewChatButton;