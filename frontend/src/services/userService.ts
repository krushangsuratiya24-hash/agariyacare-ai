import api from './api';
import { User, WorkerProfile, BuyerProfile, ApiResponse } from '../types';

export interface LoginResponse {
  user: User;
  token: string;
}

export interface ProfileResponse {
  user: User;
  profile: WorkerProfile | BuyerProfile | null;
}

export const authService = {
  signup: async (data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    phone?: string;
    language_pref?: string;
  }) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/signup', data);
    return res.data;
  },

  login: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
    return res.data;
  },

  logout: async () => {
    const res = await api.post<ApiResponse<null>>('/auth/logout');
    return res.data;
  },

  getMe: async () => {
    const res = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return res.data;
  },
};

export const userService = {
  getProfile: async () => {
    const res = await api.get<ApiResponse<ProfileResponse>>('/users/profile');
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

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post<ApiResponse<{ avatar_url: string }>>(
      '/users/profile/avatar',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  completeOnboarding: async () => {
    const res = await api.post<ApiResponse<{ onboarding_completed: boolean }>>('/users/onboarding/complete');
    return res.data;
  },

  getNotifications: async (limit = 20, offset = 0) => {
    const res = await api.get(`/users/notifications?limit=${limit}&offset=${offset}`);
    return res.data;
  },

  markNotificationRead: async (id: string) => {
    const res = await api.patch(`/users/notifications/${id}/read`);
    return res.data;
  },
};
