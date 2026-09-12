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

// ─── Marketplace API (Phase 4 enhanced) ──────────────────────────────────────

export const marketplaceApi = {
  getInventory: async () => {
    const res = await api.get<ApiResponse<any[]>>('/marketplace/inventory');
    return res.data;
  },
  getInventoryItem: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/marketplace/inventory/${id}`);
    return res.data;
  },
  createInventory: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/marketplace/inventory', data);
    return res.data;
  },
  updateInventory: async (id: string, data: any) => {
    const res = await api.patch<ApiResponse<any>>(`/marketplace/inventory/${id}`, data);
    return res.data;
  },
  getListings: async (filters?: any) => {
    const res = await api.get<ApiResponse<any[]>>('/marketplace/listings', { params: filters });
    return res.data;
  },
  getMyListings: async () => {
    const res = await api.get<ApiResponse<any[]>>('/marketplace/my-listings');
    return res.data;
  },
  getListingById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/marketplace/listings/${id}`);
    return res.data;
  },
  createListing: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/marketplace/listings', data);
    return res.data;
  },
  updateListing: async (id: string, data: any) => {
    const res = await api.patch<ApiResponse<any>>(`/marketplace/listings/${id}`, data);
    return res.data;
  },
  getBuyerRequests: async (filters?: any) => {
    const res = await api.get<ApiResponse<any[]>>('/marketplace/buyer-requests', { params: filters });
    return res.data;
  },
  getMyBuyerRequests: async () => {
    const res = await api.get<ApiResponse<any[]>>('/marketplace/buyer-requests/mine');
    return res.data;
  },
  createBuyerRequest: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/marketplace/buyer-requests', data);
    return res.data;
  },
  updateBuyerRequest: async (id: string, data: any) => {
    const res = await api.patch<ApiResponse<any>>(`/marketplace/buyer-requests/${id}`, data);
    return res.data;
  },
  getSavedListings: async () => {
    const res = await api.get<ApiResponse<any[]>>('/marketplace/saved');
    return res.data;
  },
  saveListing: async (id: string) => {
    const res = await api.post<ApiResponse<any>>(`/marketplace/saved/${id}`);
    return res.data;
  },
  unsaveListing: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/marketplace/saved/${id}`);
    return res.data;
  },
  getSaltTypes: async () => {
    const res = await api.get<ApiResponse<any[]>>('/marketplace/salt-types');
    return res.data;
  },
  getSaltGrades: async (saltTypeId?: string) => {
    const res = await api.get<ApiResponse<any[]>>('/marketplace/salt-grades', {
      params: saltTypeId ? { saltTypeId } : {},
    });
    return res.data;
  },
  getWorkerDashboardStats: async () => {
    const res = await api.get<ApiResponse<any>>('/marketplace/stats/worker');
    return res.data;
  },
  getBuyerDashboardStats: async () => {
    const res = await api.get<ApiResponse<any>>('/marketplace/stats/buyer');
    return res.data;
  },
};

// ─── Offers API (Phase 4) ─────────────────────────────────────────────────────

export const offersApi = {
  getMyOffers: async () => {
    const res = await api.get<ApiResponse<any[]>>('/offers/my');
    return res.data;
  },
  getOffer: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/offers/${id}`);
    return res.data;
  },
  getOffersForListing: async (listingId: string) => {
    const res = await api.get<ApiResponse<any[]>>(`/offers/listing/${listingId}`);
    return res.data;
  },
  makeOffer: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/offers', data);
    return res.data;
  },
  counterOffer: async (id: string, data: any) => {
    const res = await api.post<ApiResponse<any>>(`/offers/${id}/counter`, data);
    return res.data;
  },
  acceptOffer: async (id: string, message?: string) => {
    const res = await api.post<ApiResponse<any>>(`/offers/${id}/accept`, { message });
    return res.data;
  },
  rejectOffer: async (id: string, message?: string) => {
    const res = await api.post<ApiResponse<any>>(`/offers/${id}/reject`, { message });
    return res.data;
  },
  withdrawOffer: async (id: string) => {
    const res = await api.post<ApiResponse<any>>(`/offers/${id}/withdraw`);
    return res.data;
  },
  getMyTransactions: async () => {
    const res = await api.get<ApiResponse<any[]>>('/offers/transactions/my');
    return res.data;
  },
  getTransactionById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/offers/transactions/${id}`);
    return res.data;
  },
  getWorkerStats: async () => {
    const res = await api.get<ApiResponse<any>>('/offers/stats/worker');
    return res.data;
  },
  getBuyerStats: async () => {
    const res = await api.get<ApiResponse<any>>('/offers/stats/buyer');
    return res.data;
  },
};

// ─── Notifications API ────────────────────────────────────────────────────────

export const notificationsApi = {
  getByUser: async (userId: string) => {
    const res = await api.get<ApiResponse<any[]>>(`/notifications/${userId}`);
    return res.data;
  },
  getUnread: async (userId: string) => {
    const res = await api.get<ApiResponse<any[]>>(`/notifications/${userId}/unread`);
    return res.data;
  },
  markRead: async (id: string) => {
    const res = await api.put<ApiResponse<null>>(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async (userId: string) => {
    const res = await api.put<ApiResponse<null>>(`/notifications/user/${userId}/read-all`);
    return res.data;
  },
};

// ─── Healthcare API ───────────────────────────────────────────────────────────

export const healthcareApi = {
  getRequests: async (workerId?: string) => {
    const res = await api.get<ApiResponse<any[]>>('/healthcare/requests', {
      params: workerId ? { workerId } : {},
    });
    return res.data;
  },
  getCamps: async () => {
    const res = await api.get<ApiResponse<any[]>>('/healthcare/camps');
    return res.data;
  },
  createRequest: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/healthcare/requests', data);
    return res.data;
  },
};

// ─── Welfare API ──────────────────────────────────────────────────────────────

export const welfareApi = {
  getSchemes: async () => {
    const res = await api.get<ApiResponse<any[]>>('/welfare/schemes');
    return res.data;
  },
  matchSchemes: async (workerId: string) => {
    const res = await api.post<ApiResponse<any[]>>('/welfare/match', { workerId });
    return res.data;
  },
};

// ─── Safety API ───────────────────────────────────────────────────────────────

export const safetyApi = {
  getReadings: async (workerId?: string) => {
    const res = await api.get<ApiResponse<any[]>>('/safety/readings', {
      params: workerId ? { workerId } : {},
    });
    return res.data;
  },
  getIncidents: async (workerId?: string) => {
    const res = await api.get<ApiResponse<any[]>>('/safety/incidents', {
      params: workerId ? { workerId } : {},
    });
    return res.data;
  },
  getAlerts: async () => {
    const res = await api.get<ApiResponse<any[]>>('/safety/alerts');
    return res.data;
  },
  submitReading: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/safety/readings', data);
    return res.data;
  },
  reportIncident: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/safety/incidents', data);
    return res.data;
  },
};

// ─── Community API ────────────────────────────────────────────────────────────

export const communityApi = {
  getNotices: async () => {
    const res = await api.get<ApiResponse<any[]>>('/community/notices');
    return res.data;
  },
  getSupportRequests: async (workerId?: string) => {
    const res = await api.get<ApiResponse<any[]>>('/community/support', {
      params: workerId ? { workerId } : {},
    });
    return res.data;
  },
  submitSupportRequest: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/community/support', data);
    return res.data;
  },
};

// ─── Market Prices API ────────────────────────────────────────────────────────

export const marketApi = {
  getPrices: async (filters?: any) => {
    const res = await api.get<ApiResponse<any[]>>('/market/prices', { params: filters });
    return res.data;
  },
  getLatestPrices: async () => {
    const res = await api.get<ApiResponse<any[]>>('/market/prices/latest');
    return res.data;
  },
  getTrends: async (days?: number) => {
    const res = await api.get<ApiResponse<any[]>>('/market/trends', {
      params: days ? { days } : {},
    });
    return res.data;
  },
  compare: async (quantity: number, buyerOffer: number) => {
    const res = await api.post<ApiResponse<any>>('/market/compare', { quantity, buyerOffer });
    return res.data;
  },
};

// ─── Analytics API ────────────────────────────────────────────────────────────

export const analyticsApi = {
  getSummary: async () => {
    const res = await api.get<ApiResponse<any>>('/analytics/summary');
    return res.data;
  },
  getSafety: async () => {
    const res = await api.get<ApiResponse<any>>('/analytics/safety');
    return res.data;
  },
  getHealthcare: async () => {
    const res = await api.get<ApiResponse<any>>('/analytics/healthcare');
    return res.data;
  },
  getMarket: async () => {
    const res = await api.get<ApiResponse<any>>('/analytics/market');
    return res.data;
  },
};
