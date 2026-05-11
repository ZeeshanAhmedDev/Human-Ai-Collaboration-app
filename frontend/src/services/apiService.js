import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = Number(process.env.REACT_APP_API_TIMEOUT || 900000);

const hasAttachments = (attachments) => Array.isArray(attachments) && attachments.length > 0;

const buildExecuteBody = (goal, attachments = []) => {
  if (!hasAttachments(attachments)) {
    return {
      body: JSON.stringify({ goal }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  const formData = new FormData();
  formData.append('goal', goal);
  attachments.forEach((file) => {
    formData.append('attachments', file);
  });

  return {
    body: formData,
    headers: {},
  };
};

const parseSseEvent = (rawEvent) => {
  const lines = rawEvent.split(/\r?\n/);
  let event = 'message';
  const dataLines = [];

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  });

  if (dataLines.length === 0) {
    return { event, data: {} };
  }

  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch (error) {
    return { event, data: { raw: dataLines.join('\n') } };
  }
};

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: false,
    });
  }

  async executeGoal(goal, attachments = []) {
    try {
      if (hasAttachments(attachments)) {
        const formData = new FormData();
        formData.append('goal', goal);
        attachments.forEach((file) => formData.append('attachments', file));
        const response = await this.client.post('/execute', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      }

      const response = await this.client.post('/execute', { goal });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(
          `The AI team did not finish within ${Math.round(API_TIMEOUT / 1000)} seconds. ` +
            'Try a shorter request or a smaller model.'
        );
      }

      if (error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to backend service. Please make sure all services are running.');
      }

      if (error.response) {
        const detail = error.response.data?.detail || 'Unknown error';
        throw new Error(`Server Error: ${error.response.status} - ${detail}`);
      }

      throw new Error('Unexpected error occurred');
    }
  }

  async executeGoalStream(goal, handlers = {}, signal = null, attachments = []) {
    let finalData = null;
    const requestBody = buildExecuteBody(goal, attachments);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/execute/stream`, {
        method: 'POST',
        headers: {
          ...requestBody.headers,
          Accept: 'text/event-stream',
        },
        body: requestBody.body,
        signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Server Error: ${response.status} - ${detail || 'Stream failed'}`);
      }

      if (!response.body) {
        throw new Error('This browser does not support streaming responses.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processRawEvent = (rawEvent) => {
        const trimmedEvent = rawEvent.trim();
        if (!trimmedEvent) return;

        const parsed = parseSseEvent(trimmedEvent);
        handlers.onEvent?.(parsed.event, parsed.data);

        if (parsed.event === 'final') {
          finalData = parsed.data;
        }

        if (parsed.event === 'error') {
          throw new Error(parsed.data?.error || 'The AI stream failed.');
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || '';
        parts.forEach(processRawEvent);

        if (done) break;
      }

      if (buffer.trim()) {
        processRawEvent(buffer);
      }

      return finalData;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }

      if (error.name === 'TypeError') {
        throw new Error('Cannot connect to backend stream. Please make sure all services are running.');
      }

      throw error;
    }
  }

  async getHealth() {
    try {
      const response = await this.client.get('/health', { timeout: 10000 });
      return response.data;
    } catch (error) {
      throw new Error('Backend service unavailable');
    }
  }

  async getKpis() {
    try {
      const response = await this.client.get('/kpis', { timeout: 15000 });
      return response.data;
    } catch (error) {
      if (error.response) {
        const detail = error.response.data?.detail || 'Unknown error';
        throw new Error(`KPI Error: ${error.response.status} - ${detail}`);
      }

      throw new Error('Unable to load KPI data');
    }
  }

  async getTask(taskId) {
    const response = await this.client.get(`/tasks/${taskId}`, { timeout: 15000 });
    return response.data;
  }

  async approvePlan(taskId, payload = {}) {
    const response = await this.client.post(`/tasks/${taskId}/approve-plan`, payload);
    return response.data;
  }

  async editPlan(taskId, plan) {
    const response = await this.client.post(`/tasks/${taskId}/edit-plan`, { plan });
    return response.data;
  }

  async requestRevision(taskId, feedback = '') {
    const response = await this.client.post(`/tasks/${taskId}/request-revision`, { feedback });
    return response.data;
  }

  async approveOutput(taskId, payload = {}) {
    const response = await this.client.post(`/tasks/${taskId}/approve-output`, payload);
    return response.data;
  }

  async rejectOutput(taskId, reason = '') {
    const response = await this.client.post(`/tasks/${taskId}/reject-output`, { reason });
    return response.data;
  }

  async completeTask(taskId, payload = {}) {
    const response = await this.client.post(`/tasks/${taskId}/complete`, payload);
    return response.data;
  }
}

export default new ApiService();
