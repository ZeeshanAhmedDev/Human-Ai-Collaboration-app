import React, { useState } from 'react';

const InputArea = ({ onSendMessage, isProcessing, onClearChat }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isProcessing) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const presetGoals = [
    "Build a chatbot with FastAPI and React",
    "Create a REST API for a blog system",
    "Develop a task management app",
    "Build a weather application with API integration"
  ];

  return (
    <div className="input-area">
      <div className="preset-goals">
        <p>Quick Start:</p>
        {presetGoals.map((goal, index) => (
          <button
            key={index}
            className="preset-goal"
            onClick={() => onSendMessage(goal)}
            disabled={isProcessing}
          >
            {goal}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="message-form">
        <div className="input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your software project... (e.g., Build a calculator API with FastAPI)"
            disabled={isProcessing}
            rows="3"
          />
          <div className="button-group">
            <button 
              type="button" 
              className="clear-button"
              onClick={onClearChat}
              disabled={isProcessing}
            >
              🗑️ Clear
            </button>
            <button 
              type="submit" 
              disabled={!inputValue.trim() || isProcessing}
              className="send-button"
            >
              {isProcessing ? '⚡ Processing...' : '🚀 Send to AI Team'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InputArea;