import apiService from '../services/apiService.js';
import storageService from '../services/storageService.js';

class ChatController {
  constructor() {
    this.conversations = storageService.loadConversations();
    this.activeConversation = this.conversations[0] || this.createNewConversation();
    this.isProcessing = false;
    this.onUpdateCallback = null;
  }

  setUpdateCallback(callback) {
    this.onUpdateCallback = callback;
  }

  notifyUpdate() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  createNewConversation() {
    const newConversation = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: 'New collaboration',
      messages: [],
      timestamp: new Date(),
      lastMessage: '',
      messageCount: 0
    };

    this.conversations.unshift(newConversation);
    this.activeConversation = newConversation;
    this.saveConversations();
    this.notifyUpdate();

    return newConversation;
  }

  switchConversation(conversationId) {
    const conversation = this.conversations.find((conv) => conv.id === conversationId);
    if (conversation) {
      this.activeConversation = conversation;
      this.notifyUpdate();
    }
  }

  deleteConversation(conversationId) {
    this.conversations = this.conversations.filter((conv) => conv.id !== conversationId);

    if (this.activeConversation?.id === conversationId) {
      this.activeConversation = this.conversations[0] || this.createNewConversation();
    }

    this.saveConversations();
    this.notifyUpdate();
  }

  addMessage(content, type = 'user', agent = null, isThinking = false) {
    const textContent = String(content || '').trim();
    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      content: textContent,
      type,
      agent,
      timestamp: new Date(),
      status: isThinking ? 'working' : 'completed',
      isThinking
    };

    this.activeConversation.messages.push(message);
    this.activeConversation.lastMessage = textContent;
    this.activeConversation.messageCount = this.activeConversation.messages.length;
    this.activeConversation.timestamp = new Date();

    if (type === 'user' && this.activeConversation.title === 'New collaboration') {
      this.activeConversation.title =
        textContent.length > 42 ? `${textContent.substring(0, 42)}...` : textContent;
    }

    this.saveConversations();
    this.notifyUpdate();

    return message;
  }

  updateMessage(id, updates) {
    const messageIndex = this.activeConversation.messages.findIndex((msg) => msg.id === id);
    if (messageIndex === -1) return;

    this.activeConversation.messages[messageIndex] = {
      ...this.activeConversation.messages[messageIndex],
      ...updates
    };
    this.saveConversations();
    this.notifyUpdate();
  }

  removeMessage(id) {
    this.activeConversation.messages = this.activeConversation.messages.filter(
      (message) => message.id !== id
    );
    this.activeConversation.messageCount = this.activeConversation.messages.length;
    this.saveConversations();
    this.notifyUpdate();
  }

  async sendGoal(goal) {
    const trimmedGoal = String(goal || '').trim();
    if (!trimmedGoal || this.isProcessing) return null;

    this.isProcessing = true;
    this.addMessage(trimmedGoal, 'user');

    const progressMessage = this.addMessage(
      'Coordinating the planner, developer, tester, and reviewer agents.',
      'system',
      'system',
      true
    );

    try {
      const response = await apiService.executeGoal(trimmedGoal);
      this.removeMessage(progressMessage.id);

      if (response?.error) {
        this.addMessage(response.error, 'system', 'system');
        return response;
      }

      const agentOutputs = [
        { key: 'plan', agent: 'planner' },
        { key: 'code', agent: 'developer' },
        { key: 'tests', agent: 'tester' },
        { key: 'review', agent: 'reviewer' }
      ];

      agentOutputs.forEach(({ key, agent }) => {
        if (response?.[key]) {
          this.addMessage(response[key], 'ai', agent);
        }
      });

      return response;
    } catch (error) {
      this.removeMessage(progressMessage.id);
      this.addMessage(error.message || 'The AI team could not complete this request.', 'system', 'system');
      throw error;
    } finally {
      this.isProcessing = false;
      this.notifyUpdate();
    }
  }

  clearActiveConversation() {
    this.activeConversation.messages = [];
    this.activeConversation.lastMessage = '';
    this.activeConversation.messageCount = 0;
    this.activeConversation.timestamp = new Date();
    this.saveConversations();
    this.notifyUpdate();
  }

  getActiveMessages() {
    return this.activeConversation?.messages || [];
  }

  getConversations() {
    return this.conversations;
  }

  getActiveConversation() {
    return this.activeConversation;
  }

  saveConversations() {
    storageService.saveConversations(this.conversations);
  }

  getIsProcessing() {
    return this.isProcessing;
  }
}

export default ChatController;
