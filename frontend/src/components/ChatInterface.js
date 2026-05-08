import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, PanelLeftClose, PanelLeftOpen, Wifi, WifiOff } from 'lucide-react';
import Sidebar from './Sidebar/Sidebar.js';
import MessageList from './MessageList.js';
import InputArea from './InputArea.js';
import AgentStatus from './AgentStatus.js';
import ChatController from '../controllers/chatController.js';
import apiService from '../services/apiService.js';
import '../styles/ChatInterface.css';

const getDesktopSidebarState = () => {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(min-width: 920px)').matches;
};

const ChatInterface = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(getDesktopSidebarState);

  const chatController = useRef(new ChatController());
  const messagesEndRef = useRef(null);

  const activeTitle = useMemo(
    () => activeConversation?.title || 'New collaboration',
    [activeConversation]
  );

  useEffect(() => {
    chatController.current.setUpdateCallback(() => {
      setConversations([...chatController.current.getConversations()]);
      setActiveConversation({ ...chatController.current.getActiveConversation() });
      setIsProcessing(chatController.current.getIsProcessing());
    });

    setConversations([...chatController.current.getConversations()]);
    setActiveConversation({ ...chatController.current.getActiveConversation() });
    checkConnection();

    const handleResize = () => {
      if (window.innerWidth >= 920) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if ((activeConversation?.messages || []).length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeConversation?.messages?.length, isProcessing]);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      await apiService.getHealth();
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const handleNewChat = () => {
    chatController.current.createNewConversation();
    if (window.innerWidth < 920) {
      setSidebarOpen(false);
    }
  };

  const handleSelectConversation = (conversation) => {
    chatController.current.switchConversation(conversation.id);
    if (window.innerWidth < 920) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteConversation = (conversationId) => {
    chatController.current.deleteConversation(conversationId);
  };

  const handleSendMessage = async (message) => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await chatController.current.sendGoal(message);
      checkConnection();
    } catch (error) {
      setConnectionStatus('disconnected');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearChat = () => {
    chatController.current.clearActiveConversation();
  };

  const connectionLabel = {
    checking: 'Checking',
    connected: 'Online',
    disconnected: 'Offline'
  }[connectionStatus];

  const ConnectionIcon = connectionStatus === 'connected' ? Wifi : WifiOff;
  const ToggleIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <div className="workspace-shell">
      <aside className={`sidebar-container ${sidebarOpen ? 'open' : 'closed'}`}>
        <Sidebar
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main-chat-area">
        <header className="topbar">
          <button
            className="icon-button sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <ToggleIcon size={20} strokeWidth={1.8} />
          </button>

          <div className="topbar-title">
            <div className="title-kicker">
              <Activity size={15} strokeWidth={2} />
              Human-AI Workbench
            </div>
            <h1 title={activeTitle}>{activeTitle}</h1>
          </div>

          <button
            className={`connection-pill ${connectionStatus}`}
            type="button"
            onClick={checkConnection}
            title="Check backend connection"
          >
            <ConnectionIcon size={15} strokeWidth={2.2} />
            <span>{connectionLabel}</span>
          </button>
        </header>

        <AgentStatus isProcessing={isProcessing} />

        <section className="chat-scroll-area" aria-label="Conversation">
          <MessageList messages={activeConversation?.messages || []} />
          <div ref={messagesEndRef} />
        </section>

        <InputArea
          onSendMessage={handleSendMessage}
          isProcessing={isProcessing}
          onClearChat={handleClearChat}
        />
      </main>
    </div>
  );
};

export default ChatInterface;
