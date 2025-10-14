const STORAGE_KEY = 'ai_collab_chat_history';

class StorageService {
  saveChatHistory(messages) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save chat history:', error);
    }
  }

  loadChatHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Failed to load chat history:', error);
      return [];
    }
  }

  clearChatHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear chat history:', error);
    }
  }
}

export default new StorageService();