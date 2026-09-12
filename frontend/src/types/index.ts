export type UserRole = 'AGARIYA_WORKER' | 'BUYER' | 'COORDINATOR' | 'ADMIN';
export type LanguagePref = 'en' | 'gu';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  language_pref: LanguagePref;
  is_active: boolean;
  onboarding_completed: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  village: string | null;
  district: string | null;
  state: string;
  years_experience: number | null;
  salt_pan_area_acres: number | null;
  salt_type: string | null;
  annual_production_kg: number | null;
  cooperative_member: boolean;
  cooperative_name: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuyerProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  business_type: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  preferred_salt_type: string | null;
  monthly_demand_kg: number | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errors?: Array<{ msg: string; path: string }>;
}
