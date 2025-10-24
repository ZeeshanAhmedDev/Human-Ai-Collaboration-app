
// import apiService from '../services/apiService.js';
// import storageService from '../services/storageService.js';

// class ChatController {
//   constructor() {
//     this.conversations = storageService.loadConversations();
//     this.activeConversation = this.conversations[0] || this.createNewConversation();
//     this.isProcessing = false;
//   }

//   createNewConversation() {
//     const newConversation = {
//       id: Date.now().toString(),
//       title: 'New Conversation',
//       messages: [],
//       timestamp: new Date(),
//       lastMessage: '',
//       messageCount: 0
//     };
    
//     this.conversations.unshift(newConversation);
//     this.activeConversation = newConversation;
//     this.saveConversations();
    
//     return newConversation;
//   }

//   switchConversation(conversationId) {
//     const conversation = this.conversations.find(conv => conv.id === conversationId);
//     if (conversation) {
//       this.activeConversation = conversation;
//     }
//   }

//   deleteConversation(conversationId) {
//     this.conversations = this.conversations.filter(conv => conv.id !== conversationId);
    
//     if (this.activeConversation.id === conversationId) {
//       this.activeConversation = this.conversations[0] || this.createNewConversation();
//     }
    
//     this.saveConversations();
//   }

//   addMessage(content, type = 'user', agent = null) {
//     const message = {
//       id: Date.now() + Math.random(),
//       content,
//       type,
//       agent,
//       timestamp: new Date(),
//       status: type === 'user' ? 'sent' : 'pending'
//     };

//     this.activeConversation.messages.push(message);
//     this.activeConversation.lastMessage = content;
//     this.activeConversation.messageCount = this.activeConversation.messages.length;
//     this.activeConversation.timestamp = new Date();
    
//     // Update conversation title if it's the first user message
//     if (type === 'user' && this.activeConversation.title === 'New Conversation') {
//       this.activeConversation.title = content.length > 30 
//         ? content.substring(0, 30) + '...' 
//         : content;
//     }
    
//     this.saveConversations();
    
//     return message;
//   }

//   updateMessage(id, updates) {
//     const messageIndex = this.activeConversation.messages.findIndex(msg => msg.id === id);
//     if (messageIndex !== -1) {
//       this.activeConversation.messages[messageIndex] = { 
//         ...this.activeConversation.messages[messageIndex], 
//         ...updates 
//       };
//       this.saveConversations();
//     }
//   }

//   async sendGoal(goal) {
//     if (this.isProcessing) return;
    
//     this.isProcessing = true;
    
//     const userMessage = this.addMessage(goal, 'user');
    
//     try {
//       const thinkingMessage = this.addMessage(
//         '🤔 AI team is planning and developing...', 
//         'system'
//       );

//       const response = await apiService.executeGoal(goal);
      
//       // Remove thinking message
//       this.activeConversation.messages = this.activeConversation.messages.filter(
//         msg => msg.id !== thinkingMessage.id
//       );
      
//       // Add AI responses
//       if (response.plan) {
//         this.addMessage(response.plan, 'ai', 'planner');
//       }
//       if (response.code) {
//         this.addMessage(response.code, 'ai', 'developer');
//       }
//       if (response.tests) {
//         this.addMessage(response.tests, 'ai', 'tester');
//       }
//       if (response.review) {
//         this.addMessage(response.review, 'ai', 'reviewer');
//       }
      
//       this.saveConversations();
//       return response;
      
//     } catch (error) {
//       this.addMessage(`❌ Error: ${error.message}`, 'system');
//       throw error;
//     } finally {
//       this.isProcessing = false;
//     }
//   }

//   clearActiveConversation() {
//     this.activeConversation.messages = [];
//     this.activeConversation.lastMessage = '';
//     this.activeConversation.messageCount = 0;
//     this.saveConversations();
//   }

//   getActiveMessages() {
//     return this.activeConversation?.messages || [];
//   }

//   getConversations() {
//     return this.conversations;
//   }

//   getActiveConversation() {
//     return this.activeConversation;
//   }

//   saveConversations() {
//     storageService.saveConversations(this.conversations);
//   }

//   getIsProcessing() {
//     return this.isProcessing;
//   }
// }

// export default ChatController;



import apiService from '../services/apiService.js';
import storageService from '../services/storageService.js';

class ChatController {
  constructor() {
    this.conversations = storageService.loadConversations();
    this.activeConversation = this.conversations[0] || this.createNewConversation();
    this.isProcessing = false;
    this.onUpdateCallback = null; // Callback for real-time updates
  }

  setUpdateCallback(callback) {
    this.onUpdateCallback = callback;
  }

  createNewConversation() {
    const newConversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      timestamp: new Date(),
      lastMessage: '',
      messageCount: 0
    };
    
    this.conversations.unshift(newConversation);
    this.activeConversation = newConversation;
    this.saveConversations();
    
    return newConversation;
  }

  switchConversation(conversationId) {
    const conversation = this.conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      this.activeConversation = conversation;
    }
  }

  deleteConversation(conversationId) {
    this.conversations = this.conversations.filter(conv => conv.id !== conversationId);
    
    if (this.activeConversation.id === conversationId) {
      this.activeConversation = this.conversations[0] || this.createNewConversation();
    }
    
    this.saveConversations();
  }

  addMessage(content, type = 'user', agent = null, isThinking = false) {
    const message = {
      id: Date.now() + Math.random(),
      content,
      type,
      agent,
      timestamp: new Date(),
      status: isThinking ? 'thinking' : (type === 'user' ? 'sent' : 'completed'),
      isThinking: isThinking
    };

    this.activeConversation.messages.push(message);
    this.activeConversation.lastMessage = content;
    this.activeConversation.messageCount = this.activeConversation.messages.length;
    this.activeConversation.timestamp = new Date();
    
    // Update conversation title if it's the first user message
    if (type === 'user' && this.activeConversation.title === 'New Conversation') {
      this.activeConversation.title = content.length > 30 
        ? content.substring(0, 30) + '...' 
        : content;
    }
    
    this.saveConversations();
    
    // Trigger update callback for real-time UI updates
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
    
    return message;
  }

  updateMessage(id, updates) {
    const messageIndex = this.activeConversation.messages.findIndex(msg => msg.id === id);
    if (messageIndex !== -1) {
      this.activeConversation.messages[messageIndex] = { 
        ...this.activeConversation.messages[messageIndex], 
        ...updates 
      };
      this.saveConversations();
      
      // Trigger update callback for real-time UI updates
      if (this.onUpdateCallback) {
        this.onUpdateCallback();
      }
    }
  }

  async sendGoal(goal, onAgentUpdate = null) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    const userMessage = this.addMessage(goal, 'user');
    
    try {
      // Add thinking messages for each agent with real-time updates
      const thinkingMessages = {};
      
      // Planner Agent
      thinkingMessages.planner = this.addMessage(
        "🎯 Planning the project architecture and breaking down tasks...", 
        'system',
        'planner',
        true
      );
      
      // Simulate real-time updates for planner
      setTimeout(() => {
        if (thinkingMessages.planner) {
          this.updateMessage(thinkingMessages.planner.id, {
            content: "🎯 Analyzing requirements and creating development roadmap...",
            isThinking: true
          });
        }
      }, 2000);

      // Call the API (this would need to be modified for real streaming)
      const response = await apiService.executeGoal(goal);
      
      // Remove thinking messages
      Object.values(thinkingMessages).forEach(msg => {
        if (msg) {
          this.activeConversation.messages = this.activeConversation.messages.filter(
            m => m.id !== msg.id
          );
        }
      });
      
      // Add actual AI responses with simulated real-time typing
      if (response.plan) {
        await this.addMessageWithTypingEffect(response.plan, 'ai', 'planner');
      }
      
      // Developer Agent
      const developerThinking = this.addMessage(
        "💻 Writing code implementation based on the plan...", 
        'system',
        'developer',
        true
      );
      
      setTimeout(() => {
        if (response.code) {
          this.updateMessage(developerThinking.id, {
            content: response.code,
            type: 'ai',
            agent: 'developer',
            status: 'completed',
            isThinking: false
          });
        }
      }, 1000);
      
      // Tester Agent
      const testerThinking = this.addMessage(
        "🧪 Creating comprehensive test cases...", 
        'system',
        'tester',
        true
      );
      
      setTimeout(() => {
        if (response.tests) {
          this.updateMessage(testerThinking.id, {
            content: response.tests,
            type: 'ai',
            agent: 'tester',
            status: 'completed',
            isThinking: false
          });
        }
      }, 1500);
      
      // Reviewer Agent
      const reviewerThinking = this.addMessage(
        "🔍 Reviewing code and providing improvements...", 
        'system',
        'reviewer',
        true
      );
      
      setTimeout(() => {
        if (response.review) {
          this.updateMessage(reviewerThinking.id, {
            content: response.review,
            type: 'ai',
            agent: 'reviewer',
            status: 'completed',
            isThinking: false
          });
        }
      }, 2000);
      
      this.saveConversations();
      return response;
      
    } catch (error) {
      // Remove any thinking messages on error
      this.activeConversation.messages = this.activeConversation.messages.filter(
        msg => !msg.isThinking
      );
      this.addMessage(`❌ Error: ${error.message}`, 'system');
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // Simulate typing effect for messages
  async addMessageWithTypingEffect(content, type = 'ai', agent = null) {
    const message = this.addMessage('', type, agent, true);
    
    // Simulate typing character by character
    let displayedContent = '';
    const words = content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      displayedContent += (i === 0 ? '' : ' ') + words[i];
      this.updateMessage(message.id, {
        content: displayedContent + (i < words.length - 1 ? '...' : ''),
        isThinking: i < words.length - 1
      });
      
      // Random typing speed between 10-50ms per word
      await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 10));
    }
    
    // Final update to mark as completed
    this.updateMessage(message.id, {
      content: displayedContent,
      status: 'completed',
      isThinking: false
    });
    
    return message;
  }

  clearActiveConversation() {
    this.activeConversation.messages = [];
    this.activeConversation.lastMessage = '';
    this.activeConversation.messageCount = 0;
    this.saveConversations();
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