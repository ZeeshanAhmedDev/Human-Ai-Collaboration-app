import React from 'react';
import { Plus } from 'lucide-react';

const NewChatButton = ({ onNewChat }) => {
  return (
    <button className="new-chat-button" type="button" onClick={onNewChat}>
      <Plus size={17} strokeWidth={2.2} />
      <span>New collaboration</span>
    </button>
  );
};

export default NewChatButton;
