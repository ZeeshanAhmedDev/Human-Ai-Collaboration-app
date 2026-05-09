import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = Number(process.env.REACT_APP_API_TIMEOUT || 900000);

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

  async executeGoal(goal) {
    try {
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
}

export default new ApiService();
