import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 300000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  async executeGoal(goal) {
    try {
      console.log('🚀 Sending goal to AI team:', goal);
      const response = await this.client.post('/execute', { goal });
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Backend service unavailable');
    }
  }

  getErrorMessage(error) {
    if (error.response) {
      return `Server Error: ${error.response.status} - ${error.response.data.detail || 'Unknown error'}`;
    } else if (error.request) {
      return 'Cannot connect to backend service. Please make sure it is running.';
    } else {
      return 'Unexpected error occurred';
    }
  }
}

export default new ApiService();