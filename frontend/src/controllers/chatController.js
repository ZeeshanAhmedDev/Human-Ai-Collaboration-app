import apiService from '../services/apiService.js';
import storageService from '../services/storageService.js';

class ChatController {
  constructor() {
    this.conversations = storageService.loadConversations();
    this.activeConversation = this.conversations[0] || this.createNewConversation();
    this.isProcessing = false;
    this.currentAbortController = null;
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

  addMessage(content, type = 'user', agent = null, isThinking = false, extra = {}) {
    const textContent = String(content || '').trim();
    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      content: textContent,
      type,
      agent,
      timestamp: new Date(),
      status: isThinking ? 'working' : 'completed',
      isThinking,
      ...extra
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

  upsertWorkflowMessage(task) {
    if (!task?.task_id) return null;

    const content = `${task.intent || 'unknown'} | ${task.status || 'classified'}`;
    const messageIndex = this.activeConversation.messages.findIndex(
      (message) => message.type === 'workflow' && message.workflow?.task_id === task.task_id
    );

    if (messageIndex !== -1) {
      this.updateMessage(this.activeConversation.messages[messageIndex].id, {
        content,
        workflow: task,
        timestamp: new Date()
      });
      return this.activeConversation.messages[messageIndex];
    }

    return this.addMessage(content, 'workflow', 'system', false, { workflow: task });
  }

  addGeneratedOutputs(task, onlyMissing = true, allowedKeys = null) {
    const outputs = [
      { key: 'plan', agent: 'planner' },
      { key: 'code', agent: 'developer' },
      { key: 'tests', agent: 'tester' },
      { key: 'review', agent: 'reviewer' }
    ];

    outputs.forEach(({ key, agent }) => {
      if (allowedKeys && !allowedKeys.includes(key)) return;
      if (!task?.[key]) return;

      const alreadyExists = this.activeConversation.messages.some(
        (message) => message.taskId === task.task_id && message.agent === agent
      );
      if (onlyMissing && alreadyExists) return;

      this.addMessage(task[key], 'ai', agent, false, { taskId: task.task_id, outputKey: key });
    });
  }

  applyWorkflowUpdate(task, options = {}) {
    const { includeOutputs = true, onlyMissing = true, outputKeys = null } = options;
    if (!task?.task_id) return;

    if (includeOutputs) {
      this.addGeneratedOutputs(task, onlyMissing, outputKeys);
    }
    this.upsertWorkflowMessage(task);
    this.saveConversations();
    this.notifyUpdate();
  }

  updateMessage(id, updates) {
    const messageIndex = this.activeConversation.messages.findIndex((msg) => msg.id === id);
    if (messageIndex === -1) return;

    const updatedMessage = {
      ...this.activeConversation.messages[messageIndex],
      ...updates
    };

    this.activeConversation.messages[messageIndex] = updatedMessage;

    if (messageIndex === this.activeConversation.messages.length - 1) {
      this.activeConversation.lastMessage = updatedMessage.content || '';
      this.activeConversation.timestamp = new Date();
    }

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

  async sendGoal(goal, attachments = []) {
    const trimmedGoal = String(goal || '').trim();
    if (!trimmedGoal || this.isProcessing) return null;
    const attachmentMeta = attachments.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));

    this.isProcessing = true;
    this.currentAbortController = new AbortController();
    this.addMessage(trimmedGoal, 'user', null, false, { attachments: attachmentMeta });

    const progressMessage = this.addMessage(
      attachments.length > 0
        ? 'Reading the attachment and preparing the supervised AI workflow.'
        : 'Coordinating the supervised AI workflow.',
      'system',
      'system',
      true
    );

    const agentOutputs = [
      { key: 'plan', agent: 'planner' },
      { key: 'code', agent: 'developer' },
      { key: 'tests', agent: 'tester' },
      { key: 'review', agent: 'reviewer' }
    ];
    const agentMessages = {};
    let progressRemoved = false;

    const removeProgress = () => {
      if (!progressRemoved) {
        this.removeMessage(progressMessage.id);
        progressRemoved = true;
      }
    };

    const findMessage = (messageId) =>
      this.activeConversation.messages.find((message) => message.id === messageId);

    const ensureAgentMessage = (agent) => {
      if (agentMessages[agent]) {
        return agentMessages[agent];
      }

      removeProgress();
      const message = this.addMessage('', 'ai', agent, true);
      agentMessages[agent] = message.id;
      return message.id;
    };

    const appendAgentChunk = (agent, chunk) => {
      if (!chunk) return;

      const messageId = ensureAgentMessage(agent);
      const message = findMessage(messageId);
      const currentContent = message?.content || '';

      this.updateMessage(messageId, {
        content: `${currentContent}${chunk}`,
        status: 'working',
        isThinking: true,
        timestamp: new Date()
      });
    };

    const completeAgentMessage = (agent, responseText) => {
      const messageId = ensureAgentMessage(agent);
      const message = findMessage(messageId);

      this.updateMessage(messageId, {
        content: responseText || message?.content || '',
        status: 'completed',
        isThinking: false,
        timestamp: new Date()
      });
    };

    const stopThinkingMessages = () => {
      Object.values(agentMessages).forEach((messageId) => {
        const message = findMessage(messageId);
        if (!message?.isThinking) return;

        this.updateMessage(messageId, {
          content: message.content || 'Stopped before this agent returned text.',
          status: 'cancelled',
          isThinking: false,
          timestamp: new Date()
        });
      });
    };

    try {
      const response = await apiService.executeGoalStream(
        trimmedGoal,
        {
          onEvent: (event, data) => {
            if (event === 'agent_start') {
              ensureAgentMessage(data.agent);
            }

            if (event === 'chunk') {
              appendAgentChunk(data.agent, data.chunk);
            }

            if (event === 'agent_done') {
              completeAgentMessage(data.agent, data.response);
            }
          }
        },
        this.currentAbortController.signal,
        attachments
      );

      removeProgress();

      if (response?.error) {
        this.addMessage(response.error, 'system', 'system');
        return response;
      }

      if (Object.keys(agentMessages).length === 0) {
        agentOutputs.forEach(({ key, agent }) => {
          if (response?.[key]) {
            this.addMessage(response[key], 'ai', agent, false, {
              taskId: response.task_id,
              outputKey: key
            });
          }
        });
      }

      if (response?.message && ['small_talk', 'unknown'].includes(response.intent)) {
        this.addMessage(response.message, 'system', 'system');
      }

      if (response?.task_id) {
        this.upsertWorkflowMessage(response);
      }

      return response;
    } catch (error) {
      removeProgress();

      if (error.name === 'AbortError') {
        stopThinkingMessages();
        this.addMessage('Generation stopped by user.', 'system', 'system');
        return null;
      }

      this.addMessage(error.message || 'The AI team could not complete this request.', 'system', 'system');
      throw error;
    } finally {
      this.currentAbortController = null;
      this.isProcessing = false;
      this.notifyUpdate();
    }
  }

  cancelCurrentRequest() {
    if (!this.isProcessing || !this.currentAbortController) {
      return;
    }

    this.currentAbortController.abort();
  }

  async runWorkflowAction(action, task, payload = {}) {
    if (!task?.task_id || this.isProcessing) return null;

    this.isProcessing = true;
    this.notifyUpdate();

    try {
      let response;

      if (action === 'approve-plan') {
        response = await apiService.approvePlan(task.task_id, payload);
      } else if (action === 'edit-plan') {
        response = await apiService.editPlan(task.task_id, payload.plan);
      } else if (action === 'request-revision') {
        response = await apiService.requestRevision(task.task_id, payload.feedback);
      } else if (action === 'approve-output') {
        response = await apiService.approveOutput(task.task_id, payload);
      } else if (action === 'reject-output') {
        response = await apiService.rejectOutput(task.task_id, payload.reason);
      } else if (action === 'complete') {
        response = await apiService.completeTask(task.task_id, payload);
      } else {
        return null;
      }

      const includeOutputs = action === 'approve-plan';
      this.applyWorkflowUpdate(response, {
        includeOutputs,
        onlyMissing: true,
        outputKeys: ['code', 'tests', 'review']
      });
      return response;
    } catch (error) {
      this.addMessage(error.message || 'The workflow action could not be completed.', 'system', 'system');
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
