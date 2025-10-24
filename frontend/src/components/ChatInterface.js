// import React, { useState, useEffect, useRef } from 'react';
// import MessageList from './MessageList.js';
// import InputArea from './InputArea.js';
// import AgentStatus from './AgentStatus.js';
// import ChatController from '../controllers/chatController.js';

// const ChatInterface = () => {
//   const [messages, setMessages] = useState([]);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [connectionStatus, setConnectionStatus] = useState('checking');
//   const chatController = useRef(new ChatController());
//   const messagesEndRef = useRef(null);

//   useEffect(() => {
//     loadMessages();
//     checkConnection();
//   }, []);

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const loadMessages = () => {
//     setMessages(chatController.current.getMessages());
//   };

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   const checkConnection = async () => {
//     try {
//       setConnectionStatus('connected');
//     } catch (error) {
//       setConnectionStatus('disconnected');
//     }
//   };

//   const handleSendMessage = async (message) => {
//     if (!message.trim() || isProcessing) return;

//     setIsProcessing(true);
//     setMessages(chatController.current.getMessages());

//     try {
//       await chatController.current.sendGoal(message);
//       setMessages(chatController.current.getMessages());
//     } catch (error) {
//       console.error('Error sending message:', error);
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const handleClearChat = () => {
//     chatController.current.clearChat();
//     setMessages([]);
//   };

//   return (
//     <div className="chat-interface">
//       <div className="chat-header">
//         <h1>🚀 AI Collab Team</h1>
//         <div className="connection-status">
//           Status: <span className={`status-${connectionStatus}`}>
//             {connectionStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
//           </span>
//         </div>
//       </div>

//       <AgentStatus isProcessing={isProcessing} />
      
//       <div className="chat-container">
//         <MessageList messages={messages} />
//         <div ref={messagesEndRef} />
//       </div>

//       <InputArea 
//         onSendMessage={handleSendMessage}
//         isProcessing={isProcessing}
//         onClearChat={handleClearChat}
//       />
//     </div>
//   );
// };

// export default ChatInterface;



import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar/Sidebar.js';
import MessageList from './MessageList.js';
import InputArea from './InputArea.js';
import AgentStatus from './AgentStatus.js';
import ChatController from '../controllers/chatController.js';
import '../styles/ChatInterface.css';

const ChatInterface = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-renders for real-time updates
  
  const chatController = useRef(new ChatController());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Set up real-time update callback
    chatController.current.setUpdateCallback(() => {
      setForceUpdate(prev => prev + 1); // Force re-render
      setActiveConversation({...chatController.current.getActiveConversation()});
    });

    loadConversations();
    setActiveConversation(chatController.current.getActiveConversation());
    checkConnection();
    
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, forceUpdate]); // Re-run when messages change or force update

  const loadConversations = () => {
    setConversations(chatController.current.getConversations());
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

  const handleNewChat = () => {
    chatController.current.createNewConversation();
    setActiveConversation(chatController.current.getActiveConversation());
    loadConversations();
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleSelectConversation = (conversation) => {
    chatController.current.switchConversation(conversation.id);
    setActiveConversation(chatController.current.getActiveConversation());
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteConversation = (conversationId) => {
    chatController.current.deleteConversation(conversationId);
    setActiveConversation(chatController.current.getActiveConversation());
    loadConversations();
  };

  const handleSendMessage = async (message) => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    
    try {
      await chatController.current.sendGoal(message);
      setActiveConversation({...chatController.current.getActiveConversation()});
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearChat = () => {
    chatController.current.clearActiveConversation();
    setActiveConversation({...chatController.current.getActiveConversation()});
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="chat-interface">
      {/* Sidebar */}
      <div className={`sidebar-container ${sidebarOpen ? 'open' : 'closed'}`}>
        <Sidebar
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && window.innerWidth <= 768 && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="main-chat-area">
        <div className="chat-header">
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? '←' : '☰'}
            <span className="toggle-text">
              {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
            </span>
          </button>
          
          <div className="header-content">
            <h1>🚀 AI Collab Team</h1>
            <div className="conversation-title">
              {activeConversation?.title || 'New Conversation'}
            </div>
          </div>

          <div className="connection-status">
            Status: <span className={`status-${connectionStatus}`}>
              {connectionStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
        </div>

        <AgentStatus isProcessing={isProcessing} />
        
        <div className="chat-container">
          <MessageList 
            messages={activeConversation?.messages || []} 
            key={forceUpdate} // Force re-render when messages update
          />
          <div ref={messagesEndRef} />
        </div>

        <InputArea 
          onSendMessage={handleSendMessage}
          isProcessing={isProcessing}
          onClearChat={handleClearChat}
        />
      </div>
    </div>
  );
};

export default ChatInterface;