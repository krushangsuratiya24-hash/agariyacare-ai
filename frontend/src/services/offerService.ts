import api from './api';
import { ApiResponse } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OfferStatus =
  | 'PENDING'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'CANCELLED';

export type TransactionStatus =
  | 'AGREED'
  | 'PROCESSING'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  worker_id: string;
  quantity_kg: number;
  price_per_kg: number;
  total_amount: number;
  message: string | null;
  status: OfferStatus;
  parent_offer_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined from salt_listings
  salt_type?: string;
  quality_grade?: string | null;
  listing_location?: string;
  listing_description?: string | null;
  village?: string | null;
  district?: string | null;
  listing_price_per_kg?: number;
  listing_quantity_kg?: number;
  // Joined from users
  buyer_name?: string;
  buyer_avatar?: string | null;
  seller_name?: string;
  seller_avatar?: string | null;
}

export interface OfferHistoryEntry {
  id: string;
  offer_id: string;
  actor_id: string;
  actor_role: 'buyer' | 'worker' | 'admin';
  event_type: 'OFFER' | 'COUNTER' | 'ACCEPT' | 'REJECT' | 'WITHDRAW' | 'EXPIRE';
  price_per_kg: number;
  quantity_kg: number;
  message: string | null;
  created_at: string;
  actor_name?: string;
}

export interface Transaction {
  id: string;
  transaction_ref: string;
  listing_id: string | null;
  offer_id: string | null;
  seller_id: string;
  buyer_id: string;
  quantity_kg: number;
  price_per_kg: number;
  agreed_price_per_kg: number;
  total_amount: number;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  salt_type?: string;
  quality_grade?: string | null;
  listing_location?: string;
  listing_description?: string | null;
  village?: string | null;
  district?: string | null;
  buyer_name?: string;
  buyer_avatar?: string | null;
  seller_name?: string;
  seller_avatar?: string | null;
  // Detail only
  statusHistory?: TransactionStatusHistory[];
  offerHistory?: OfferHistoryEntry[];
}

export interface TransactionStatusHistory {
  id: string;
  transaction_id: string;
  actor_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
  actor_name?: string;
}

export interface WorkerOfferStats {
  offers: {
    pending_offers: string;
    accepted_offers: string;
    rejected_offers: string;
  };
  transactions: {
    total_transactions: string;
    active_transactions: string;
    completed_value: string;
  };
}

export interface BuyerOfferStats {
  offers: {
    pending_offers: string;
    countered_offers: string;
    accepted_offers: string;
    rejected_offers: string;
    withdrawn_offers: string;
  };
  transactions: {
    total_transactions: string;
  };
}

// ── Offer API ─────────────────────────────────────────────────────────────────

export const offerService = {
  // GET /api/offers/my
  getMyOffers: async () => {
    const res = await api.get<ApiResponse<Offer[]>>('/offers/my');
    return res.data;
  },

  // GET /api/offers/:id
  getById: async (id: string) => {
    const res = await api.get<ApiResponse<{ offer: Offer; history: OfferHistoryEntry[] }>>(`/offers/${id}`);
    return res.data;
  },

  // GET /api/offers/listing/:listingId
  getForListing: async (listingId: string) => {
    const res = await api.get<ApiResponse<Offer[]>>(`/offers/listing/${listingId}`);
    return res.data;
  },

  // POST /api/offers
  makeOffer: async (data: {
    listing_id: string;
    quantity_kg: number;
    price_per_kg: number;
    message?: string;
  }) => {
    const res = await api.post<ApiResponse<Offer>>('/offers', data);
    return res.data;
  },

  // POST /api/offers/:id/counter
  counter: async (id: string, data: { quantity_kg: number; price_per_kg: number; message?: string }) => {
    const res = await api.post<ApiResponse<Offer>>(`/offers/${id}/counter`, data);
    return res.data;
  },

  // POST /api/offers/:id/accept
  accept: async (id: string, message?: string) => {
    const res = await api.post<ApiResponse<{ offer: Offer; transaction: Transaction }>>(
      `/offers/${id}/accept`,
      { message }
    );
    return res.data;
  },

  // POST /api/offers/:id/reject
  reject: async (id: string, message?: string) => {
    const res = await api.post<ApiResponse<Offer>>(`/offers/${id}/reject`, { message });
    return res.data;
  },

  // POST /api/offers/:id/withdraw
  withdraw: async (id: string, message?: string) => {
    const res = await api.post<ApiResponse<Offer>>(`/offers/${id}/withdraw`, { message });
    return res.data;
  },

  // Stats
  getWorkerStats: async () => {
    const res = await api.get<ApiResponse<WorkerOfferStats>>('/offers/stats/worker');
    return res.data;
  },

  getBuyerStats: async () => {
    const res = await api.get<ApiResponse<BuyerOfferStats>>('/offers/stats/buyer');
    return res.data;
  },
};

// ── Transaction API ───────────────────────────────────────────────────────────

export const transactionService = {
  // GET /api/offers/transactions/my
  getMyTransactions: async () => {
    const res = await api.get<ApiResponse<Transaction[]>>('/offers/transactions/my');
    return res.data;
  },

  // GET /api/offers/transactions/:id
  getById: async (id: string) => {
    const res = await api.get<ApiResponse<Transaction>>(`/offers/transactions/${id}`);
    return res.data;
  },

  // PATCH /api/offers/transactions/:id/status
  updateStatus: async (id: string, status: TransactionStatus, note?: string) => {
    const res = await api.patch<ApiResponse<Transaction>>(`/offers/transactions/${id}/status`, { status, note });
    return res.data;
  },
};
