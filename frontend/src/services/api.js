import axios from "axios";
const API = axios.create({ baseURL: process.env.REACT_APP_API_URL });

export const executeProject = (prompt) => API.post("/execute", { prompt });
export const getProject = (projectId) => API.get(`/projects/${projectId}`);
export const getTasks = (projectId) => API.get(`/tasks`, { params: { projectId } });
export const getAgentLogs = (projectId) => API.get(`/logs`, { params: { projectId } });
// optional
export const sendChat = (projectId, message) => API.post("/chat", { projectId, message });
