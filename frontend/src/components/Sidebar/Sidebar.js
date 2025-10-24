// import React from 'react';
// import ChatHistory from './ChatHistory.js';
// import NewChatButton from './NewChatButton.js';
// import '.././../styles/Sidebar.css';

// const Sidebar = ({ 
//   conversations, 
//   activeConversation, 
//   onSelectConversation, 
//   onNewChat, 
//   onDeleteConversation 
// }) => {
//   return (
//     <div className="sidebar">
//       <div className="sidebar-header">
//         <NewChatButton onNewChat={onNewChat} />
//       </div>
      
//       <div className="sidebar-content">
//         <ChatHistory
//           conversations={conversations}
//           activeConversation={activeConversation}
//           onSelectConversation={onSelectConversation}
//           onDeleteConversation={onDeleteConversation}
//         />
//       </div>
      
//       <div className="sidebar-footer">
//         <div className="user-info">
//           <div className="user-avatar">👤</div>
//           <span className="user-name">Developer</span>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Sidebar;




import React from 'react';
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
        <div className="sidebar-header-top">
          <NewChatButton onNewChat={onNewChat} />
          {/* Close button for mobile */}
          <button 
            className="sidebar-close-btn"
            onClick={onCloseSidebar}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
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
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <span className="user-name">Developer</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;