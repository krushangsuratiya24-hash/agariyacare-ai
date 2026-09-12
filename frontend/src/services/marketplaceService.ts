import api from './api';
import { ApiResponse } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SaltInventory {
  id: string;
  worker_id: string;
  quantity_kg: number;
  salt_type: string;
  quality_grade: string | null;
  harvest_date: string | null;
  storage_location: string | null;
  season: string | null;
  price_per_kg: number | null;
  moisture_pct: number | null;
  notes: string | null;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  created_at: string;
  updated_at: string;
}

export interface SaltListing {
  id: string;
  worker_id: string;
  inventory_id: string | null;
  quantity_kg: number;
  price_per_kg: number;
  salt_type: string;
  quality_grade: string | null;
  location: string;
  min_quantity_kg: number;
  available_date: string | null;
  description: string | null;
  village: string | null;
  district: string | null;
  season: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'SOLD';
  views_count: number;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  // Joined
  seller_name?: string;
  seller_avatar?: string | null;
  seller_village?: string | null;
  seller_district?: string | null;
  seller_experience?: number | null;
  is_saved?: boolean;
}

export interface BuyerRequest {
  id: string;
  buyer_id: string;
  title: string | null;
  quantity_kg: number;
  salt_type: string;
  max_price_per_kg: number | null;
  preferred_location: string | null;
  required_date: string | null;
  quality_notes: string | null;
  description: string | null;
  status: 'OPEN' | 'FULFILLED' | 'CLOSED';
  created_at: string;
  updated_at: string;
  // Joined
  buyer_name?: string;
  buyer_avatar?: string | null;
  // Matching
  match_score?: number;
  match_reasons?: string[];
}

export interface ListingsResponse {
  listings: SaltListing[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface BuyerRequestsResponse {
  requests: BuyerRequest[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface ListingFilters {
  search?: string;
  salt_type?: string;
  grade?: string;
  location?: string;
  min_price?: number | '';
  max_price?: number | '';
  min_qty?: number | '';
  sort?: string;
  page?: number;
  limit?: number;
}

export interface WorkerDashboardStats {
  inventory: {
    available_kg: string;
    reserved_kg: string;
    sold_kg: string;
    total_items: string;
  };
  listings: {
    active_listings: string;
    sold_listings: string;
    active_value: string;
    total_views: string;
  };
  recent_buyer_requests: BuyerRequest[];
}

export interface BuyerDashboardStats {
  saved_count: number;
  requests: {
    open_requests: string;
    fulfilled_requests: string;
  };
  recent_listings: SaltListing[];
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryService = {
  getAll: async () => {
    const res = await api.get<ApiResponse<SaltInventory[]>>('/marketplace/inventory');
    return res.data;
  },

  create: async (data: Partial<SaltInventory>) => {
    const res = await api.post<ApiResponse<SaltInventory>>('/marketplace/inventory', data);
    return res.data;
  },

  update: async (id: string, data: Partial<SaltInventory>) => {
    const res = await api.patch<ApiResponse<SaltInventory>>(`/marketplace/inventory/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete<ApiResponse<null>>(`/marketplace/inventory/${id}`);
    return res.data;
  },
};

// ─── Listings ─────────────────────────────────────────────────────────────────

export const listingService = {
  getMarketplace: async (filters: ListingFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) params.append(k, String(v));
    });
    const res = await api.get<ApiResponse<ListingsResponse>>(`/marketplace/listings?${params}`);
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<SaltListing & { is_saved: boolean }>>(`/marketplace/listings/${id}`);
    return res.data;
  },

  getMyListings: async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    const res = await api.get<ApiResponse<SaltListing[]>>(`/marketplace/my-listings${params}`);
    return res.data;
  },

  create: async (data: Partial<SaltListing>) => {
    const res = await api.post<ApiResponse<SaltListing>>('/marketplace/listings', data);
    return res.data;
  },

  update: async (id: string, data: Partial<SaltListing & { status: string }>) => {
    const res = await api.patch<ApiResponse<SaltListing>>(`/marketplace/listings/${id}`, data);
    return res.data;
  },

  getMatchesForListing: async (id: string) => {
    const res = await api.get<ApiResponse<BuyerRequest[]>>(`/marketplace/matches/listing/${id}`);
    return res.data;
  },
};

// ─── Buyer Requests ───────────────────────────────────────────────────────────

export const buyerRequestService = {
  getAll: async (page = 1, saltType = '') => {
    const params = new URLSearchParams({ page: String(page) });
    if (saltType) params.append('salt_type', saltType);
    const res = await api.get<ApiResponse<BuyerRequestsResponse>>(`/marketplace/buyer-requests?${params}`);
    return res.data;
  },

  getMine: async () => {
    const res = await api.get<ApiResponse<BuyerRequest[]>>('/marketplace/buyer-requests/mine');
    return res.data;
  },

  create: async (data: Partial<BuyerRequest>) => {
    const res = await api.post<ApiResponse<BuyerRequest>>('/marketplace/buyer-requests', data);
    return res.data;
  },

  update: async (id: string, data: Partial<BuyerRequest & { status: string }>) => {
    const res = await api.patch<ApiResponse<BuyerRequest>>(`/marketplace/buyer-requests/${id}`, data);
    return res.data;
  },

  getMatchesForRequest: async (id: string) => {
    const res = await api.get<ApiResponse<SaltListing[]>>(`/marketplace/matches/request/${id}`);
    return res.data;
  },
};

// ─── Saved Listings ───────────────────────────────────────────────────────────

export const savedListingService = {
  getAll: async () => {
    const res = await api.get<ApiResponse<SaltListing[]>>('/marketplace/saved');
    return res.data;
  },

  save: async (listingId: string) => {
    const res = await api.post<ApiResponse<null>>(`/marketplace/saved/${listingId}`);
    return res.data;
  },

  unsave: async (listingId: string) => {
    const res = await api.delete<ApiResponse<null>>(`/marketplace/saved/${listingId}`);
    return res.data;
  },
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const dashboardService = {
  getWorkerStats: async () => {
    const res = await api.get<ApiResponse<WorkerDashboardStats>>('/marketplace/stats/worker');
    return res.data;
  },

  getBuyerStats: async () => {
    const res = await api.get<ApiResponse<BuyerDashboardStats>>('/marketplace/stats/buyer');
    return res.data;
  },
};
