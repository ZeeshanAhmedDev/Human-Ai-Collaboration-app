import React, { useRef, useState } from 'react';
import {
  CircleStop,
  CornerDownLeft,
  Eraser,
  FileText,
  Loader2,
  Paperclip,
  SendHorizontal,
  X
} from 'lucide-react';

const presetGoals = [
  'Build a chatbot with FastAPI and React',
  'Create a REST API for a blog system',
  'Develop a task management app',
  'Build a weather dashboard with API integration'
];

const allowedExtensions = ['pdf', 'docx', 'txt'];
const maxAttachmentBytes = 8 * 1024 * 1024;

const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const InputArea = ({ onSendMessage, isProcessing, onClearChat, onCancelProcess }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  const submitMessage = (value = inputValue) => {
    const trimmedValue = value.trim();
    if ((!trimmedValue && !selectedFile) || isProcessing) return;

    onSendMessage(
      trimmedValue || 'Create a software development plan from the attached document.',
      selectedFile ? [selectedFile] : []
    );
    setInputValue('');
    setSelectedFile(null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setFileError('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      setSelectedFile(null);
      setFileError('Only PDF, DOCX, and TXT attachments are supported.');
      event.target.value = '';
      return;
    }

    if (file.size > maxAttachmentBytes) {
      setSelectedFile(null);
      setFileError('Attachment must be 8 MB or smaller.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

        {(selectedFile || fileError) && (
          <div className="attachment-row" aria-live="polite">
            {selectedFile && (
              <div className="attachment-chip">
                <FileText size={15} strokeWidth={2} />
                <span title={selectedFile.name}>{selectedFile.name}</span>
                <small>{formatFileSize(selectedFile.size)}</small>
                <button
                  type="button"
                  onClick={removeSelectedFile}
                  disabled={isProcessing}
                  aria-label="Remove attachment"
                  title="Remove attachment"
                >
                  <X size={14} strokeWidth={2.4} />
                </button>
              </div>
            )}
            {fileError && <div className="attachment-error">{fileError}</div>}
          </div>
        )}

        <div className="composer-actions">
          <div className="submit-hint">
            <CornerDownLeft size={14} strokeWidth={2} />
            <span>Enter to send</span>
          </div>
          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
          <button
            className="secondary-button icon-only"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            title="Attach PDF, DOCX, or TXT"
            aria-label="Attach PDF, DOCX, or TXT"
          >
            <Paperclip size={16} strokeWidth={2} />
          </button>
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
            disabled={(!inputValue.trim() && !selectedFile) || isProcessing}
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
