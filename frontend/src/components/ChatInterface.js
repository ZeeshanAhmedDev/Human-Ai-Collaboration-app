import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList.js';
import InputArea from './InputArea.js';
import AgentStatus from './AgentStatus.js';
import ChatController from '../controllers/chatController.js';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const chatController = useRef(new ChatController());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadMessages();
    checkConnection();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    setMessages(chatController.current.getMessages());
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkConnection = async () => {
    try {
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const handleSendMessage = async (message) => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    setMessages(chatController.current.getMessages());

    try {
      await chatController.current.sendGoal(message);
      setMessages(chatController.current.getMessages());
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearChat = () => {
    chatController.current.clearChat();
    setMessages([]);
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h1>🚀 AI Collab Team</h1>
        <div className="connection-status">
          Status: <span className={`status-${connectionStatus}`}>
            {connectionStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
          </span>
        </div>
      </div>

      <AgentStatus isProcessing={isProcessing} />
      
      <div className="chat-container">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      <InputArea 
        onSendMessage={handleSendMessage}
        isProcessing={isProcessing}
        onClearChat={handleClearChat}
      />
    </div>
  );
};

export default ChatInterface;