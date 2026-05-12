import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Moon,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Wifi,
  WifiOff
} from 'lucide-react';
import Sidebar from './Sidebar/Sidebar.js';
import MessageList from './MessageList.js';
import InputArea from './InputArea.js';
import AgentStatus from './AgentStatus.js';
import KpiDashboard from './KpiDashboard.js';
import ChatController from '../controllers/chatController.js';
import apiService from '../services/apiService.js';
import '../styles/ChatInterface.css';

const getDesktopSidebarState = () => {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(min-width: 920px)').matches;
};

const ChatInterface = ({ theme, onToggleTheme }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(getDesktopSidebarState);
  const [activeView, setActiveView] = useState('chat');

  const chatController = useRef(new ChatController());
  const messagesEndRef = useRef(null);

  const activeTitle = useMemo(
    () => activeConversation?.title || 'New collaboration',
    [activeConversation]
  );
  const scrollSignature = useMemo(() => {
    const messages = activeConversation?.messages || [];
    const lastMessage = messages[messages.length - 1];

    return [
      messages.length,
      lastMessage?.id || '',
      String(lastMessage?.content || '').length,
      lastMessage?.isThinking ? 'working' : 'done'
    ].join(':');
  }, [activeConversation]);

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
  }, [scrollSignature, isProcessing, activeConversation?.messages]);

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

  const handleSendMessage = async (message, attachments = []) => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await chatController.current.sendGoal(message, attachments);
      checkConnection();
    } catch (error) {
      setConnectionStatus('disconnected');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelProcess = () => {
    chatController.current.cancelCurrentRequest();
  };

  const handleWorkflowAction = async (action, task) => {
    if (!task?.task_id || isProcessing) return;

    let payload = {};

    if (action === 'edit-plan') {
      const editedPlan = window.prompt('Edit the plan before approval:', task.plan || '');
      if (editedPlan === null) return;
      payload = { plan: editedPlan };
    }

    if (action === 'request-revision') {
      const feedback = window.prompt('What should be revised?', '');
      if (feedback === null) return;
      payload = { feedback };
    }

    if (action === 'reject-output') {
      const reason = window.prompt('Why are you rejecting this output?', '');
      if (reason === null) return;
      payload = { reason };
    }

    setIsProcessing(true);
    try {
      await chatController.current.runWorkflowAction(action, task, payload);
      checkConnection();
    } catch (error) {
      setConnectionStatus('disconnected');
    } finally {
      setIsProcessing(false);
    }
  };

  const connectionLabel = {
    checking: 'Checking',
    connected: 'Online',
    disconnected: 'Offline'
  }[connectionStatus];

  const ConnectionIcon = connectionStatus === 'connected' ? Wifi : WifiOff;
  const ToggleIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const themeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

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
            className="icon-button theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            <ThemeIcon size={19} strokeWidth={1.9} />
          </button>

          <div className="view-switch" aria-label="Workspace view">
            <button
              className={activeView === 'chat' ? 'active' : ''}
              type="button"
              onClick={() => setActiveView('chat')}
            >
              <MessageSquareText size={15} strokeWidth={2} />
              Chat
            </button>
            <button
              className={activeView === 'kpis' ? 'active' : ''}
              type="button"
              onClick={() => setActiveView('kpis')}
            >
              <BarChart3 size={15} strokeWidth={2} />
              KPIs
            </button>
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

        {activeView === 'chat' ? (
          <>
            <AgentStatus isProcessing={isProcessing} />

            <section className="chat-scroll-area" aria-label="Conversation">
              <MessageList
                messages={activeConversation?.messages || []}
                onWorkflowAction={handleWorkflowAction}
                actionsDisabled={isProcessing}
              />
              <div ref={messagesEndRef} />
            </section>

            <InputArea
              onSendMessage={handleSendMessage}
              isProcessing={isProcessing}
              onCancelProcess={handleCancelProcess}
            />
          </>
        ) : (
          <section className="dashboard-scroll-area" aria-label="KPI dashboard">
            <KpiDashboard />
          </section>
        )}
      </main>
    </div>
  );
};

export default ChatInterface;
