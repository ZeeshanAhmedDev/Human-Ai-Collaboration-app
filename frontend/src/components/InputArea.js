import React, { useState } from 'react';
import { CircleStop, CornerDownLeft, Eraser, Loader2, SendHorizontal } from 'lucide-react';

const presetGoals = [
  'Build a chatbot with FastAPI and React',
  'Create a REST API for a blog system',
  'Develop a task management app',
  'Build a weather dashboard with API integration'
];

const InputArea = ({ onSendMessage, isProcessing, onClearChat, onCancelProcess }) => {
  const [inputValue, setInputValue] = useState('');

  const submitMessage = (value = inputValue) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isProcessing) return;

    onSendMessage(trimmedValue);
    setInputValue('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  return (
    <footer className="composer">
      <div className="preset-row" aria-label="Quick project goals">
        {presetGoals.map((goal) => (
          <button
            key={goal}
            className="preset-goal"
            type="button"
            onClick={() => submitMessage(goal)}
            disabled={isProcessing}
            title={goal}
          >
            {goal}
          </button>
        ))}
      </div>

      <form className="composer-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="project-goal">
          Project goal
        </label>
        <textarea
          id="project-goal"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the project you want the AI team to build..."
          disabled={isProcessing}
          rows="2"
        />

        <div className="composer-actions">
          <div className="submit-hint">
            <CornerDownLeft size={14} strokeWidth={2} />
            <span>Enter to send</span>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={onClearChat}
            disabled={isProcessing}
          >
            <Eraser size={16} strokeWidth={2} />
            Clear
          </button>
          {isProcessing && (
            <button
              className="danger-button"
              type="button"
              onClick={onCancelProcess}
            >
              <CircleStop size={16} strokeWidth={2.2} />
              Cancel
            </button>
          )}
          <button
            className="primary-button"
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="spin" size={16} strokeWidth={2.2} />
            ) : (
              <SendHorizontal size={16} strokeWidth={2.2} />
            )}
            {isProcessing ? 'Running' : 'Send'}
          </button>
        </div>
      </form>
    </footer>
  );
};

export default InputArea;
