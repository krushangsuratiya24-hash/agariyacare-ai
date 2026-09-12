/**
 * AgariyaCare AI — Frontend API Service
 *
 * Thin Axios wrapper around the backend REST API.
 * All requests go to /api (proxied to Express backend).
 */

import axios from 'axios';
import { ApiResponse, User, WorkerProfile, BuyerProfile } from '../types';

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach stored JWT token to every request
api.interceptors.request.use((config) => {
  // Zustand persists the token in localStorage under "agariyacare_auth"
  try {
    const raw = localStorage.getItem('agariyacare_auth');
    if (raw) {
      const stored = JSON.parse(raw);
      const token = stored?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // ignore JSON parse errors
  }
  return config;
});

// Response interceptor — handle session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  signup: async (data: {
    email: string;
    password: string;
    full_name?: string;
    name?: string;
    role?: string;
    phone?: string;
    language_pref?: string;
  }) => {
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/signup', data);
    return res.data;
  },

  login: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', {
      email,
      password,
    });
    return res.data;
  },

  me: async () => {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    return res.data;
  },

  logout: async () => {
    const res = await api.post<ApiResponse<null>>('/auth/logout');
    return res.data;
  },
};

// ─── User / Profile API ───────────────────────────────────────────────────────

export const userApi = {
  getProfile: async () => {
    const res = await api.get<ApiResponse<{ user: User; profile: WorkerProfile | BuyerProfile | null }>>(
      '/users/profile'
    );
    return res.data;
  },

  updateProfile: async (data: Partial<Pick<User, 'full_name' | 'phone' | 'language_pref'>>) => {
    const res = await api.patch<ApiResponse<{ user: User }>>('/users/profile', data);
    return res.data;
  },

  updateWorkerProfile: async (data: Partial<WorkerProfile>) => {
    const res = await api.patch<ApiResponse<{ profile: WorkerProfile }>>('/users/profile/worker', data);
    return res.data;
  },

  updateBuyerProfile: async (data: Partial<BuyerProfile>) => {
    const res = await api.patch<ApiResponse<{ profile: BuyerProfile }>>('/users/profile/buyer', data);
    return res.data;
  },
};

// ─── AI Assistant API ─────────────────────────────────────────────────────────

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResponse {
  message: string;
  agentsUsed?: string[];
  actions?: Array<{ label: string; link?: string; url?: string; type?: string }>;
  toolsUsed?: string[];
  timestamp: string;
  conversationId?: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  agentUsed?: string[];
  actions?: Array<{ label: string; link?: string; url?: string }>;
  timestamp: string;
  createdAt?: string;
}

export interface AIProviderStatus {
  providerName: string;
  isAvailable: boolean;
  mode: 'development' | 'production';
  isConfigured: boolean;
}

export const aiApi = {
  /**
   * Get AI provider status (IBM Granite or dev mode)
   */
  getStatus: async () => {
    const res = await api.get<ApiResponse<AIProviderStatus>>('/ai/status');
    return res.data;
  },

  /**
   * Send a chat message and get an AI response.
   * Conversation is automatically persisted if authenticated.
   */
  chat: async (
    message: string,
    conversationHistory: AIChatMessage[] = [],
    language: 'en' | 'gu' = 'en',
    conversationId?: string
  ) => {
    const res = await api.post<ApiResponse<AIChatResponse>>('/ai/chat', {
      message,
      conversationHistory,
      language,
      conversationId,
    });
    return res.data;
  },

  /**
   * List all conversations for the authenticated user.
   */
  getConversations: async () => {
    const res = await api.get<ApiResponse<AIConversation[]>>('/ai/conversations');
    return res.data;
  },

  /**
   * Create a new empty conversation.
   */
  createConversation: async (title?: string) => {
    const res = await api.post<ApiResponse<AIConversation>>('/ai/conversations', { title });
    return res.data;
  },

  /**
   * Get all messages in a specific conversation.
   * Enforces ownership — only the conversation owner can access it.
   */
  getConversationMessages: async (conversationId: string) => {
    const res = await api.get<ApiResponse<AIMessage[]>>(`/ai/conversations/${conversationId}/messages`);
    return res.data;
  },

  /**
   * Rename a conversation.
   */
  updateConversationTitle: async (conversationId: string, title: string) => {
    const res = await api.patch<ApiResponse<AIConversation>>(`/ai/conversations/${conversationId}`, { title });
    return res.data;
  },

  /**
   * Archive/delete a conversation.
   */
  deleteConversation: async (conversationId: string) => {
    const res = await api.delete<ApiResponse<{ archived: boolean }>>(`/ai/conversations/${conversationId}`);
    return res.data;
  },
};
