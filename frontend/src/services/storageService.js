// const STORAGE_KEY = 'ai_collab_chat_history';

// class StorageService {
//   saveChatHistory(messages) {
//     try {
//       localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
//     } catch (error) {
//       console.warn('Failed to save chat history:', error);
//     }
//   }

//   loadChatHistory() {
//     try {
//       const saved = localStorage.getItem(STORAGE_KEY);
//       return saved ? JSON.parse(saved) : [];
//     } catch (error) {
//       console.warn('Failed to load chat history:', error);
//       return [];
//     }
//   }

//   clearChatHistory() {
//     try {
//       localStorage.removeItem(STORAGE_KEY);
//     } catch (error) {
//       console.warn('Failed to clear chat history:', error);
//     }
//   }
// }

// export default new StorageService();



const CONVERSATIONS_KEY = 'ai_collab_conversations';

class StorageService {
  saveConversations(conversations) {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.warn('Failed to save conversations:', error);
    }
  }

  loadConversations() {
    try {
      const saved = localStorage.getItem(CONVERSATIONS_KEY);
      if (saved) {
        const conversations = JSON.parse(saved);
        // Ensure all conversations have required fields
        return conversations.map(conv => ({
          id: conv.id || Date.now().toString(),
          title: conv.title || 'New Conversation',
          messages: conv.messages || [],
          timestamp: new Date(conv.timestamp),
          lastMessage: conv.lastMessage || '',
          messageCount: conv.messageCount || conv.messages?.length || 0
        }));
      }
      return [];
    } catch (error) {
      console.warn('Failed to load conversations:', error);
      return [];
    }
  }

  clearAllConversations() {
    try {
      localStorage.removeItem(CONVERSATIONS_KEY);
    } catch (error) {
      console.warn('Failed to clear conversations:', error);
    }
  }
}

export default new StorageService();