import apiService from '../services/apiService.js';
import storageService from '../services/storageService.js';

class ChatController {
  constructor() {
    this.messages = storageService.loadChatHistory();
    this.isProcessing = false;
  }

  addMessage(content, type = 'user', agent = null, timestamp = new Date()) {
    const message = {
      id: Date.now() + Math.random(),
      content,
      type,
      agent,
      timestamp,
      status: type === 'user' ? 'sent' : 'pending'
    };

    this.messages.push(message);
    storageService.saveChatHistory(this.messages);
    
    return message;
  }

  updateMessage(id, updates) {
    const messageIndex = this.messages.findIndex(msg => msg.id === id);
    if (messageIndex !== -1) {
      this.messages[messageIndex] = { ...this.messages[messageIndex], ...updates };
      storageService.saveChatHistory(this.messages);
    }
  }

  async sendGoal(goal) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    const userMessage = this.addMessage(goal, 'user');
    
    try {
      const thinkingMessage = this.addMessage(
        '🤔 AI team is planning and developing...', 
        'system'
      );

      const response = await apiService.executeGoal(goal);
      
      this.messages = this.messages.filter(msg => msg.id !== thinkingMessage.id);
      
      if (response.plan) {
        this.addMessage(response.plan, 'ai', 'planner');
      }
      if (response.code) {
        this.addMessage(response.code, 'ai', 'developer');
      }
      if (response.tests) {
        this.addMessage(response.tests, 'ai', 'tester');
      }
      if (response.review) {
        this.addMessage(response.review, 'ai', 'reviewer');
      }
      
      return response;
      
    } catch (error) {
      this.addMessage(`❌ Error: ${error.message}`, 'system');
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  clearChat() {
    this.messages = [];
    storageService.clearChatHistory();
  }

  getMessages() {
    return this.messages;
  }

  getIsProcessing() {
    return this.isProcessing;
  }
}

export default ChatController;